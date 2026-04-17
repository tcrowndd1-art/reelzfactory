"use client";

import { useEffect, useState } from "react";
import { getSettings, saveSettings, saveAPIKeys, type APIKeys, type ChannelProfile } from "@/lib/store";

const inp: React.CSSProperties = {
  width: "100%", background: "#0a0a0a", border: "1px solid #1e293b",
  borderRadius: 8, padding: "10px 12px", fontSize: 14, color: "#fff", outline: "none",
};

export default function SettingsPage() {
  const [keys, setKeys] = useState<APIKeys>({});
  const [ch, setCh] = useState<ChannelProfile>({ name: "", niche: "", language: "ko", tone: "professional", colorPalette: [], introStyle: "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => { const s = getSettings(); setKeys(s.apiKeys); setCh(s.channel); }, []);

  const save = () => {
    saveAPIKeys(keys);
    saveSettings({ channel: ch });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const fields: { k: keyof APIKeys; l: string; p: string; req?: boolean }[] = [
    { k: "openrouter", l: "OpenRouter (Script AI)", p: "sk-or-v1-...", req: true },
    { k: "falai", l: "fal.ai (Image & Video)", p: "fal-..." },
    { k: "gemini", l: "Google Gemini (TTS Voice)", p: "AIza..." },
    { k: "openai", l: "OpenAI (TTS Fallback)", p: "sk-..." },
    { k: "fishaudio", l: "Fish Audio (Voice Clone)", p: "fa-..." },
    { k: "elevenlabs", l: "ElevenLabs (Premium Voice)", p: "el-..." },
    { k: "youtube", l: "YouTube Data API", p: "AIza..." },
  ];

  return (
    <div style={{ padding: 32, maxWidth: 800, margin: "0 auto" }} className="animate-fadeIn">
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Settings</h1>
      <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 32 }}>API keys are stored locally in your browser.</p>

      <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 16 }}>API Keys</h2>
        {fields.map((f) => (
          <div key={f.k} style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>
              {f.l} {f.req && <span style={{ color: "#ef4444" }}>*</span>}
            </label>
            <input type="password" value={keys[f.k] || ""} onChange={(e) => setKeys({ ...keys, [f.k]: e.target.value })} placeholder={f.p} style={inp} />
          </div>
        ))}
      </div>

      <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 16 }}>Channel Profile</h2>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>Channel Name</label>
          <input type="text" value={ch.name} onChange={(e) => setCh({ ...ch, name: e.target.value })} style={inp} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>Niche</label>
            <select value={ch.niche} onChange={(e) => setCh({ ...ch, niche: e.target.value })} style={{ ...inp, cursor: "pointer" }}>
              <option value="">Select</option>
              <option value="health">Health</option>
              <option value="finance">Finance</option>
              <option value="tech">Tech</option>
              <option value="selfdev">Self Dev</option>
              <option value="food">Food</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>Language</label>
            <select value={ch.language} onChange={(e) => setCh({ ...ch, language: e.target.value })} style={{ ...inp, cursor: "pointer" }}>
              <option value="ko">Korean</option>
              <option value="en">English</option>
              <option value="ja">Japanese</option>
              <option value="es">Spanish</option>
            </select>
          </div>
        </div>
      </div>

      <button onClick={save} style={{
        width: "100%", padding: "12px 0", borderRadius: 8, fontWeight: 600, fontSize: 14,
        border: "none", cursor: "pointer", color: "#fff",
        background: saved ? "#10b981" : "#2563eb",
      }}>{saved ? "Saved!" : "Save Settings"}</button>
    </div>
  );
}