// ============================================================
// C:\Dev\reelzfactory\apps\web\constants\voiceConfig.ts
// 보이스 설정 상수 — 데이터만, 로직 없음
// ============================================================

import type { VoiceStyle, VoiceOption, VoiceInfo, StepConfig, Step } from "@/types/pipeline";

// ===== Pipeline Step 탭 설정 =====
export const PIPELINE_STEPS: StepConfig[] = [
  { key: "script", label: "1. Script", icon: "📝" },
  { key: "tts", label: "2. Voice", icon: "🎤" },
  { key: "storyboard", label: "3. Storyboard", icon: "🖼️" },
  { key: "render", label: "4. Render", icon: "🎬" },
  { key: "upload", label: "5. Upload", icon: "📤" },
];

// ===== Voice Style (애니메이션 3종) =====
export const VOICE_STYLES: VoiceStyle[] = [
  { id: "cognitive_gap", label: "Authority (권위형)", desc: "깊고 차분한 멘토", maleVoice: "Charon", femaleVoice: "Kore", speed: 0.95 },
  { id: "provocateur", label: "Provocateur (팩폭형)", desc: "빠르고 도발적, 에너지틱", maleVoice: "Puck", femaleVoice: "Leda", speed: 1.15 },
  { id: "gravity", label: "Gravity (CEO형)", desc: "극도로 느리고 무거운", maleVoice: "Orus", femaleVoice: "Aoede", speed: 0.85 },
];

// ===== 카테고리별 보이스 옵션 (남녀 각 3개) =====
export const VOICE_OPTIONS: Record<string, {
  male: VoiceOption[];
  female: VoiceOption[];
}> = {
  shopping_tech: {
    male: [{ voiceName: "Fenrir", label: "흥분형 언박서" }, { voiceName: "Puck", label: "밝은 에너지" }, { voiceName: "Charon", label: "차분한 분석가" }],
    female: [{ voiceName: "Leda", label: "밝고 트렌디" }, { voiceName: "Kore", label: "단단한 전문가" }, { voiceName: "Aoede", label: "경쾌한 리뷰어" }],
  },
  shopping_home: {
    male: [{ voiceName: "Puck", label: "밝은 실용파" }, { voiceName: "Charon", label: "신뢰형 전문가" }, { voiceName: "Fenrir", label: "열정 리뷰어" }],
    female: [{ voiceName: "Kore", label: "실용 리뷰어" }, { voiceName: "Sulafat", label: "따뜻한 이웃" }, { voiceName: "Leda", label: "밝은 에너지" }],
  },
  shopping_beauty: {
    male: [{ voiceName: "Puck", label: "밝은 에너지" }, { voiceName: "Enceladus", label: "속삭임 ASMR" }, { voiceName: "Fenrir", label: "흥분형" }],
    female: [{ voiceName: "Leda", label: "밝은 인플루언서" }, { voiceName: "Aoede", label: "경쾌한 뷰티" }, { voiceName: "Achernar", label: "부드러운 톤" }],
  },
  shopping_health: {
    male: [{ voiceName: "Charon", label: "신뢰형 전문가" }, { voiceName: "Algieba", label: "부드러운 어드바이저" }, { voiceName: "Rasalgethi", label: "정보 전달형" }],
    female: [{ voiceName: "Sulafat", label: "따뜻한 전문가" }, { voiceName: "Kore", label: "단단한 신뢰" }, { voiceName: "Vindemiatrix", label: "부드러운 상담" }],
  },
  shopping_fashion: {
    male: [{ voiceName: "Puck", label: "밝은 스타일" }, { voiceName: "Zubenelgenubi", label: "캐주얼 톤" }, { voiceName: "Achird", label: "친근한 톤" }],
    female: [{ voiceName: "Aoede", label: "경쾌한 패셔니스타" }, { voiceName: "Leda", label: "밝고 트렌디" }, { voiceName: "Despina", label: "부드러운 스타일" }],
  },
  shopping_food: {
    male: [{ voiceName: "Puck", label: "밝은 푸디" }, { voiceName: "Fenrir", label: "흥분형 먹방" }, { voiceName: "Achird", label: "친근한 맛집" }],
    female: [{ voiceName: "Kore", label: "에너지 푸디" }, { voiceName: "Leda", label: "밝은 리뷰어" }, { voiceName: "Sulafat", label: "따뜻한 감성" }],
  },
  health: {
    male: [{ voiceName: "Charon", label: "신뢰형 전문가" }, { voiceName: "Algieba", label: "부드러운 어드바이저" }, { voiceName: "Rasalgethi", label: "정보 전달형" }],
    female: [{ voiceName: "Sulafat", label: "따뜻한 전문가" }, { voiceName: "Kore", label: "단단한 신뢰" }, { voiceName: "Vindemiatrix", label: "부드러운 상담" }],
  },
  shorts_default: {
    male: [{ voiceName: "Puck", label: "밝은 에너지" }, { voiceName: "Fenrir", label: "흥분형" }, { voiceName: "Charon", label: "차분한 톤" }],
    female: [{ voiceName: "Kore", label: "단단한 크리에이터" }, { voiceName: "Leda", label: "밝은 에너지" }, { voiceName: "Aoede", label: "경쾌한 톤" }],
  },
  longform_default: {
    male: [{ voiceName: "Charon", label: "다큐 나레이터" }, { voiceName: "Algieba", label: "부드러운 톤" }, { voiceName: "Schedar", label: "균형잡힌 톤" }],
    female: [{ voiceName: "Sulafat", label: "따뜻한 나레이터" }, { voiceName: "Vindemiatrix", label: "부드러운 톤" }, { voiceName: "Gacrux", label: "성숙한 톤" }],
  },
};

