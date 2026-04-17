// ============================================================
// C:\Dev\reelzfactory\apps\web\hooks\pipeline\useProjectLoader.ts
// 프로젝트 + 스크립트 로드, 초기 파이프라인 상태 복원
// ============================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getProjects } from "@/lib/store";
import type { Project, GeneratedScript, Step, StepStatus } from "@/types/pipeline";

interface UseProjectLoaderReturn {
  project: Project | null;
  setProject: React.Dispatch<React.SetStateAction<Project | null>>;
  script: GeneratedScript | null;
  setScript: React.Dispatch<React.SetStateAction<GeneratedScript | null>>;
  currentStep: Step;
  setCurrentStep: React.Dispatch<React.SetStateAction<Step>>;
  stepStatus: Record<Step, StepStatus>;
  setStepStatus: React.Dispatch<React.SetStateAction<Record<Step, StepStatus>>>;
  isLoading: boolean;
}

const INITIAL_STATUS: Record<Step, StepStatus> = {
  script: "pending",
  tts: "pending",
  storyboard: "pending",
  render: "pending",
  upload: "pending",
};

export function useProjectLoader(projectId: string): UseProjectLoaderReturn {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [script, setScript] = useState<GeneratedScript | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>("script");
  const [stepStatus, setStepStatus] = useState<Record<Step, StepStatus>>(INITIAL_STATUS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const projects = await getProjects();
      const found = projects.find((p: any) => p.id === projectId);

      if (!found) {
        router.push("/projects");
        return;
      }

      setProject(found as any);

      try {
        const savedScript = localStorage.getItem(`reelzfactory_script_${projectId}`);
        if (savedScript) {
          const parsed: GeneratedScript = JSON.parse(savedScript);
          setScript(parsed);

          const hasAudio = parsed.scenes?.some((s) => s.audioUrl);
          const hasImages = parsed.scenes?.some((s) => s.imageUrl);

          if (hasAudio && hasImages) {
            setCurrentStep("render");
            setStepStatus((prev) => ({
              ...prev,
              script: "done",
              tts: "done",
              storyboard: "done",
            }));
          } else if (hasAudio) {
            setCurrentStep("storyboard");
            setStepStatus((prev) => ({
              ...prev,
              script: "done",
              tts: "done",
            }));
          } else if (parsed.scenes?.length > 0) {
            setCurrentStep("tts");
            setStepStatus((prev) => ({
              ...prev,
              script: "done",
            }));
          }
        }
      } catch {
        // 파싱 실패 시 초기 상태 유지
      }

      setIsLoading(false);
    };

    load();
  }, [projectId, router]);

  return {
    project,
    setProject,
    script,
    setScript,
    currentStep,
    setCurrentStep,
    stepStatus,
    setStepStatus,
    isLoading,
  };
}