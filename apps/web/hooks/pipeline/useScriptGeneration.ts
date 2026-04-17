// ============================================================
// C:\Dev\reelzfactory\apps\web\hooks\pipeline\useScriptGeneration.ts
// 대본 생성 (SSE 스트리밍) + 대본 확정
// ============================================================

import { useState, useRef, useCallback } from "react";
import { getSettings, saveProject } from "@/lib/store";
import type { Project, GeneratedScript, Step, StepStatus } from "@/types/pipeline";

interface UseScriptGenerationReturn {
  isGenerating: boolean;
  streamText: string;
  streamRef: React.RefObject<HTMLDivElement | null>;
  generateScript: () => Promise<void>;
  confirmScript: () => void;
}

interface UseScriptGenerationParams {
  project: Project | null;
  script: GeneratedScript | null;
  setScript: React.Dispatch<React.SetStateAction<GeneratedScript | null>>;
  setProject: React.Dispatch<React.SetStateAction<Project | null>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<Step>>;
  setStepStatus: React.Dispatch<React.SetStateAction<Record<Step, StepStatus>>>;
}

export function useScriptGeneration({
  project,
  script,
  setScript,
  setProject,
  setCurrentStep,
  setStepStatus,
}: UseScriptGenerationParams): UseScriptGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamText, setStreamText] = useState("");
  const streamRef = useRef<HTMLDivElement>(null);

  const generateScript = useCallback(async () => {
    if (!project) return;

    const settings = getSettings();
    const apiKey = settings.apiKeys.openrouter;
    if (!apiKey) {
      alert("OpenRouter API key required. Go to Settings.");
      return;
    }

    setIsGenerating(true);
    setStreamText("");
    setScript(null);
    setStepStatus((s) => ({ ...s, script: "running" }));

    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: project.topic,
          mode: project.mode,
          scriptSource: project.source,
          perspective: project.perspective,
          benchmarkUrl: project.benchmarkUrl,
          language: settings.channel.language,
          niche: settings.channel.niche,
          apiKey,
          imageStyle: settings.channel?.image_preset?.style,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "API request failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "chunk") {
              setStreamText((prev) => prev + parsed.content);
              if (streamRef.current) {
                streamRef.current.scrollTop = streamRef.current.scrollHeight;
              }
            } else if (parsed.type === "complete") {
              setScript(parsed.script);
              setStepStatus((s) => ({ ...s, script: "done" }));
            } else if (parsed.type === "error") {
              throw new Error(parsed.message);
            }
          } catch {
            // 개별 청크 파싱 실패는 무시
          }
        }
      }
    } catch (err: any) {
      setStepStatus((s) => ({ ...s, script: "error" }));
      alert(`Script generation failed: ${err.message || err}`);
    } finally {
      setIsGenerating(false);
    }
  }, [project, setScript, setStepStatus]);

  const confirmScript = useCallback(async () => {
    if (!project || !script) return;

    const updatedProject = {
      ...project,
      status: "tts" as const,
      title: script.title || project.title,
    };

    await saveProject(updatedProject);
    setProject(updatedProject);
    localStorage.setItem(
      `reelzfactory_script_${project.id}`,
      JSON.stringify(script)
    );
    setCurrentStep("tts");
    setStepStatus((s) => ({ ...s, script: "done" }));
  }, [project, script, setProject, setCurrentStep, setStepStatus]);

  return {
    isGenerating,
    streamText,
    streamRef,
    generateScript,
    confirmScript,
  };
}