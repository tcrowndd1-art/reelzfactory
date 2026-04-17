// ============================================================
// C:\Dev\reelzfactory\apps\web\components\pipeline\AutopilotBar.tsx
// 오토파일럿 진행률 바 + 상태 표시 + 중지 버튼
// ============================================================

"use client";

interface AutopilotBarProps {
  isRunning: boolean;
  phase: string;
  message: string;
  completedSteps: number;
  totalSteps: number;
  errors: string[];
  onStart: () => void;
  onStop: () => void;
  canStart: boolean;
}

export function AutopilotBar({
  isRunning, phase, message, completedSteps, totalSteps,
  errors, onStart, onStop, canStart,
}: AutopilotBarProps) {
  const percentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  const phaseColors: Record<string, string> = {
    idle: "#64748b",
    voice: "#f59e0b",
    image: "#8b5cf6",
    render: "#ef4444",
    done: "#10b981",
    error: "#ef4444",
    paused: "#f59e0b",
  };

  const phaseLabels: Record<string, string> = {
    idle: "대기",
    voice: "음성 생성",
    image: "이미지 생성",
    render: "렌더링",
    done: "완료",
    error: "에러",
    paused: "일시중지",
  };

  // 실행 중이 아니고 완료도 아닐 때 — 시작 버튼
  if (!isRunning && phase === "idle") {
    return (
      <div style={{
        background: "linear-gradient(135deg, #0f172a, #1e293b)",
        border: "1px solid #2563eb30",
        borderRadius: 12, padding: "16px 24px",
        marginBottom: 24, display: "flex",
        justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
            🚀 Autopilot
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
            Voice → Image → Render 자동 실행
          </div>
        </div>
        <button onClick={onStart} disabled={!canStart} style={{
          padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600,
          border: "none", cursor: canStart ? "pointer" : "not-allowed",
          background: canStart
            ? "linear-gradient(135deg, #2563eb, #7c3aed)"
            : "#1e293b",
          color: "#fff",
          opacity: canStart ? 1 : 0.5,
        }}>🚀 Start Autopilot</button>
      </div>
    );
  }

  // 실행 중 또는 완료/에러
  return (
    <div style={{
      background: "linear-gradient(135deg, #0f172a, #1e293b)",
      border: `1px solid ${phaseColors[phase] || "#1e293b"}30`,
      borderRadius: 12, padding: "16px 24px",
      marginBottom: 24,
    }}>
      {/* 상단: 상태 + 중지 버튼 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
            🚀 Autopilot — <span style={{ color: phaseColors[phase] || "#fff" }}>
              {phaseLabels[phase] || phase}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
            {message}
          </div>
        </div>
        {isRunning && (
          <button onClick={onStop} style={{
            padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
            border: "1px solid #ef444430", background: "#ef444415",
            color: "#ef4444", cursor: "pointer",
          }}>⏹ Stop</button>
        )}
      </div>

      {/* 진행률 바 */}
      <div style={{
        width: "100%", height: 6, background: "#1e293b",
        borderRadius: 3, overflow: "hidden",
      }}>
        <div style={{
          width: `${percentage}%`,
          height: "100%",
          background: phase === "error"
            ? "#ef4444"
            : `linear-gradient(90deg, #2563eb, ${phaseColors[phase] || "#7c3aed"})`,
          borderRadius: 3,
          transition: "width 0.5s ease",
        }} />
      </div>

      {/* 하단: 단계 표시 */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        {["Voice", "Image", "Render", "Upload"].map((label, i) => (
          <div key={label} style={{
            fontSize: 11,
            color: i < completedSteps ? "#10b981" : i === completedSteps && isRunning ? phaseColors[phase] : "#475569",
            fontWeight: i === completedSteps && isRunning ? 600 : 400,
          }}>
            {i < completedSteps ? "✅" : i === completedSteps && isRunning ? "⏳" : "○"} {label}
          </div>
        ))}
      </div>

      {/* 에러 목록 */}
      {errors.length > 0 && (
        <div style={{
          marginTop: 12, padding: "8px 12px",
          background: "#ef444410", borderRadius: 6,
          border: "1px solid #ef444420",
        }}>
          {errors.map((e, i) => (
            <div key={i} style={{ fontSize: 11, color: "#fca5a5", marginBottom: 2 }}>⚠ {e}</div>
          ))}
        </div>
      )}
    </div>
  );
}
