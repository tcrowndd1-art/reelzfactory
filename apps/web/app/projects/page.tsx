"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProjects, type Project } from "@/lib/store";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => { getProjects().then(p => setProjects(p)); }, []);

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: "0 auto" }} className="animate-fadeIn">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>Projects</h1>
          <p style={{ fontSize: 14, color: "#94a3b8", marginTop: 4 }}>Manage your video projects</p>
        </div>
        <button onClick={() => router.push("/create")} style={{
          background: "#2563eb", color: "#fff", padding: "8px 16px",
          borderRadius: 8, fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer",
        }}>+ New Video</button>
      </div>

      {projects.length === 0 ? (
        <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 12, padding: 64, textAlign: "center" }}>
          <p style={{ fontSize: 36, marginBottom: 16 }}>📁</p>
          <p style={{ color: "#64748b", marginBottom: 16 }}>No projects yet</p>
          <span onClick={() => router.push("/create")} style={{ color: "#2563eb", fontSize: 14, cursor: "pointer" }}>
            Create your first video
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => router.push(`/create/${p.id}`)}
              style={{
                background: "#111827", border: "1px solid #1e293b", borderRadius: 12,
                padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center",
                cursor: "pointer", transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2563eb"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1e293b"; }}
            >
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 500, color: "#fff" }}>{p.title || p.topic}</h3>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  {p.mode === "longform" ? "Long-form" : "Shorts"} · {p.source} · {new Date(p.created_at).toLocaleDateString()}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ fontSize: 12, fontFamily: "monospace", color: "#94a3b8" }}>${(p.estimated_cost || 0).toFixed(2)}</span>
                <span style={{
                  fontSize: 12, fontFamily: "monospace", padding: "4px 10px", borderRadius: 99,
                  background: p.status === "completed" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                  color: p.status === "completed" ? "#10b981" : "#f59e0b",
                }}>{p.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
