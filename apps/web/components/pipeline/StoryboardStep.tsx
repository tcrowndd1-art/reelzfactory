// ============================================================
// C:\Dev\reelzfactory\apps\web\components\pipeline\StoryboardStep.tsx
// 이미지 그리드 — 전체 생성 + 개별 재생성
// ============================================================

"use client";

import type { GeneratedScript } from "@/types/pipeline";

interface StoryboardStepProps {
  script: GeneratedScript;
  isGenerating: boolean;
  imageProgress: string;
  imageErrors: string[];
  onGenerateAll: () => void;
  onRegenerateScene: (sceneIndex: number) => Promise<void>;
  onMoveToRender: () => void;
}

export function StoryboardStep({
  script, isGenerating, imageProgress, imageErrors,
  onGenerateAll, onRegenerateScene, onMoveToRender,
}: StoryboardStepProps) {
  const scenes = script.scenes || (script as any).segments?.flatMap((seg: any) => seg.scenes || [seg]) || [];
  const hasImages = scenes.some((s: any) => s.imageUrl);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>Image Generation</h2>
        <button onClick={onGenerateAll} disabled={isGenerating} style={{
          padding: "12px 32px", borderRadius: 10, fontSize: 14, fontWeight: 600, border: "none",
          cursor: isGenerating ? "not-allowed" : "pointer",
          background: isGenerating ? "#1e293b" : "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff",
        }}>{isGenerating ? "생성 중..." : "전체 이미지 생성"}</button>
      </div>

      {/* Progress / Errors */}
      {imageProgress && (
        <div style={{ padding: "12px 16px", background: "#0f172a", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "#10b981", border: "1px solid #1e293b" }}>
          {imageProgress}
        </div>
      )}
      {imageErrors.length > 0 && (
        <div style={{ padding: "12px 16px", background: "#1a0000", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "#ef4444", border: "1px solid #7f1d1d" }}>
          {imageErrors.map((e, i) => <div key={i}>{e}</div>)}
        </div>
      )}

      {/* Image Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {scenes.map((scene: any, idx: number) => (
          <div key={idx} style={{ background: "#0f172a", borderRadius: 12, overflow: "hidden", border: "1px solid #1e293b" }}>
            {scene.imageUrl ? (
              <img src={scene.imageUrl} alt={`Scene ${idx + 1}`} style={{ width: "100%", height: 200, objectFit: "cover" }} />
            ) : (
              <div style={{
                width: "100%", height: 200, background: "#1e293b",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#475569", fontSize: 13,
              }}>
                {isGenerating ? "생성 중..." : "No image yet"}
              </div>
            )}
            <div style={{ padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>Scene {scene.id || idx + 1}</span>
                <span style={{
                  fontSize: 11, padding: "2px 8px", borderRadius: 4,
                  background: (scene.type || scene.section) === "hook" ? "#dc262620" :
                    (scene.type || scene.section) === "cta" ? "#10b98120" : "#1e293b",
                  color: (scene.type || scene.section) === "hook" ? "#dc2626" :
                    (scene.type || scene.section) === "cta" ? "#10b981" : "#64748b",
                }}>{scene.type || scene.section || `#${scene.sceneNumber || idx + 1}`}</span>
              </div>
              <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.4, margin: 0 }}>
                {scene.narration?.substring(0, 80)}...
              </p>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button onClick={() => onRegenerateScene(idx)} style={{
                  flex: 1, padding: "6px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                  border: "1px solid #1e293b", background: "#1e293b", color: "#94a3b8", cursor: "pointer",
                }}>🔄 Regen</button>
                <button onClick={() => alert(`영상화 기능 준비중 (Scene ${idx + 1})`)} style={{
                  flex: 1, padding: "6px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                  border: "1px solid #7c3aed30", background: "#7c3aed15", color: "#a78bfa", cursor: "pointer",
                }}>🎬 Video</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Next Step */}
      {hasImages && (
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <button onClick={onMoveToRender} style={{
            padding: "14px 48px", borderRadius: 10, fontSize: 15, fontWeight: 600, border: "none", cursor: "pointer",
            background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff",
          }}>렌더링으로 이동</button>
        </div>
      )}
    </div>
  );
}
