export interface AISettings {
  /** Whether to use custom Anthropic API instead of default backend */
  useCustomApi: boolean;
  /** Proxy/API base URL, e.g. "http://localhost:3017" */
  apiBaseUrl: string;
  /** Model to use, e.g. "claude-sonnet-4-6" */
  model: string;
}

const STORAGE_KEY = "excalidraw-ai-settings";

export const DEFAULT_AI_SETTINGS: AISettings = {
  useCustomApi: false,
  apiBaseUrl: "http://ai-proxy:3017",
  model: "glm-4.7",
};

export const AVAILABLE_MODELS = [
  "claude-sonnet-4-6",
  "claude-haiku-4-5-20251001",
  "claude-opus-4-6",
];

export function loadAISettings(): AISettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_AI_SETTINGS, ...parsed };
    }
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULT_AI_SETTINGS };
}

export function saveAISettings(settings: AISettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
