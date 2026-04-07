/**
 * CORS proxy for Anthropic API with server-side API key management.
 *
 * The API key is stored server-side (env var or config file),
 * never exposed to the browser.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/ai-proxy.mjs
 *
 * Or create a .env file next to this script:
 *   ANTHROPIC_API_KEY=sk-ant-...
 *
 * Env vars:
 *   ANTHROPIC_API_KEY  - Required. Your Anthropic API key.
 *   AI_PROXY_PORT      - Port to listen on (default: 3017)
 */

import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env file if present
const envPath = join(__dirname, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (key && !process.env[key]) {
      process.env[key] = rest.join("=").trim();
    }
  }
}

const API_KEY = process.env.ANTHROPIC_API_KEY || "";
const PORT = parseInt(process.env.AI_PROXY_PORT || "3017", 10);

if (!API_KEY) {
  console.error(
    "[ai-proxy] ERROR: ANTHROPIC_API_KEY is not set.\n" +
      "  Set it via env var: ANTHROPIC_API_KEY=sk-ant-... node scripts/ai-proxy.mjs\n" +
      "  Or create scripts/.env with: ANTHROPIC_API_KEY=sk-ant-...",
  );
  process.exit(1);
}

const TARGET = "https://api.anthropic.com";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, anthropic-version, Accept",
  "Access-Control-Expose-Headers": "*",
};

const server = http.createServer(async (req, res) => {
  // Health check
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json", ...CORS_HEADERS });
    res.end(
      JSON.stringify({ status: "ok", keyConfigured: !!API_KEY }),
    );
    return;
  }

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  // Only proxy /v1/*
  if (!req.url?.startsWith("/v1/")) {
    res.writeHead(404, { "Content-Type": "application/json", ...CORS_HEADERS });
    res.end(JSON.stringify({ error: "Not found. Proxy only supports /v1/*" }));
    return;
  }

  const targetUrl = `${TARGET}${req.url}`;

  // Collect request body
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks);

  // Build forwarded headers — inject API key from server
  const forwardHeaders = {
    "Content-Type": req.headers["content-type"] || "application/json",
    "x-api-key": API_KEY,
    "anthropic-version":
      req.headers["anthropic-version"] || "2023-06-01",
    Accept: req.headers["accept"] || "text/event-stream",
  };

  console.log(
    `[proxy] ${req.method} ${req.url} -> ${targetUrl}`,
  );

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : body,
      // @ts-expect-error — Node 18+ supports duplex for streaming
      duplex: "half",
    });

    const contentType = upstream.headers.get("content-type") || "";

    if (contentType.includes("text/event-stream")) {
      res.writeHead(upstream.status, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        ...CORS_HEADERS,
      });

      const reader = upstream.body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
        } catch {
          // client disconnected
        } finally {
          res.end();
        }
      };
      pump();
    } else {
      const responseBody = await upstream.text();
      const responseHeaders = {
        "Content-Type":
          upstream.headers.get("content-type") || "application/json",
        ...CORS_HEADERS,
      };
      res.writeHead(upstream.status, responseHeaders);
      res.end(responseBody);
    }
  } catch (err) {
    console.error("[proxy] Upstream error:", err.message);
    res.writeHead(502, {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    });
    res.end(JSON.stringify({ error: `Proxy error: ${err.message}` }));
  }
});

server.listen(PORT, () => {
  console.log(
    `[ai-proxy] CORS proxy running on http://localhost:${PORT}`,
  );
  console.log(
    `[ai-proxy] API key: ${API_KEY.slice(0, 8)}...${API_KEY.slice(-4)}`,
  );
});
