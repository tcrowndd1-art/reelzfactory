// ============================================================
// C:\Dev\reelzfactory\apps\web\hooks\pipeline\useRenderPipeline.ts
// 렌더 준비 (Whisper STT) + MP4 렌더링 실행
// ============================================================

import { useState, useCallback } from "react";
import { getSettings } from "@/lib/store";
import type { Project, GeneratedScript, RenderData, Step, StepStatus } from "@/types/pipeline";

type ActionStatus = "idle" | "loading" | "done" | "error";

interface UseRenderPipelineReturn {
  renderData: RenderData | null;
  prepareStatus: ActionStatus;
  renderVideoStatus: ActionStatus;
  prepareRender: () => Promise<void>;
  startRender: () => Promise<void>;
}

interface UseRenderPipelineParams {
  project: Project | null;
  script: GeneratedScript | null;
  setStepStatus: React.Dispatch<React.SetStateAction<Record<Step, StepStatus>>>;
}

export function useRenderPipeline({
  project,
  script,
  setStepStatus,
}: UseRenderPipelineParams): UseRenderPipelineReturn {
  const [renderData, setRenderData] = useState<RenderData | null>(null);
  const [prepareStatus, setPrepareStatus] = useState<ActionStatus>("idle");
  const [renderVideoStatus, setRenderVideoStatus] = useState<ActionStatus>("idle");

  const prepareRender = useCallback(async () => {
    if (!project || !script) return;

    const settings = getSettings();
    const openaiKey = settings.apiKeys?.openai;
    if (!openaiKey) {
      alert("Set OpenAI API key in Settings (needed for subtitle sync)");
      return;
    }

    setPrepareStatus("loading");

    try {
      const channelPreset = settings.channel || {};
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          scenes: script.scenes.map((s, i) => ({
            id: s.id || i + 1,
            imageUrl: s.imageUrl,
            narration: s.narration,
          })),
          openaiKey,
          subtitlePreset: channelPreset.subtitle_preset,
          renderPreset: channelPreset.render_preset,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setRenderData(data.renderData);
        setStepStatus((s) => ({ ...s, render: "done" }));
        setPrepareStatus("done");
      } else {
        setStepStatus((s) => ({ ...s, render: "error" }));
        setPrepareStatus("error");
        alert("Render prep failed: " + data.error);
      }
    } catch (e: any) {
      setStepStatus((s) => ({ ...s, render: "error" }));
      setPrepareStatus("error");
      alert("Render error: " + e.message);
    }
  }, [project, script, setStepStatus]);

  const startRender = useCallback(async () => {
    if (!project) return;

    setRenderVideoStatus("loading");

    try {
      const res = await fetch("/api/render-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });

      const data = await res.json();

      if (data.success) {
        setRenderVideoStatus("done");
        window.open(data.videoUrl, "_blank");
      } else {
        setRenderVideoStatus("error");
        alert("렌더링 실패: " + (data.error || "Unknown error"));
      }
    } catch (e: any) {
      setRenderVideoStatus("error");
      alert("렌더링 오류: " + e.message);
    }
  }, [project]);

  return {
    renderData,
    prepareStatus,
    renderVideoStatus,
    prepareRender,
    startRender,
  };
}