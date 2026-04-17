// ============================================================
// C:\Dev\reelzfactory\apps\web\components\pipeline\PipelineSteps.tsx
// 파이프라인 단계 탭 네비게이션
// ============================================================

"use client";

import { PIPELINE_STEPS } from "@/constants/voiceConfig";
import type { Step, StepStatus } from "@/types/pipeline";

interface PipelineStepsProps {
  currentStep: Step;
  stepStatus: Record<Step, StepStatus>;
  onStepClick: (step: Step) => void;
}

export function PipelineSteps({ currentStep, stepStatus, onStepClick }: PipelineStepsProps) {
  return (
    <div style={{
      display: "flex", gap: 4, marginBottom: 32, background: "#0d1117",
      borderRadius: 12, padding: 6, border: "1px solid #1e293b",
    }}>
      {PIPELINE_STEPS.map((s) => {
        const status = stepStatus[s.key];
        const active = currentStep === s.key;
        const clickable = status === "done" || active;

        return (
          <button
            key={s.key}
            onClick={() => clickable && onStepClick(s.key)}
            style={{
              flex: 1, padding: "12px 8px", borderRadius: 8, textAlign: "center",
              background: active ? "rgba(37,99,235,0.15)" : "transparent",
              border: active ? "1px solid rgba(37,99,235,0.3)" : "1px solid transparent",
              transition: "all 0.2s",
              cursor: clickable ? "pointer" : "not-allowed",
              opacity: clickable ? 1 : 0.5,
            }}
          >
            <div style={{ fontSize: 18, marginBottom: 4 }}>
              {status === "done" ? "✅" : status === "running" ? "⏳" : status === "error" ? "❌" : s.icon}
            </div>
            <p style={{
              fontSize: 11,
              color: active ? "#60a5fa" : status === "done" ? "#22c55e" : "#475569",
              fontWeight: active ? 600 : 400,
              margin: 0,
            }}>
              {s.label}
            </p>
          </button>
        );
      })}
    </div>
  );
}