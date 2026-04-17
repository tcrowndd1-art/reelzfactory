// lib/pipelineCheckpoint.ts — 파이프라인 체크포인트 (localStorage + Supabase)

import type { PipelineCheckpoint, Step, PipelineError } from "@/types/pipeline";
import { supabase } from "@/lib/supabase";

const CHECKPOINT_PREFIX = "reelzfactory_checkpoint_";

function getKey(projectId: string): string {
  return `${CHECKPOINT_PREFIX}${projectId}`;
}

// Supabase pipeline_logs에 기록 (fire-and-forget)
function logToSupabase(projectId: string, phase: string, severity: string, message: string, details?: any): void {
  supabase.from("pipeline_logs").insert({
    project_id: projectId,
    phase,
    severity,
    message,
    details: details || null,
  }).then(({ error }) => {
    if (error) console.warn("pipeline_log insert failed:", error.message);
  });
}

export function createCheckpoint(projectId: string): PipelineCheckpoint {
  return {
    projectId,
    currentPhase: "idle",
    completedPhases: [],
    voiceResults: [],
    imageResults: [],
    renderStatus: "pending",
    uploadStatus: "pending",
    lastUpdated: new Date().toISOString(),
    errorLog: [],
  };
}

export function loadCheckpoint(projectId: string): PipelineCheckpoint | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(getKey(projectId));
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function saveCheckpoint(checkpoint: PipelineCheckpoint): void {
  if (typeof window === "undefined") return;
  checkpoint.lastUpdated = new Date().toISOString();
  localStorage.setItem(getKey(checkpoint.projectId), JSON.stringify(checkpoint));
}

export function updateCheckpointPhase(
  projectId: string,
  phase: Step | "idle" | "done" | "error"
): void {
  const checkpoint = loadCheckpoint(projectId) || createCheckpoint(projectId);
  checkpoint.currentPhase = phase;
  if (phase !== "idle" && phase !== "done" && phase !== "error") {
    if (!checkpoint.completedPhases.includes(phase)) {
      const order: Step[] = ["script", "tts", "storyboard", "render", "upload"];
      const currentIndex = order.indexOf(phase);
      for (let i = 0; i < currentIndex; i++) {
        if (!checkpoint.completedPhases.includes(order[i])) {
          checkpoint.completedPhases.push(order[i]);
        }
      }
    }
  }
  saveCheckpoint(checkpoint);

  // Supabase에 단계 전환 기록
  logToSupabase(projectId, phase, "info", `Phase changed to: ${phase}`);
}

export function addCheckpointError(
  projectId: string,
  error: PipelineError
): void {
  const checkpoint = loadCheckpoint(projectId) || createCheckpoint(projectId);
  checkpoint.errorLog.push(error);
  saveCheckpoint(checkpoint);

  // Supabase에 에러 기록
  logToSupabase(projectId, error.phase || "unknown", "error", error.message, { error });
}

export function markCheckpointDone(projectId: string): void {
  const checkpoint = loadCheckpoint(projectId) || createCheckpoint(projectId);
  checkpoint.currentPhase = "done";
  checkpoint.completedPhases = ["script", "tts", "storyboard", "render", "upload"];
  saveCheckpoint(checkpoint);

  // Supabase에 완료 기록
  logToSupabase(projectId, "done", "info", "Pipeline completed successfully");
}
