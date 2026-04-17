// ============================================================
// C:\Dev\reelzfactory\apps\web\components\pipeline\RenderStep.tsx
// 렌더 준비 + MP4 렌더링
// ============================================================

"use client";

import type { GeneratedScript, RenderData, Step, StepStatus } from "@/types/pipeline";

type ActionStatus = "idle" | "loading" | "done" | "error";

interface RenderStepProps {
  script: GeneratedScript;
  renderData: RenderData | null;
  prepareStatus: ActionStatus;
  renderVideoStatus: ActionStatus;
  onPrepare: () => void;
  onRender: () => void;
  onMoveToUpload: () => void;
}

export function RenderStep({
  script, renderData, prepareStatus, renderVideoStatus,
  onPrepare, onRender, onMoveToUpload,
}: RenderStepProps) {
  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>4. Render — Video Export</h2>
        <button onClick={onPrepare} disabled={prepareStatus === "loading"} style={{
          padding: "12px 32px", borderRadius: 10, fontSize: 14, fontWeight: 600, border: "none",
          cursor: prepareStatus === "loading" ? "not-allowed" : "pointer",
          background: prepareStatus === "loading" ? "#1e293b"
            : prepareStatus === "done" ? "linear-gradient(135deg, #10b981, #059669)"
            : prepareStatus === "error" ? "linear-gradient(135deg, #ef4444, #dc2626)"
            : "linear-gradient(135deg, #8b5cf6, #7c3aed)",
          color: "#fff", transition: "all 0.3s ease",
          transform: prepareStatus === "loading" ? "scale(0.97)" : "scale(1)",
          opacity: prepareStatus === "loading" ? 0.7 : 1,
        }}>
          {prepareStatus === "loading" ? "⏳ 준비 중..."
            : prepareStatus === "done" ? "✅ 준비 완료"
            : prepareStatus === "error" ? "❌ 실패 (재시도)"
            : "🎬 렌더 준비"}
        </button>
      </div>

      {/* Render Data */}
      {renderData && (
        <div style={{ background: "#0f172a", borderRadius: 12, padding: 20, border: "1px solid #1e293b" }}>
          {/* Stats */}
          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            {[
              { label: "Total Duration", value: `${renderData.totalDuration}s` },
              { label: "Scenes", value: `${renderData.scenes.length}` },
              { label: "FPS", value: `${renderData.fps}` },
            ].map((stat) => (
              <div key={stat.label} style={{ padding: "12px 20px", background: "#1e293b", borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: "#64748b" }}>{stat.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Scene Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {renderData.scenes.map((s, i) => (
              <div key={i} style={{ background: "#1e293b", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 4 }}>Scene {i + 1}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  {s.words.length} words · {(s.durationInFrames / renderData.fps).toFixed(1)}s
                </div>
              </div>
            ))}
          </div>

          {/* Render Button */}
          <div style={{ marginTop: 20, textAlign: "center", display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={onRender} disabled={renderVideoStatus === "loading"} style={{
              padding: "16px 48px", borderRadius: 12, fontSize: 16, fontWeight: 700, border: "none",
              cursor: renderVideoStatus === "loading" ? "not-allowed" : "pointer",
              background: renderVideoStatus === "loading" ? "#1e293b"
                : renderVideoStatus === "done" ? "linear-gradient(135deg, #10b981, #059669)"
                : renderVideoStatus === "error" ? "linear-gradient(135deg, #f59e0b, #d97706)"
                : "linear-gradient(135deg, #ef4444, #dc2626)",
              color: "#fff",
              boxShadow: renderVideoStatus === "loading" ? "none" : "0 4px 20px rgba(239,68,68,0.3)",
              transition: "all 0.3s ease",
              transform: renderVideoStatus === "loading" ? "scale(0.97)" : "scale(1)",
              opacity: renderVideoStatus === "loading" ? 0.7 : 1,
            }}>
              {renderVideoStatus === "loading" ? "🎬 렌더링 중... (최대 5분)"
                : renderVideoStatus === "done" ? "✅ 렌더링 완료! (다시 다운로드)"
                : renderVideoStatus === "error" ? "⚠️ 실패 — 재시도"
                : "🎬 MP4 렌더링 시작"}
            </button>

            {renderVideoStatus === "done" && (
              <button onClick={onMoveToUpload} style={{
                padding: "16px 48px", borderRadius: 12, fontSize: 16, fontWeight: 700, border: "none",
                cursor: "pointer",
                background: "linear-gradient(135deg, #dc2626, #9333ea)",
                color: "#fff", boxShadow: "0 4px 20px rgba(147,51,234,0.3)",
              }}>📤 Upload 탭으로 이동</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
