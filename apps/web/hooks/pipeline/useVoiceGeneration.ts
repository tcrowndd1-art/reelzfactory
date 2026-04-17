// ============================================================
// C:\Dev\reelzfactory\apps\web\hooks\pipeline\useVoiceGeneration.ts
// TTS 생성 + 보이스 선택 상태 관리
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { getSettings, saveProject } from "@/lib/store";
import { VOICE_STYLES, VOICE_OPTIONS, getVoiceOptionKey } from "@/constants/voiceConfig";
import type { Project, GeneratedScript, VoiceOption } from "@/types/pipeline";

interface VoiceSelectionState {
  showVoiceModal: boolean;
  setShowVoiceModal: React.Dispatch<React.SetStateAction<boolean>>;
  voiceStyle: string;
  setVoiceStyle: React.Dispatch<React.SetStateAction<string>>;
  voiceGender: string;
  setVoiceGender: React.Dispatch<React.SetStateAction<string>>;
  voiceSpeed: number;
  setVoiceSpeed: React.Dispatch<React.SetStateAction<number>>;
  selectedVoiceName: string;
  setSelectedVoiceName: React.Dispatch<React.SetStateAction<string>>;
  voiceTab: "style" | "category" | "all";
  setVoiceTab: React.Dispatch<React.SetStateAction<"style" | "category" | "all">>;
  voiceEngine: "google" | "openai" | "clone";
  setVoiceEngine: React.Dispatch<React.SetStateAction<"google" | "openai" | "clone">>;
}

interface UseVoiceGenerationReturn extends VoiceSelectionState {
  isGenerating: boolean;
  voiceProgress: string;
  voiceErrors: string[];
  generateVoices: () => Promise<void>;
  getActiveVoiceName: () => string;
  getVoiceSource: () => string;
  getCategoryVoices: () => { male: VoiceOption[]; female: VoiceOption[] };
}

interface UseVoiceGenerationParams {
  project: Project | null;
  script: GeneratedScript | null;
  setScript: React.Dispatch<React.SetStateAction<GeneratedScript | null>>;
}

