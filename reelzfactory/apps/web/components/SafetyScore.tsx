"use client";

interface Props { hasHumanVoice: boolean; hasOriginalScript: boolean; hasUniqueImages: boolean; hasPersonalPerspective: boolean; }

export default function SafetyScore({ hasHumanVoice, hasOriginalScript, hasUniqueImages, hasPersonalPerspective }: Props) {
  const checks = [
    { l: "Human voice included", ok: hasHumanVoice },
    { l: "Original script (not copied)", ok: hasOriginalScript },
    { l: "Unique AI-generated images", ok: hasUniqueImages },
    { l: "Personal perspective/opinion", ok: hasPersonalPerspective },
  ];
  const pct = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  const color = pct >= 75 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Monetization Safety</h3>
        <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace", color }}>{pct}%</span>
      </div>
      {checks.map((c) => (
        <div key={c.l} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 6 }}>
          <span>{c.ok ? "\u{2705}" : "\u{26A0}\u{FE0F}"}</span>
          <span style={{ color: c.ok ? "#94a3b8" : "#f59e0b" }}>{c.l}</span>
        </div>
      ))}
      {pct < 75 && (
        <p style={{ fontSize: 10, color: "#f59e0b", marginTop: 12, lineHeight: 1.5 }}>
          YouTube may flag low-effort AI content. Add personal commentary or voice to improve safety.
        </p>
      )}
    </div>
  );
}