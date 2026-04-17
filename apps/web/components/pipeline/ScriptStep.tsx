// ============================================================
// C:\Dev\reelzfactory\apps\web\components\pipeline\ScriptStep.tsx
// 대본 생성 UI + 씬 목록 + 편집 + 확정
// ============================================================

"use client";

import { useState } from "react";
import type { GeneratedScript } from "@/types/pipeline";

interface ScriptStepProps {
  script: GeneratedScript | null;
  setScript: React.Dispatch<React.SetStateAction<GeneratedScript | null>>;
  isGenerating: boolean;
  streamText: string;
  streamRef: React.RefObject<HTMLDivElement | null>;
  onGenerate: () => void;
  onConfirm: () => void;
}

export function ScriptStep({
  script, setScript, isGenerating, streamText, streamRef, onGenerate, onConfirm,
}: ScriptStepProps) {
  const [editingScene, setEditingScene] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const scenes = script?.scenes || (script as any)?.segments?.flatMap((seg: any) => seg.scenes || [seg]) || [];
  const updateSceneNarration = (idx: number, narration: string) => {
    if (!script) return;
    const updated = { ...script };
    updated.scenes[idx] = { ...updated.scenes[idx], narration };
    setScript(updated);
    setEditingScene(null);
  };

  // 대본 없고 생성 중도 아닐 때 — 시작 화면
  if (!script && !isGenerating) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0" }}>
        <p style={{ fontSize: 48, marginBottom: 16 }}>📝</p>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "#fff", marginBottom: 8 }}>Generate Script</h2>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24, maxWidth: 400, margin: "0 auto 24px" }}>
          AI will create a full script with scenes, narration, and image prompts for your topic.
        </p>
        <button onClick={onGenerate} style={{
          background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
          color: "#fff", padding: "14px 40px", borderRadius: 10,
          fontWeight: 600, fontSize: 15, border: "none", cursor: "pointer",
          boxShadow: "0 4px 20px rgba(37,99,235,0.3)",
        }}>⚡ Start Generation</button>
      </div>
    );
  }

  // 생성 중 — 스트리밍 화면
  if (isGenerating && !script) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span className="animate-pulse-slow" style={{ fontSize: 20 }}>⏳</span>
          <span style={{ color: "#60a5fa", fontSize: 14, fontWeight: 500 }}>Generating script...</span>
        </div>
        <div ref={streamRef} style={{
          background: "#0d1117", border: "1px solid #1e293b", borderRadius: 12,
          padding: 20, maxHeight: 400, overflow: "auto",
          fontFamily: "monospace", fontSize: 12, color: "#94a3b8",
          lineHeight: 1.8, whiteSpace: "pre-wrap",
        }}>
          {streamText || "Waiting for response..."}
        </div>
      </div>
    );
  }

  // 대본 완성 — 씬 목록
  if (!script) return null;

  return (
    <div>
      {/* 대본 헤더 */}
      <div style={{
        background: "linear-gradient(145deg, #111827, #0f1520)",
        border: "1px solid #1e293b", borderRadius: 14, padding: 24, marginBottom: 20,
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{script.title}</h2>
        <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6, marginBottom: 12 }}>
          {script.description?.substring(0, 200)}...
        </p>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#64748b" }}>🎬 {script.totalScenes} scenes</span>
          <span style={{ fontSize: 12, color: "#64748b" }}>⏱️ {script.estimatedDuration}</span>
          <span style={{ fontSize: 12, color: "#64748b" }}>🏷️ {script.tags?.length || 0} tags</span>
        </div>
      </div>

      {/* 뷰 모드 전환 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8" }}>Scenes</h3>
        <div style={{ display: "flex", gap: 4, background: "#0d1117", borderRadius: 8, padding: 3 }}>
          {(["card", "table"] as const).map((v) => (
            <button key={v} onClick={() => setViewMode(v)} style={{
              padding: "6px 14px", borderRadius: 6, fontSize: 12, border: "none", cursor: "pointer",
              background: viewMode === v ? "#1e293b" : "transparent",
              color: viewMode === v ? "#fff" : "#64748b",
            }}>{v === "card" ? "Cards" : "Table"}</button>
          ))}
        </div>
      </div>

      {/* 카드 뷰 */}
      {viewMode === "card" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {scenes.map((scene: any, idx: number) => (
            <div key={idx} style={{
              background: "#111827", border: "1px solid #1e293b", borderRadius: 12, padding: 20,
              transition: "border-color 0.15s",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    background: (scene.type || scene.section) === "hook" ? "#dc2626" :
                      (scene.type || scene.section) === "retention_gate" ? "#f59e0b" :
                        (scene.type || scene.section) === "cta" ? "#10b981" : "#1e293b",
                    color: "#fff", fontSize: 11, fontWeight: 700,
                    padding: "3px 10px", borderRadius: 6,
                  }}>#{scene.sceneNumber || scene.id || idx + 1}</span>
                  {(scene.type || scene.section) && (
                    <span style={{ fontSize: 11, color: "#475569" }}>{scene.type || scene.section}</span>
                  )}
                  <span style={{ fontSize: 11, color: "#475569" }}>{scene.duration || scene.durationEstimate}s</span>
                </div>
                <button onClick={() => setEditingScene(editingScene === idx ? null : idx)} style={{
                  background: "none", border: "1px solid #1e293b", borderRadius: 6,
                  color: "#64748b", fontSize: 11, padding: "4px 10px", cursor: "pointer",
                }}>{editingScene === idx ? "Cancel" : "Edit"}</button>
              </div>

              {editingScene === idx ? (
                <div>
                  <textarea defaultValue={scene.narration} rows={4} style={{
                    width: "100%", background: "#0a0a0a", border: "1px solid #2563eb",
                    borderRadius: 8, padding: 12, fontSize: 13, color: "#fff",
                    outline: "none", resize: "vertical", lineHeight: 1.6,
                  }} onBlur={(e) => updateSceneNarration(idx, e.target.value)} />
                  <p style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>
                    Image: {scene.imagePrompt?.substring(0, 80)}...
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7, marginBottom: 8 }}>{scene.narration}</p>
                  <p style={{ fontSize: 11, color: "#334155" }}>🖼️ {scene.imagePrompt?.substring(0, 100)}...</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 테이블 뷰 */}
      {viewMode === "table" && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1e293b" }}>
                {["#", "Section", "Narration", "Image Prompt", "Duration"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "#64748b", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scenes.map((scene: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: "1px solid #111827" }}>
                  <td style={{ padding: "10px 12px", color: "#94a3b8" }}>{scene.sceneNumber || scene.id || idx + 1}</td>
                  <td style={{ padding: "10px 12px", color: "#475569" }}>{scene.type || scene.section || "-"}</td>
                  <td style={{ padding: "10px 12px", color: "#cbd5e1", maxWidth: 350 }}>{scene.narration?.substring(0, 100)}...</td>
                  <td style={{ padding: "10px 12px", color: "#334155", maxWidth: 200 }}>{scene.imagePrompt?.substring(0, 60)}...</td>
                  <td style={{ padding: "10px 12px", color: "#94a3b8" }}>{scene.duration || scene.durationEstimate}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 하단 버튼 */}
      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button onClick={onGenerate} style={{
          padding: "12px 24px", borderRadius: 10, fontSize: 14,
          border: "1px solid #1e293b", background: "transparent",
          color: "#64748b", cursor: "pointer",
        }}>🔄 대본 재생성</button>
        <button onClick={onConfirm} style={{
          flex: 1, padding: "14px 0", borderRadius: 10, fontSize: 15,
          fontWeight: 600, border: "none", cursor: "pointer",
          background: "linear-gradient(135deg, #10b981, #059669)",
          color: "#fff", boxShadow: "0 4px 20px rgba(16,185,129,0.3)",
        }}>✅ 대본 확정 → 음성 생성</button>
      </div>
    </div>
  );
}
