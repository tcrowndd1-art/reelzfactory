"use client";

interface Props { mode: "longform" | "shorts"; withHook: boolean; withBenchmark: boolean; }

export default function CostEstimator({ mode, withHook, withBenchmark }: Props) {
  const L = mode === "longform";
  const items = [
    ["Script (AI)", L ? 0.65 : 0.15],
    ["TTS Voice", L ? 0.30 : 0.08],
    [`Images (${L ? "~50" : "~10"})`, L ? 1.50 : 0.30],
    ...(withHook ? [["Hook Video (30s)", 2.10]] : []),
    ...(withBenchmark ? [["Benchmark", 0.01]] : []),
    ["Thumbnail", 0.03],
  ] as [string, number][];
  const total = items.reduce((a, [, c]) => a + c, 0);

  return (
    <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 12 }}>Estimated Cost</h3>
      {items.map(([label, cost]) => (
        <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
          <span style={{ color: "#94a3b8" }}>{label}</span>
          <span style={{ color: "#fff", fontFamily: "monospace" }}>${cost.toFixed(2)}</span>
        </div>
      ))}
      <div style={{ borderTop: "1px solid #1e293b", marginTop: 12, paddingTop: 12, display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Total</span>
        <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: "#10b981" }}>${total.toFixed(2)}</span>
      </div>
      <p style={{ fontSize: 10, color: "#64748b", marginTop: 8 }}>{"\u{2248}"} {Math.round(total * 1300).toLocaleString()} KRW</p>
    </div>
  );
}