export function useVoiceGeneration({
  project,
  script,
  setScript,
}: UseVoiceGenerationParams): UseVoiceGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [voiceProgress, setVoiceProgress] = useState("");
  const [voiceErrors, setVoiceErrors] = useState<string[]>([]);

  // 보이스 선택 상태
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceStyle, setVoiceStyle] = useState("cognitive_gap");
  const [voiceGender, setVoiceGender] = useState("male");
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");
  const [voiceTab, setVoiceTab] = useState<"style" | "category" | "all">("style");
  const [voiceEngine, setVoiceEngine] = useState<"google" | "openai" | "clone">("google");

  // 프로젝트 snapshot에서 voice 설정 초기화
  useEffect(() => {
    const vp = project?.voice_preset_snapshot;
    if (!vp) return;
    if (vp.provider === "gemini") setVoiceEngine("google");
    else if (vp.provider === "openai") setVoiceEngine("openai");
    else if (vp.provider === "clone") setVoiceEngine("clone");
    if (vp.style) setVoiceStyle(vp.style);
    if (vp.gender) setVoiceGender(vp.gender);
    if (vp.speed) setVoiceSpeed(vp.speed);
    if (vp.voiceName) setSelectedVoiceName(vp.voiceName);
  }, [project]);

  // voiceStyle 변경 시 speed 자동 세팅
  useEffect(() => {
    const style = VOICE_STYLES.find((v) => v.id === voiceStyle);
    if (style) {
      setVoiceSpeed(style.speed);
      setSelectedVoiceName("");
    }
  }, [voiceStyle]);

  const getActiveVoiceName = useCallback((): string => {
    if (selectedVoiceName) return selectedVoiceName;
    const style = VOICE_STYLES.find((v) => v.id === voiceStyle);
    if (!style) return "Charon";
    return voiceGender === "male" ? style.maleVoice : style.femaleVoice;
  }, [selectedVoiceName, voiceStyle, voiceGender]);

  const getVoiceSource = useCallback((): string => {
    if (selectedVoiceName) return "직접 선택";
    return `${VOICE_STYLES.find((v) => v.id === voiceStyle)?.label || "Style"} 기본`;
  }, [selectedVoiceName, voiceStyle]);

  const getCategoryVoices = useCallback((): { male: VoiceOption[]; female: VoiceOption[] } => {
    const category = project?.category || "health";
    const mode = project?.mode || "shorts";
    const key = getVoiceOptionKey(category, mode);
    return VOICE_OPTIONS[key] || VOICE_OPTIONS.shorts_default;
  }, [project?.category, project?.mode]);

  const generateVoices = useCallback(async () => {
    if (!script || !project) return;

    const settings = getSettings();
    const geminiKey = settings.apiKeys?.gemini;
    const openaiKey = settings.apiKeys?.openai;

    if (!geminiKey && !openaiKey && !settings.apiKeys?.openrouter) {
      setVoiceErrors(["Set Gemini, OpenAI, or OpenRouter API key in Settings"]);
      return;
    }

    const activeVoice = getActiveVoiceName();

    setShowVoiceModal(false);
    setIsGenerating(true);
    setVoiceErrors([]);
    setVoiceProgress(`Generating voices... (${voiceEngine === "clone" ? "Clone" : `${activeVoice} / ${voiceEngine}`} / speed ${voiceSpeed}x)`);

    try {
      const scenes = script.scenes.map((s, i) => ({
        id: s.id || i + 1,
        type: s.type || s.section || "core",
        text: s.narration,
      }));

      const res = await fetch("/api/generate-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenes,
          geminiKey,
          openaiKey,
          openrouterKey: settings.apiKeys?.openrouter,
          projectId: project.id,
          category: project.category || "health",
          gender: voiceGender,
          voiceStyle,
          voiceName: selectedVoiceName || undefined,
          speed: voiceSpeed,
          language: settings.channel?.language || "ko",
          isAnimation: true,
          engine: voiceEngine,
          fishApiKey: settings.apiKeys?.fishaudio,
          fishModelId: voiceEngine === "clone" ? (project?.voice_preset_snapshot?.fishModelId || process.env.NEXT_PUBLIC_FISH_VOICE_ID || "") : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Voice generation failed");

      const updated = { ...script };
      const errors: string[] = [];

      for (const result of data.results) {
        const idx = result.sceneId - 1;
        if (result.success && updated.scenes[idx]) {
          updated.scenes[idx] = {
            ...updated.scenes[idx],
            audioUrl: result.audioUrl,
            model: result.model,
          };
        } else if (!result.success) {
          errors.push(`Scene ${result.sceneId}: ${result.error}`);
        }
      }

      setScript(updated);
      setVoiceErrors(errors);
      setVoiceProgress(
        `Done! ${data.summary.success}/${data.summary.total} voices (${voiceEngine === "clone" ? "Clone" : data.summary.voiceName} / ${voiceEngine} / ${voiceSpeed}x)`
      );

      await saveProject({
        ...project,
        status: "tts",
        voice_preset_snapshot: {
          ...(project as any).voice_preset_snapshot,
          speed: voiceSpeed,
          provider: voiceEngine === "google" ? "gemini" : voiceEngine,
        },
      });
      localStorage.setItem(
        `reelzfactory_script_${project.id}`,
        JSON.stringify(updated)
      );
    } catch (err: any) {
      setVoiceErrors([err.message]);
      setVoiceProgress("");
    } finally {
      setIsGenerating(false);
    }
  }, [script, project, voiceStyle, voiceGender, voiceSpeed, selectedVoiceName, getActiveVoiceName, setScript]);

  return {
    isGenerating,
    voiceProgress,
    voiceErrors,
    generateVoices,
    getActiveVoiceName,
    getVoiceSource,
    getCategoryVoices,
    showVoiceModal,
    setShowVoiceModal,
    voiceStyle,
    setVoiceStyle,
    voiceGender,
    setVoiceGender,
    voiceSpeed,
    setVoiceSpeed,
    selectedVoiceName,
    setSelectedVoiceName,
    voiceTab,
    setVoiceTab,
    voiceEngine,
    setVoiceEngine,
  };
}