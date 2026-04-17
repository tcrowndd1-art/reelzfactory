"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveSettings, saveAPIKeys } from "@/lib/store";

const inp: React.CSSProperties = {
  width: "100%", background: "#0d1117", border: "1px solid #1e293b",
  borderRadius: 10, padding: "12px 14px", fontSize: 14, color: "#fff", outline: "none",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [orKey, setOrKey] = useState("");
  const [falKey, setFalKey] = useState("");
  const [name, setName] = useState("");
  const [niche, setNiche] = useState("");
  const [lang, setLang] = useState("ko");

  const niches = [
    { v: "health", l: "Health", e: "\u{1F3E5}" },
    { v: "finance", l: "Finance", e: "\u{1F4B0}" },
    { v: "tech", l: "Tech / AI", e: "\u{1F4BB}" },
    { v: "selfdev", l: "Self Dev", e: "\u{1F4DA}" },
    { v: "food", l: "Food", e: "\u{1F373}" },
    { v: "other", l: "Other", e: "\u{2728}" },
  ];

  const done = () => {
    saveAPIKeys({ openrouter: orKey, falai: falKey });
    saveSettings({
      channel: { name, niche, language: lang, tone: "professional" },
      onboardingCompleted: true,
    });
    router.push("/");
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0a0a0a 0%, #0f172a 50%, #0a0a0a 100%)",
      padding: 32,
    }}>
      <div style={{ width: "100%", maxWidth: 480 }} className="animate-fadeIn">
        {/* Progress */}
        <div style={{ display: "flex", gap: 8, marginBottom: 40 }}>
          {[1, 2, 3].map((s) => (
            <div key={s} style={{
              height: 3, flex: 1, borderRadius: 2,
              background: s <= step ? "#2563eb" : "#1e293b",
              transition: "background 0.3s",
            }} />
          ))}
        </div>

        {step === 1 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, fontWeight: 700, color: "#fff",
              }}>R</div>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>ReelzFactory</h1>
                <p style={{ fontSize: 11, color: "#475569" }}>AI Auto-Edit Studio</p>
              </div>
            </div>

            <p style={{ color: "#94a3b8", marginBottom: 32, lineHeight: 1.7, fontSize: 14 }}>
              Create YouTube videos from just a topic. Script, images, voice, and video — all automated. Set up in 2 minutes.
            </p>

            <div style={{
              background: "rgba(17,24,39,0.8)", border: "1px solid #1e293b",
              borderRadius: 14, padding: 24, marginBottom: 28,
              backdropFilter: "blur(10px)",
            }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>How it works</h3>
              {["Enter a topic or paste your script", "AI generates script, images, voice, and video", "Review each step or use Auto-Pilot", "Upload directly to YouTube"].map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: i < 3 ? 14 : 0 }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: 8,
                    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                    color: "#fff", fontSize: 12, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>{i + 1}</span>
                  <span style={{ fontSize: 13, color: "#cbd5e1" }}>{t}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setStep(2)} style={{
                flex: 1, background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#fff", padding: "14px 0",
                borderRadius: 10, fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer",
                boxShadow: "0 4px 20px rgba(37,99,235,0.3)",
              }}>Get Started</button>
              <button onClick={() => { saveSettings({ onboardingCompleted: true }); router.push("/"); }} style={{
                padding: "14px 20px", background: "transparent", border: "1px solid #1e293b",
                borderRadius: 10, color: "#64748b", fontSize: 13, cursor: "pointer",
              }}>Skip</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 6 }}>API Keys</h1>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 28 }}>Stored locally in your browser. Never sent to any server.</p>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 8, fontWeight: 500 }}>
                OpenRouter API Key <span style={{ color: "#ef4444" }}>*required</span>
              </label>
              <input type="password" value={orKey} onChange={(e) => setOrKey(e.target.value)} placeholder="sk-or-v1-..." style={inp} />
              <a href="https://openrouter.ai/keys" target="_blank" style={{ fontSize: 11, color: "#2563eb", marginTop: 6, display: "inline-block" }}>
                Get your key at openrouter.ai/keys
              </a>
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 8, fontWeight: 500 }}>
                fal.ai API Key <span style={{ color: "#475569" }}>(for images, optional)</span>
              </label>
              <input type="password" value={falKey} onChange={(e) => setFalKey(e.target.value)} placeholder="fal-..." style={inp} />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setStep(1)} style={{
                padding: "14px 20px", background: "transparent", border: "1px solid #1e293b",
                borderRadius: 10, color: "#64748b", fontSize: 13, cursor: "pointer",
              }}>Back</button>
              <button onClick={() => setStep(3)} disabled={!orKey} style={{
                flex: 1, padding: "14px 0", borderRadius: 10, fontWeight: 600, fontSize: 14,
                border: "none", color: "#fff",
                background: orKey ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "#1e293b",
                cursor: orKey ? "pointer" : "not-allowed", opacity: orKey ? 1 : 0.4,
                boxShadow: orKey ? "0 4px 20px rgba(37,99,235,0.3)" : "none",
              }}>Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Channel Profile</h1>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 28 }}>Helps AI match your channel style and niche.</p>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 8, fontWeight: 500 }}>Channel Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Health Master" style={inp} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 10, fontWeight: 500 }}>Niche</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {niches.map((n) => (
                  <button key={n.v} onClick={() => setNiche(n.v)} style={{
                    padding: "14px 12px", borderRadius: 10, textAlign: "left", fontSize: 12,
                    border: niche === n.v ? "1px solid #2563eb" : "1px solid #1e293b",
                    background: niche === n.v ? "rgba(37,99,235,0.12)" : "#0d1117",
                    color: niche === n.v ? "#60a5fa" : "#64748b", cursor: "pointer",
                    transition: "all 0.15s",
                  }}>
                    <span style={{ fontSize: 20, display: "block", marginBottom: 6 }}>{n.e}</span>
                    {n.l}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 8, fontWeight: 500 }}>Language</label>
              <select value={lang} onChange={(e) => setLang(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                <option value="ko">Korean</option>
                <option value="en">English</option>
                <option value="ja">Japanese</option>
                <option value="es">Spanish</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setStep(2)} style={{
                padding: "14px 20px", background: "transparent", border: "1px solid #1e293b",
                borderRadius: 10, color: "#64748b", fontSize: 13, cursor: "pointer",
              }}>Back</button>
              <button onClick={done} style={{
                flex: 1, padding: "14px 0", borderRadius: 10, fontWeight: 600, fontSize: 14,
                border: "none", color: "#fff", cursor: "pointer",
                background: "linear-gradient(135deg, #10b981, #059669)",
                boxShadow: "0 4px 20px rgba(16,185,129,0.3)",
              }}>Complete Setup</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}