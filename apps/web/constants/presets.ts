// constants/presets.ts — 채널 기본 프리셋

export const DEFAULT_VOICE_PRESET = {
  style: "cognitive_gap",
  gender: "male",
  voiceName: "Charon",
  speed: 1.0,
  provider: "gemini",
};

export const DEFAULT_IMAGE_PRESET = {
  style: "logic-sketch" as const,
  colorScheme: "dark",
  characterEnabled: false,
  promptPrefix: "",
  aspectRatio: "9:16",
  engine: "flux-pro" as const,
  knowledge_c: "",   // C지침서: Visual DNA+씬 프롬프트
  visual_dna: "",    // 레퍼런스 이미지 텍스트 설명
};

export const DEFAULT_SUBTITLE_PRESET = {
  fontFamily: "'Pretendard Variable', 'Pretendard', 'Inter', sans-serif",
  fontSize: 52,
  fontWeight: 800,
  textColor: "#FFFFFF",
  strokeColor: "#000000",
  strokeWidth: 3,
  bgColor: "rgba(0, 0, 0, 0.55)",
  bgPadding: "8px 20px",
  bgBorderRadius: 8,
  position: "bottom" as const,
  positionY: 67,
  maxWidth: 82,
  maxWordsPerLine: 5,
  maxLines: 2,
  animation: "popIn" as const,
  animationFrames: 5,
  highlightColor: "#FFD700",
  highlightStyle: "background" as const,
};

export const DEFAULT_RENDER_PRESET = {
  transitions: ["fade", "kenBurns"],
  motionIntensity: "medium" as const,
  musicStyle: "ambient" as const,
  fps: 30,
  resolution: { width: 1080, height: 1920 },
};
