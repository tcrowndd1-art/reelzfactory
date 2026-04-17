// ============================================================
// C:\Dev\reelzfactory\apps\web\app\settings\page.tsx
// 설정 — API Keys Only (채널 설정은 채널 페이지에서 관리)
// ============================================================

"use client";

import { useEffect, useState } from "react";
import { getSettings, saveAPIKeys, type APIKeys } from "@/lib/store";

const inp: React.CSSProperties = {
  width: "100%", background: "#0a0a0a", border: "1px solid #1e293b",
  borderRadius: 8, padding: "10px 12px", fontSize: 14, color: "#fff", outline: "none",
};

/* ── API 발급 링크 ── */
const API_LINKS: Record<string, string> = {
  openrouter: "https://openrouter.ai/keys",
  falai: "https://fal.ai/dashboard/keys",
  gemini: "https://aistudio.google.com/apikey",
  openai: "https://platform.openai.com/api-keys",
  fishaudio: "https://fish.audio/app/api-keys/",
  fishModelId: "https://fish.audio/",
  youtube: "https://console.cloud.google.com/apis/credentials",
};

export default function SettingsPage() {
  const [keys, setKeys] = useState<APIKeys>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const s = getSettings();
    setKeys(s.apiKeys);
  }, []);

  const save = () => {
    saveAPIKeys(keys);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const fields: { k: keyof APIKeys; l: string; p: string; req?: boolean; desc: string }[] = [
    { k: "openrouter", l: "OpenRouter", p: "sk-or-v1-...", req: true, desc: "Script AI generation" },
    { k: "falai", l: "fal.ai", p: "fal-...", desc: "Image & Video generation" },
    { k: "gemini", l: "Google Gemini", p: "AIza...", desc: "TTS Voice (primary)" },
    { k: "openai", l: "OpenAI", p: "sk-...", desc: "TTS Voice (speed control)" },
    { k: "fishaudio", l: "Fish Audio", p: "fa-...", desc: "Voice Clone" },
    { k: "fishModelId", l: "Fish Model ID", p: "모델 ID (fish.audio에서 복사)", desc: "Voice Clone 모델" },
    { k: "youtube", l: "YouTube Data API", p: "AIza...", desc: "Upload & analytics" },
  ];

  const filledCount = fields.filter(f => keys[f.k]?.trim()).length;

  return (
    <div style={{ padding: 32, maxWidth: 600, margin: "0 auto" }} className="animate-fadeIn">
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Settings</h1>
      <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 32 }}>
        API keys are stored locally in your browser.
      </p>

      <div style={{
        background: "#111827", border: "1px solid #1e293b",
        borderRadius: 12, padding: 24,
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#fff", margin: 0 }}>API Keys</h2>
          <div style={{
            fontSize: 12, padding: "4px 12px", borderRadius: 20,
            background: filledCount === fields.length ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
            color: filledCount === fields.length ? "#10b981" : "#f59e0b",
            fontWeight: 600,
          }}>
            {filledCount}/{fields.length}
          </div>
        </div>

        {/* Key Fields */}
        {fields.map((f) => {
          const filled = !!(keys[f.k]?.trim());
          return (
            <div key={f.k} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div>
                  <label style={{ fontSize: 13, color: filled ? "#e2e8f0" : "#94a3b8", fontWeight: 500 }}>
                    {f.l}
                    {f.req && <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>}
                    {filled && <span style={{ color: "#10b981", marginLeft: 6, fontSize: 11 }}>✓</span>}
                  </label>
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 1 }}>{f.desc}</div>
                </div>
                <a
                  href={API_LINKS[f.k]}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 11, color: "#3b82f6", textDecoration: "none",
                    padding: "4px 10px", borderRadius: 6,
                    border: "1px solid #3b82f620",
                    background: "rgba(59,130,246,0.05)",
                    flexShrink: 0,
                  }}
                >
                  Get Key ↗
                </a>
              </div>
              <input
                type="password"
                value={keys[f.k] || ""}
                onChange={(e) => setKeys({ ...keys, [f.k]: e.target.value })}
                placeholder={f.p}
                style={{
                  ...inp,
                  borderColor: filled ? "#10b98125" : "#1e293b",
                }}
              />
            </div>
          );
        })}

        {/* Save */}
        <button onClick={save} style={{
          width: "100%", padding: "14px 0", borderRadius: 10, fontWeight: 600, fontSize: 14,
          border: "none", cursor: "pointer", color: "#fff", marginTop: 8,
          background: saved ? "#10b981" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
          transition: "all 0.3s",
        }}>
          {saved ? "✓ Saved" : "Save API Keys"}
        </button>
      </div>
    </div>
  );
}