// ============================================================
// C:\Dev\reelzfactory\apps\web\hooks\pipeline\useAutopilot.ts
// 오토파일럿 상태머신 — Voice → Image → Render 자동 실행
// Upload는 탭 이동만 (수동 확인 후 업로드)
// ============================================================

import { useState, useCallback, useRef } from "react";
import { notifyPipeline } from "@/lib/notify";
import {
  createCheckpoint,
  saveCheckpoint,
  loadCheckpoint,
  updateCheckpointPhase,
  addCheckpointError,
  markCheckpointDone,
} from "@/lib/pipelineCheckpoint";
import type { Step, StepStatus, GeneratedScript, Project } from "@/types/pipeline";

type AutopilotPhase = "idle" | "voice" | "image" | "render" | "done" | "error" | "paused";

interface AutopilotProgress {
  phase: AutopilotPhase;
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  message: string;
  errors: string[];
}

interface UseAutopilotReturn {
  isRunning: boolean;
  progress: AutopilotProgress;
  startAutopilot: () => Promise<void>;
  stopAutopilot: () => void;
}

interface UseAutopilotParams {
  project: Project | null;
  script: GeneratedScript | null;
  setCurrentStep: React.Dispatch<React.SetStateAction<Step>>;
  setStepStatus: React.Dispatch<React.SetStateAction<Record<Step, StepStatus>>>;
  generateVoices: () => Promise<void>;
  generateAllImages: () => Promise<void>;
  prepareRender: () => Promise<void>;
  startRender: () => Promise<void>;
  voiceIsGenerating: boolean;
  imageIsGenerating: boolean;
}

