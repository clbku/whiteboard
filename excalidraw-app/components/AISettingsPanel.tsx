import { useState, useCallback, useEffect } from "react";

import { Modal } from "@excalidraw/excalidraw/components/Modal";

import {
  loadAISettings,
  saveAISettings,
  AVAILABLE_MODELS,
  DEFAULT_AI_SETTINGS,
} from "../data/aiSettings";
import type { AISettings } from "../data/aiSettings";

import "./AISettingsPanel.scss";

const AI_SETTINGS_LABEL_ID = "ai-settings-title";

export const AISettingsPanel = ({
  onClose,
}: {
  onClose: () => void;
}) => {
  const [settings, setSettings] = useState<AISettings>(loadAISettings);
  const [saved, setSaved] = useState(false);

  // Sync if localStorage changes from another tab
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "excalidraw-ai-settings") {
        setSettings(loadAISettings());
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

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

  const handleReset = () => {
    setSettings({ ...DEFAULT_AI_SETTINGS });
    setSaved(false);
  };

  return (
    <Modal
      className="ai-settings-modal"
      onCloseRequest={onClose}
      labelledBy={AI_SETTINGS_LABEL_ID}
      maxWidth={420}
    >
      <div className="ai-settings-panel">
        <div className="ai-settings-panel__header">
          <h3 id={AI_SETTINGS_LABEL_ID}>AI Settings</h3>
          <button
            className="ai-settings-panel__close"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="ai-settings-panel__body">
          <label className="ai-settings-panel__toggle">
            <input
              type="checkbox"
              checked={settings.useCustomApi}
              onChange={(e) => update("useCustomApi", e.target.checked)}
            />
            <span>Use custom Anthropic API</span>
          </label>

          {settings.useCustomApi && (
            <>
              <label className="ai-settings-panel__field">
                <span>Proxy URL</span>
                <input
                  type="url"
                  value={settings.apiBaseUrl}
                  onChange={(e) => update("apiBaseUrl", e.target.value)}
                  placeholder="http://localhost:3017"
                />
              </label>

              <label className="ai-settings-panel__field">
                <span>Model</span>
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
        </div>

        <div className="ai-settings-panel__footer">
          <button className="ai-settings-panel__btn--secondary" onClick={handleReset}>
            Reset to Defaults
          </button>
          <button className="ai-settings-panel__btn--primary" onClick={handleSave}>
            {saved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
};
