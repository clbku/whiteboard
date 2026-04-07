import { RequestError } from "@excalidraw/excalidraw/errors";

import type {
  LLMMessage,
  TTTDDialog,
} from "@excalidraw/excalidraw/components/TTDDialog/types";

import type { AISettings } from "../data/aiSettings";

const SYSTEM_PROMPT = `You are an expert diagram generator. Given a user's description, generate a valid Mermaid.js diagram syntax.

Rules:
- Output ONLY valid Mermaid.js syntax, no explanations or markdown fences
- Use the most appropriate diagram type (flowchart, sequence, class, state, er, gantt, pie, etc.)
- Keep diagrams clear and readable
- Use descriptive labels
- If the user asks to fix/modify a diagram, output the complete corrected diagram`;

interface AnthropicStreamOptions {
  settings: AISettings;
  messages: readonly LLMMessage[];
  onChunk?: (chunk: string) => void;
  onStreamCreated?: () => void;
  signal?: AbortSignal;
}

/**
 * Parse Anthropic SSE stream format.
 * Anthropic uses `event:` + `data:` pairs separated by blank lines.
 * We track `currentEvent` across lines within the same chunk,
 * and reset it on blank lines (SSE event boundary).
 */
async function* parseAnthropicSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<string, void, unknown> {
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed) {
          // Blank line = SSE event boundary, reset event type
          currentEvent = "";
          continue;
        }

        if (trimmed.startsWith("event: ")) {
          currentEvent = trimmed.slice(7);
        } else if (trimmed.startsWith("data: ")) {
          const data = trimmed.slice(6);

          if (currentEvent === "content_block_delta") {
            try {
              const parsed = JSON.parse(data);
              if (parsed.delta?.text) {
                yield parsed.delta.text;
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function anthropicStreamFetch(
  options: AnthropicStreamOptions,
): Promise<TTTDDialog.OnTextSubmitRetValue> {
  const { settings, messages, onChunk, onStreamCreated, signal } = options;

  const anthropicMessages = messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const url = `${settings.apiBaseUrl.replace(/\/$/, "")}/v1/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        model: settings.model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: anthropicMessages,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const text = await response.text();
      let errorMessage = text;

      try {
        const parsed = JSON.parse(text);
        errorMessage = parsed.error?.message || text;
      } catch {
        // use raw text
      }

      return {
        error: new RequestError({
          message: errorMessage,
          status: response.status,
        }),
      };
    }

    const reader = response.body?.getReader();
    if (!reader) {
      return {
        error: new RequestError({
          message: "Couldn't get reader from response body",
          status: 500,
        }),
      };
    }

    onStreamCreated?.();

    let fullResponse = "";

    try {
      for await (const text of parseAnthropicSSEStream(reader)) {
        fullResponse += text;
        onChunk?.(text);
      }
    } catch (streamError: any) {
      if (streamError.name === "AbortError") {
        return {
          error: new RequestError({ message: "Request aborted", status: 499 }),
        };
      }
      return {
        error: new RequestError({
          message: streamError.message || "Streaming error",
          status: 500,
        }),
      };
    }

    if (!fullResponse) {
      return {
        error: new RequestError({
          message: "Generation failed (empty response)",
          status: 500,
        }),
      };
    }

    return {
      generatedResponse: fullResponse,
      error: null,
    };
  } catch (err: any) {
    if (err.name === "AbortError") {
      return {
        error: new RequestError({ message: "Request aborted", status: 499 }),
      };
    }
    return {
      error: new RequestError({
        message: err.message || "Request failed",
        status: 500,
      }),
    };
  }
}
