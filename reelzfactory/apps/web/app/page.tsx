"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSettings, getProjects, type Project } from "@/lib/store";

export default function Home() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState({ videos: 0, spent: 0 });

  useEffect(() => {
    const s = getSettings();
    if (!s.onboardingCompleted) { router.push("/onboarding"); return; }
    setProjects(getProjects().slice(0, 5));
    setStats({ videos: s.totalVideosCreated, spent: s.totalSpent });
  }, [router]);

  const actions = [
    { icon: "\u{1F3AC}", title: "New Video", desc: "Enter topic and generate", href: "/create", accent: true },
    { icon: "\u{1F50D}", title: "Benchmark", desc: "Analyze YouTube video", href: "/create?mode=benchmark", accent: false },
    { icon: "\u{1F4DD}", title: "My Script", desc: "Paste your own script", href: "/create?mode=reference", accent: false },
    { icon: "\u{2699}\u{FE0F}", title: "Settings", desc: "API keys & profile", href: "/settings", accent: false },
  ];

  return (
    <div style={{ padding: "40px 48px", maxWidth: 1100, margin: "0 auto" }} className="animate-fadeIn">
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#fff", marginBottom: 6, letterSpacing: "-0.03em" }}>
          Welcome back
        </h1>
        <p style={{ color: "#64748b", fontSize: 15 }}>
          AI Auto-Edit Studio — Topic to YouTube in one click.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 48 }}>
        {[
          { label: "Videos Created", value: stats.videos.toString(), color: "#fff" },
          { label: "Total Spent", value: `$${stats.spent.toFixed(2)}`, color: "#10b981" },
          { label: "Avg Cost / Video", value: `$${stats.videos > 0 ? (stats.spent / stats.videos).toFixed(2) : "0.00"}`, color: "#f59e0b" },
        ].map((s) => (
          <div key={s.label} style={{
            background: "linear-gradient(145deg, #111827, #0f1520)",
            border: "1px solid #1e293b", borderRadius: 16, padding: "24px 20px",
          }}>
            <p style={{ fontSize: 11, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</p>
            <p style={{ fontSize: 28, fontWeight: 700, fontFamily: "monospace", color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <h2 style={{ fontSize: 16, fontWeight: 600, color: "#94a3b8", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 12 }}>Quick Start</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 48 }}>
        {actions.map((a) => (
          <div key={a.href} onClick={() => router.push(a.href)} style={{
            borderRadius: 16, padding: "24px 20px", cursor: "pointer",
            transition: "all 0.2s ease",
            border: a.accent ? "1px solid rgba(37,99,235,0.5)" : "1px solid #1e293b",
            background: a.accent
              ? "linear-gradient(145deg, #1e3a5f, #172554)"
              : "linear-gradient(145deg, #111827, #0f1520)",
            color: "#fff",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = a.accent ? "#3b82f6" : "#334155"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = a.accent ? "rgba(37,99,235,0.5)" : "#1e293b"; }}
          >
            <span style={{ fontSize: 28, display: "block", marginBottom: 14 }}>{a.icon}</span>
            <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{a.title}</h3>
            <p style={{ fontSize: 12, color: "#64748b" }}>{a.desc}</p>
          </div>
        ))}
      </div>

      {/* Recent Projects */}
      <h2 style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>Recent Projects</h2>
      {projects.length === 0 ? (
        <div style={{
          background: "linear-gradient(145deg, #111827, #0f1520)",
          border: "1px dashed #1e293b", borderRadius: 16, padding: "56px 32px", textAlign: "center",
        }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>{"\u{1F3AC}"}</p>
          <p style={{ color: "#64748b", fontSize: 15, marginBottom: 16 }}>No projects yet</p>
          <button onClick={() => router.push("/create")} style={{
            background: "#2563eb", color: "#fff", border: "none", padding: "10px 24px",
            borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>Create your first video</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {projects.map((p) => (
            <div key={p.id} style={{
              background: "#111827", border: "1px solid #1e293b", borderRadius: 12,
              padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
              cursor: "pointer", transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#334155"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1e293b"; }}
            >
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 500, color: "#fff" }}>{p.title || p.topic}</h3>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                  {p.mode === "longform" ? "Long-form" : "Shorts"} · {p.status}
                </p>
              </div>
              <span style={{
                fontSize: 11, fontFamily: "monospace", padding: "4px 12px", borderRadius: 99,
                background: p.status === "completed" ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                color: p.status === "completed" ? "#10b981" : "#f59e0b",
              }}>{p.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}