export function useAutopilot({
  project,
  script,
  setCurrentStep,
  setStepStatus,
  generateVoices,
  generateAllImages,
  prepareRender,
  startRender,
  voiceIsGenerating,
  imageIsGenerating,
}: UseAutopilotParams): UseAutopilotReturn {
  const [isRunning, setIsRunning] = useState(false);
  const stopRef = useRef(false);
  const [progress, setProgress] = useState<AutopilotProgress>({
    phase: "idle",
    currentStep: "",
    totalSteps: 4,
    completedSteps: 0,
    message: "",
    errors: [],
  });

  const updateProgress = useCallback((update: Partial<AutopilotProgress>) => {
    setProgress((prev) => ({ ...prev, ...update }));
  }, []);

  const waitUntil = useCallback(async (
    checkFn: () => boolean,
    timeoutMs: number = 600000,
    intervalMs: number = 1000
  ): Promise<boolean> => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (stopRef.current) return false;
      if (checkFn()) return true;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    return false;
  }, []);

  const startAutopilot = useCallback(async () => {
    if (!project || !script || isRunning) return;

    setIsRunning(true);
    stopRef.current = false;

    const existing = loadCheckpoint(project.id);
    const checkpoint = existing && existing.renderStatus !== "done" && existing.renderStatus !== "failed"
      ? existing
      : createCheckpoint(project.id);
    const errors: string[] = [];
    const skipPhase = (phase: Step) => checkpoint.completedPhases.includes(phase);

    try {
      // ===== PHASE 1: VOICE =====
      if (skipPhase("tts")) {
        updateProgress({ completedSteps: 1, message: "음성 이전 완료 — 스킵 ✓" });
        setStepStatus((s) => ({ ...s, script: "done", tts: "done" }));
      } else {
        updateProgress({
          phase: "voice",
          currentStep: "Voice Generation",
          completedSteps: 0,
          message: "음성 생성 시작...",
          errors: [],
        });
        setCurrentStep("tts");
        setStepStatus((s) => ({ ...s, script: "done", tts: "running" }));
        updateCheckpointPhase(project.id, "tts");

        const hasVoice = script.scenes.every((s) => s.audioUrl);
        if (!hasVoice) {
          await generateVoices();
          await waitUntil(() => !voiceIsGenerating, 300000);
          if (stopRef.current) throw new Error("Autopilot stopped by user");
        }

        setStepStatus((s) => ({ ...s, tts: "done" }));
        checkpoint.completedPhases.push("tts");
        saveCheckpoint(checkpoint);

        updateProgress({
          completedSteps: 1,
          message: "음성 생성 완료 ✓",
        });

        await new Promise((r) => setTimeout(r, 1000));
      }

      // ===== PHASE 2: IMAGE =====
      if (skipPhase("storyboard")) {
        updateProgress({ completedSteps: 2, message: "이미지 이전 완료 — 스킵 ✓" });
        setStepStatus((s) => ({ ...s, storyboard: "done" }));
      } else {
        if (stopRef.current) throw new Error("Autopilot stopped by user");

        updateProgress({
          phase: "image",
          currentStep: "Image Generation",
          completedSteps: 1,
          message: "이미지 생성 시작...",
        });
        setCurrentStep("storyboard");
        setStepStatus((s) => ({ ...s, storyboard: "running" }));
        updateCheckpointPhase(project.id, "storyboard");

        const hasImages = script.scenes.every((s) => s.imageUrl);
        if (!hasImages) {
          await generateAllImages();
          await waitUntil(() => !imageIsGenerating, 600000);
          if (stopRef.current) throw new Error("Autopilot stopped by user");
        }

        // 이미지 1회 재시도
        const failedFirst = script.scenes.filter((s) => !s.imageUrl);
        if (failedFirst.length > 0 && failedFirst.length <= 3) {
          updateProgress({ message: `${failedFirst.length}개 씬 이미지 재시도 중...` });
          await generateAllImages();
          await waitUntil(() => !imageIsGenerating, 300000);
          if (stopRef.current) throw new Error("Autopilot stopped by user");
        }

        // 최종 실패 체크
        const failedImages = script.scenes.filter((s) => !s.imageUrl);
        if (failedImages.length > 0) {
          const errorMsg = `${failedImages.length}개 씬 이미지 생성 실패 — placeholder로 진행`;
          errors.push(errorMsg);
          addCheckpointError(project.id, {
            phase: "storyboard",
            message: errorMsg,
            timestamp: new Date().toISOString(),
          });

          await notifyPipeline({
            type: "image_failed",
            projectId: project.id,
            details: `프로젝트 ${project.id}: ${script.scenes.length}씬 중 ${failedImages.length}개 이미지 실패`,
            severity: "warning",
          });
        }

        setStepStatus((s) => ({ ...s, storyboard: "done" }));
        checkpoint.completedPhases.push("storyboard");
        saveCheckpoint(checkpoint);

        updateProgress({
          completedSteps: 2,
          message: "이미지 생성 완료 ✓",
          errors,
        });

        await new Promise((r) => setTimeout(r, 1000));
      }

      // ===== PHASE 3: RENDER =====
      if (skipPhase("render")) {
        updateProgress({ completedSteps: 3, message: "렌더 이전 완료 — 스킵 ✓" });
        setStepStatus((s) => ({ ...s, render: "done" }));
      } else {
        if (stopRef.current) throw new Error("Autopilot stopped by user");

        updateProgress({
          phase: "render",
          currentStep: "Render Prepare",
          completedSteps: 2,
          message: "렌더 준비 중...",
        });
        setCurrentStep("render");
        setStepStatus((s) => ({ ...s, render: "running" }));
        updateCheckpointPhase(project.id, "render");

        await prepareRender();
        await new Promise((r) => setTimeout(r, 2000));

        if (stopRef.current) throw new Error("Autopilot stopped by user");

        updateProgress({ message: "MP4 렌더링 중... (최대 5분)" });
        const renderTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("렌더링 5분 타임아웃")), 300000)
        );
        await Promise.race([startRender(), renderTimeout]);

        setStepStatus((s) => ({ ...s, render: "done" }));
        checkpoint.completedPhases.push("render");
        checkpoint.renderStatus = "done";
        saveCheckpoint(checkpoint);

        updateProgress({
          completedSteps: 3,
          message: "렌더링 완료 ✓",
        });
      }

      // ===== PHASE 4: UPLOAD 탭으로 이동 (업로드는 수동) =====
      setCurrentStep("upload");
      setStepStatus((s) => ({ ...s, upload: "pending" }));

      updateProgress({
        phase: "done",
        currentStep: "Complete",
        completedSteps: 4,
        message: "오토파일럿 완료! Upload 탭에서 업로드하세요.",
      });

      markCheckpointDone(project.id);

      await notifyPipeline({
        type: "pipeline_complete",
        projectId: project.id,
        details: `프로젝트 ${project.id} 오토파일럿 완료. 에러: ${errors.length}개`,
        severity: errors.length > 0 ? "warning" : "info",
      });

    } catch (err: any) {
      const errorMsg = err.message || "Unknown error";

      updateProgress({
        phase: "error",
        message: `오토파일럿 중단: ${errorMsg}`,
        errors: [...errors, errorMsg],
      });

      addCheckpointError(project.id, {
        phase: progress.phase as Step || "script",
        message: errorMsg,
        timestamp: new Date().toISOString(),
      });

      await notifyPipeline({
        type: "render_failed",
        projectId: project.id,
        details: `오토파일럿 중단: ${errorMsg}`,
        severity: "critical",
      });
    } finally {
      setIsRunning(false);
      stopRef.current = false;
    }
  }, [
    project, script, isRunning,
    generateVoices, generateAllImages, prepareRender, startRender,
    voiceIsGenerating, imageIsGenerating,
    setCurrentStep, setStepStatus, updateProgress, waitUntil, progress.phase,
  ]);

  const stopAutopilot = useCallback(() => {
    stopRef.current = true;
    updateProgress({
      phase: "paused",
      message: "오토파일럿 중지 요청됨... 현재 작업 완료 후 중단됩니다.",
    });
  }, [updateProgress]);

  return {
    isRunning,
    progress,
    startAutopilot,
    stopAutopilot,
  };
}
