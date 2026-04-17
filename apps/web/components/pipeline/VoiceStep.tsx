// ============================================================
// C:\Dev\reelzfactory\apps\web\components\pipeline\VoiceStep.tsx
// 음성 생성 UI — 씬별 오디오 + 보이스 설정 진입
// ============================================================

"use client";

import type { GeneratedScript, Step, StepStatus } from "@/types/pipeline";

interface VoiceStepProps {
  script: GeneratedScript;
  isGenerating: boolean;
  voiceProgress: string;
  voiceErrors: string[];
  activeVoiceName: string;
  voiceEngine: string;
  voiceStyle: string;
  voiceGender: string;
  voiceSpeed: number;
  onOpenModal: () => void;
  onMoveToStoryboard: () => void;
}

export function VoiceStep({
  script, isGenerating, voiceProgress, voiceErrors,
  activeVoiceName, voiceEngine, voiceStyle, voiceGender, voiceSpeed,
  onOpenModal, onMoveToStoryboard,
}: VoiceStepProps) {
  const scenes = script.scenes || (script as any).segments?.flatMap((seg: any) => seg.scenes || [seg]) || [];
  const hasAudio = scenes.some((s: any) => s.audioUrl);

  return (
    <div>
      {/* Header */}
      <div style={{
        background: "#111827", border: "1px solid #1e293b", borderRadius: 12, padding: 20, marginBottom: 20,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>Voice Generation</h2>
          <p style={{ fontSize: 12, color: "#64748b", margin: "6px 0 0" }}>
            🎤 <span style={{ color: "#f59e0b" }}>
              {voiceEngine === "clone" ? "Clone" : activeVoiceName}
            </span> · {voiceEngine} · {voiceSpeed}x
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onOpenModal} style={{
            padding: "10px 20px", borderRadius: 10, fontSize: 13, border: "1px solid #1e293b",
            background: "#0d1117", color: "#94a3b8", cursor: "pointer",
          }}>⚙️ Voice Settings</button>
          <button onClick={onOpenModal} disabled={isGenerating} style={{
            padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600, border: "none",
            cursor: isGenerating ? "not-allowed" : "pointer",
            background: isGenerating ? "#1e293b" : "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff",
          }}>{isGenerating ? "생성 중..." : "🎤 전체 음성 생성"}</button>
        </div>
      </div>

      {/* Progress / Errors */}
      {voiceProgress && (
        <div style={{ padding: "12px 16px", background: "#0f172a", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "#f59e0b", border: "1px solid #1e293b" }}>
          {voiceProgress}
        </div>
      )}
      {voiceErrors.length > 0 && (
        <div style={{ padding: "12px 16px", background: "#1a0000", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "#ef4444", border: "1px solid #7f1d1d" }}>
          {voiceErrors.map((e, i) => <div key={i}>{e}</div>)}
        </div>
      )}

      {/* Scene List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {scenes.map((scene: any, idx: number) => (
          <div key={idx} style={{
            background: "#0f172a", borderRadius: 12, padding: 16, border: "1px solid #1e293b",
            display: "flex", alignItems: "center", gap: 16,
          }}>
            <div style={{ minWidth: 60, textAlign: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>Scene {scene.id || idx + 1}</span>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{scene.type || scene.section || "core"}</div>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, color: "#cbd5e1", margin: 0, lineHeight: 1.4 }}>
                {scene.narration?.substring(0, 100)}...
              </p>
            </div>
            <div style={{ minWidth: 120 }}>
              {scene.audioUrl ? (
                <div>
                  <audio controls style={{ width: 120, height: 32 }} src={`${scene.audioUrl}?t=${Date.now()}`} preload="auto" />
                  {scene.model && (
                    <div style={{ fontSize: 9, color: "#64748b", marginTop: 2, textAlign: "center" }}>{scene.model}</div>
                  )}
                </div>
              ) : (
                <span style={{ fontSize: 12, color: "#475569" }}>{isGenerating ? "생성 중..." : "음성 없음"}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Next Step */}
      {hasAudio && (
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <button onClick={onMoveToStoryboard} style={{
            padding: "14px 48px", borderRadius: 10, fontSize: 15, fontWeight: 600, border: "none", cursor: "pointer",
            background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff",
          }}>스토리보드로 이동</button>
        </div>
      )}
    </div>
  );
}