// ===== Gemini TTS 전체 보이스 목록 (직접 선택용) =====
export const ALL_VOICES: VoiceInfo[] = [
  { name: "Zephyr", desc: "밝고 경쾌한", gender: "female" },
  { name: "Puck", desc: "에너지틱한", gender: "male" },
  { name: "Charon", desc: "깊고 권위있는", gender: "male" },
  { name: "Kore", desc: "단단하고 신뢰감", gender: "female" },
  { name: "Fenrir", desc: "힘있고 열정적", gender: "male" },
  { name: "Leda", desc: "밝고 당당한", gender: "female" },
  { name: "Orus", desc: "극도로 깊은", gender: "male" },
  { name: "Aoede", desc: "우아하고 풍부한", gender: "female" },
  { name: "Callirrhoe", desc: "부드럽고 자연스러운", gender: "female" },
  { name: "Autonoe", desc: "차분하고 안정적", gender: "female" },
  { name: "Enceladus", desc: "속삭이는 ASMR", gender: "male" },
  { name: "Iapetus", desc: "무게감 있는", gender: "male" },
  { name: "Umbriel", desc: "중립적이고 깔끔한", gender: "male" },
  { name: "Algieba", desc: "부드러운 톤", gender: "male" },
  { name: "Despina", desc: "가벼운 스타일", gender: "female" },
  { name: "Sulafat", desc: "따뜻한", gender: "female" },
  { name: "Vindemiatrix", desc: "부드러운 상담", gender: "female" },
  { name: "Achernar", desc: "부드러운", gender: "female" },
  { name: "Zubenelgenubi", desc: "캐주얼한", gender: "male" },
  { name: "Achird", desc: "친근한", gender: "male" },
  { name: "Rasalgethi", desc: "정보 전달형", gender: "male" },
  { name: "Schedar", desc: "균형잡힌", gender: "male" },
  { name: "Gacrux", desc: "성숙한", gender: "female" },
  { name: "Sadachbia", desc: "따뜻하고 밝은", gender: "male" },
];

// ===== 헬퍼: 카테고리 키 결정 =====
export function getVoiceOptionKey(category: string, mode: string): string {
  if (category.startsWith("shopping_")) return category;
  if (VOICE_OPTIONS[category]) return category;
  return mode === "longform" ? "longform_default" : "shorts_default";
}
