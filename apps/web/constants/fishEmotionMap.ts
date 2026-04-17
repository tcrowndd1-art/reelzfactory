// ============================================================
// C:\Dev\reelzfactory\apps\web\constants\fishEmotionMap.ts
// Fish Audio S2 감정 태그 매핑 — sceneType/emotionLevel → Fish 태그
// ============================================================

/** Fish Audio S2 감정 태그 (텍스트 앞에 삽입) */
export type FishEmotionTag =
  | "(excited)" | "(surprised)" | "(confident)" | "(calm)"
  | "(curious)" | "(enthusiastic)" | "(determined)" | "(urgent)"
  | "(whispering)" | "(shouting)" | "(laughing)" | "(serious)"
  | "(warm)" | "(cheerful)" | "(dramatic)";

/** 씬 타입 → Fish 감정 태그 기본 매핑 */
export const SCENE_TYPE_EMOTION_MAP: Record<string, FishEmotionTag> = {
  hook: "(excited)",
  situation: "(calm)",
  promise: "(confident)",
  core: "(confident)",
  core_personal: "(warm)",
  twist: "(surprised)",
  twist_personal: "(surprised)",
  cta: "(determined)",
};

/** emotionLevel(1~10) → Fish 감정 태그 매핑 (씬 타입이 없을 때 fallback) */
export const EMOTION_LEVEL_MAP: Record<number, FishEmotionTag> = {
  1: "(calm)",
  2: "(calm)",
  3: "(curious)",
  4: "(curious)",
  5: "(confident)",
  6: "(enthusiastic)",
  7: "(excited)",
  8: "(excited)",
  9: "(dramatic)",
  10: "(shouting)",
};

/** 카테고리별 씬 타입 오버라이드 */
export const CATEGORY_EMOTION_OVERRIDE: Record<string, Partial<Record<string, FishEmotionTag>>> = {
  health: {
    core: "(warm)",
    twist: "(serious)",
  },
  economy: {
    hook: "(cheerful)",
    core: "(confident)",
    twist: "(dramatic)",
  },
  psychology: {
    hook: "(curious)",
    core: "(calm)",
    twist: "(surprised)",
  },
  invest: {
    hook: "(urgent)",
    core: "(serious)",
    twist: "(dramatic)",
  },
  hotissue: {
    hook: "(shouting)",
    core: "(enthusiastic)",
    twist: "(surprised)",
  },
};

/**
 * 씬 정보로부터 Fish Audio 감정 태그를 결정한다.
 * 우선순위: 카테고리 오버라이드 > 씬 타입 매핑 > emotionLevel 매핑 > 기본값
 */
export function resolveFishEmotion(
  sceneType: string,
  emotionLevel?: number,
  category?: string,
): FishEmotionTag {
  // 1. 카테고리 오버라이드
  if (category && CATEGORY_EMOTION_OVERRIDE[category]?.[sceneType]) {
    return CATEGORY_EMOTION_OVERRIDE[category][sceneType] as FishEmotionTag;
  }

  // 2. 씬 타입 기본 매핑
  if (SCENE_TYPE_EMOTION_MAP[sceneType]) {
    return SCENE_TYPE_EMOTION_MAP[sceneType];
  }

  // 3. emotionLevel 매핑
  if (emotionLevel !== undefined && emotionLevel >= 1 && emotionLevel <= 10) {
    return EMOTION_LEVEL_MAP[emotionLevel];
  }

  // 4. 기본값
  return "(confident)";
}

/**
 * 대본 텍스트에 Fish 감정 태그를 주입한다.
 * 예: "(excited) 마늘 한 쪽만 먹어도 혈관이 이렇게 변합니다!"
 */
export function injectFishEmotion(
  text: string,
  sceneType: string,
  emotionLevel?: number,
  category?: string,
): string {
  const tag = resolveFishEmotion(sceneType, emotionLevel, category);
  return `${tag} ${text}`;
}
