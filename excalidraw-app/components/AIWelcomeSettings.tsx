import { useState, useCallback } from "react";

import {
  loadAISettings,
  saveAISettings,
  AVAILABLE_MODELS,
  DEFAULT_AI_SETTINGS,
} from "../data/aiSettings";
import type { AISettings } from "../data/aiSettings";

import "./AIWelcomeSettings.scss";

export const AIWelcomeSettings = () => {
  const [settings, setSettings] = useState<AISettings>(loadAISettings);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(settings.useCustomApi);

  const update = useCallback(
    <K extends keyof AISettings>(key: K, value: AISettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      setSaved(false);
    },
    [],
  );

  const handleSave = () => {
    saveAISettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="ai-welcome-settings">
      <button
        className="ai-welcome-settings__toggle-btn"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span>AI Settings</span>
        <span className="ai-welcome-settings__arrow">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div className="ai-welcome-settings__form">
          <label className="ai-welcome-settings__field">
            <input
              type="checkbox"
              checked={settings.useCustomApi}
              onChange={(e) => update("useCustomApi", e.target.checked)}
            />
            <span>Use custom Anthropic API</span>
          </label>

          {settings.useCustomApi && (
            <>
              <label className="ai-welcome-settings__field ai-welcome-settings__field--column">
                <span className="ai-welcome-settings__label">Proxy URL</span>
                <input
                  type="url"
                  value={settings.apiBaseUrl}
                  onChange={(e) => update("apiBaseUrl", e.target.value)}
                  placeholder="http://localhost:3017"
                />
              </label>

              <label className="ai-welcome-settings__field ai-welcome-settings__field--column">
                <span className="ai-welcome-settings__label">Model</span>
                <select
                  value={settings.model}
                  onChange={(e) => update("model", e.target.value)}
                >
                  {AVAILABLE_MODELS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          <div className="ai-welcome-settings__actions">
            <button className="ai-welcome-settings__save-btn" onClick={handleSave}>
              {saved ? "Saved!" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
