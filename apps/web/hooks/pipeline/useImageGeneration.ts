// ============================================================
// C:\Dev\reelzfactory\apps\web\hooks\pipeline\useImageGeneration.ts
// 이미지 생성 (전체 + 개별 씬 재생성)
// ============================================================

import { useState, useCallback } from "react";
import { getSettings, saveProject } from "@/lib/store";
import type { Project, GeneratedScript } from "@/types/pipeline";

interface UseImageGenerationReturn {
  isGenerating: boolean;
  imageProgress: string;
  imageErrors: string[];
  generateAllImages: () => Promise<void>;
  regenerateSceneImage: (sceneIndex: number) => Promise<void>;
}

interface UseImageGenerationParams {
  project: Project | null;
  script: GeneratedScript | null;
  setScript: React.Dispatch<React.SetStateAction<GeneratedScript | null>>;
}

export function useImageGeneration({
  project,
  script,
  setScript,
}: UseImageGenerationParams): UseImageGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageProgress, setImageProgress] = useState("");
  const [imageErrors, setImageErrors] = useState<string[]>([]);

  const generateAllImages = useCallback(async () => {
    if (!script || !project) return;

    const settings = getSettings();
    const falKey = settings.apiKeys?.falai;
    if (!falKey) {
      setImageErrors(["Set fal.ai API key in Settings"]);
      return;
    }

    setIsGenerating(true);
    setImageErrors([]);
    setImageProgress(`Generating ${script.scenes.length} images... This may take 1-2 minutes.`);

    try {
      const scenes = script.scenes.map((s, i) => ({
        id: s.id || i + 1,
        type: s.type || s.section || "core",
        text: s.narration,
        imagePrompt: s.imagePrompt,
      }));

      const imagePreset = settings.channel?.image_preset || {};
      const res = await fetch("/api/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenes,
          falKey,
          styleOverride: imagePreset.style,
          colorScheme: imagePreset.colorScheme,
          promptPrefix: imagePreset.promptPrefix,
          referenceImages: imagePreset.referenceImages,
          engine: imagePreset.engine || "premium",
          aspectRatio: imagePreset.aspectRatio || "9:16",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Image generation failed");

      const updated = { ...script };
      const errors: string[] = [];

      for (const result of data.results) {
        const idx = result.sceneId - 1;
        if (result.success && updated.scenes[idx]) {
          updated.scenes[idx] = { ...updated.scenes[idx], imageUrl: result.imageUrl };
        } else if (!result.success) {
          errors.push(`Scene ${result.sceneId}: ${result.error}`);
        }
      }

      setScript(updated);
      setImageErrors(errors);
      setImageProgress(`Done! ${data.summary.success}/${data.summary.total} images generated.`);

      await saveProject({ ...project, status: "imaging" });
      localStorage.setItem(
        `reelzfactory_script_${project.id}`,
        JSON.stringify(updated)
      );
    } catch (err: any) {
      setImageErrors([err.message]);
      setImageProgress("");
    } finally {
      setIsGenerating(false);
    }
  }, [script, project, setScript]);

  const regenerateSceneImage = useCallback(async (sceneIndex: number) => {
    if (!script || !project) return;

    const settings = getSettings();
    const falKey = settings.apiKeys?.falai;
    if (!falKey) {
      alert("Set fal.ai API key in Settings");
      return;
    }

    const scene = script.scenes[sceneIndex];
    if (!scene) return;

    try {
      const settings2 = getSettings();
      const imagePreset2 = settings2.channel?.image_preset || {};
      const res = await fetch("/api/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenes: [{ id: scene.id || sceneIndex + 1, imagePrompt: scene.imagePrompt }],
          falKey,
          projectId: project.id,
          styleOverride: imagePreset2.style,
          colorScheme: imagePreset2.colorScheme,
          promptPrefix: imagePreset2.promptPrefix,
          referenceImages: imagePreset2.referenceImages,
          engine: imagePreset2.engine || "premium",
          aspectRatio: imagePreset2.aspectRatio || "9:16",
        }),
      });

      const data = await res.json();
      if (data.results?.[0]?.imageUrl) {
        const updated = { ...script };
        updated.scenes[sceneIndex] = {
          ...updated.scenes[sceneIndex],
          imageUrl: data.results[0].imageUrl,
        };
        setScript(updated);
        localStorage.setItem(
          `reelzfactory_script_${project.id}`,
          JSON.stringify(updated)
        );
      }
    } catch {
      alert(`Scene ${sceneIndex + 1} regeneration failed`);
    }
  }, [script, project, setScript]);

  return {
    isGenerating,
    imageProgress,
    imageErrors,
    generateAllImages,
    regenerateSceneImage,
  };
}