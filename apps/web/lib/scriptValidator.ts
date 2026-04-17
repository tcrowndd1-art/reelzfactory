// apps/web/lib/scriptValidator.ts
// Layer 1: 코드 기반 대본 검증 (0원, 즉시, 100% 정확)

// --- 타입 정의 ---

interface ScriptScene {
  id: number;
  beat: string;
  text: string;
  imagePrompt: string;
  durationEstimate: number;
  subtitleEmphasis?: string[];
  transition?: string;
  emotionLevel?: number;
  ctaType?: string;
}

interface ScriptMetadata {
  title: string;
  headline?: { line1: string; line2: string };
  description?: string;
  tags?: string[];
  hashtags?: string[];
  thumbnail?: { text: string; imagePrompt: string };
}

interface ScriptJSON {
  title?: string;
  format?: string;
  category?: string;
  totalScenes?: number;
  scenes: ScriptScene[];
  metadata: ScriptMetadata;
}

interface ValidationIssue {
  level: "fatal" | "critical" | "warning";
  rule: string;
  scene?: number;
  found: string;
  fix?: string;
}

interface ValidationResult {
  verdict: "PASS" | "REVISE" | "REJECT";
  issues: ValidationIssue[];
  summary: {
    fatal: number;
    critical: number;
    warning: number;
  };
  reviseInstructions?: string;
}

// --- 상수 ---

const FORBIDDEN_ENDINGS = /(?:고요|겁니다|까요|네요|는요)[!]?\s*$/;

const GREETING_PATTERNS = /^(?:안녕하세요|여러분|오늘은|반갑습니다|구독|좋아요|알림|저는|제 채널)/;

const ALLOWED_ENDING_SIGNATURES = [
  /때문입니다[!]?\s*$/,
  /뜻이죠[!]?\s*$/,
  /셈입니다[!]?\s*$/,
  /수밖에 없습니다[!]?\s*$/,
  // 해라체 (INFO-DOCU, MONKEY 등)
  /때문이다[!.]?\s*$/,
  /수밖에 없다[!.]?\s*$/,
  /셈이다[!.]?\s*$/,
  /뿐이다[!.]?\s*$/,
  /아닌가[?]?\s*$/,
  /것이다[!.]?\s*$/,
  /이유다[!.]?\s*$/,
  // 멍키경제 채널 시그니처
  /쫓아라[!.]?\s*$/,
  /만나자[!.]?\s*$/,
  // A지침서 OUTRO 스타일
  /남겨뒀어요[.]?\s*$/,
  /남겨뒀습니다[.]?\s*$/,
  /남겨놨어요[.]?\s*$/,
  /남겨놨습니다[.]?\s*$/,
  /확인해보세요[.]?\s*$/,
  /확인해 보세요[.]?\s*$/,
  /컨퍼합니다[.]?\s*$/,
  /정리해뒀습니다[.]?\s*$/,
  /정리해뒀어요[.]?\s*$/,
  /것인가[?.]?\s*$/,
  /않을 것인가[?.]?\s*$/,
  /보시겠습니까[?.]?\s*$/,
  /드릴게요[.]?\s*$/,
  /드리겠습니다[.]?\s*$/,
  /conferir[.]?\s*$/,
  /comentários[.]?\s*$/,
];

const KOREAN_CHAR = /[가-힣]/;

const MIN_IMAGE_PROMPT_LENGTH = 80;

const VALID_CTA_TYPES = ["A", "B", "C", "D"];

const VALID_BEATS = ["hook", "situation", "promise", "core", "core_personal", "twist", "cta"];

// --- 검증 함수 ---

function extractEnding(text: string): string {
  const cleaned = text.replace(/[!?\s]+$/, "");
  const match = cleaned.match(/[가-힣]+$/);
  return match ? match[0] : "";
}

function isSameEndingFamily(ending1: string, ending2: string): boolean {
  const declarative = /(?:입니다|합니다|됩니다|아닙니다|습니다)$/;
  const connective = /(?:인데요|는데요|하죠|거죠|이죠|뜻이죠)$/;

  const is1Declarative = declarative.test(ending1);
  const is1Connective = connective.test(ending1);
  const is2Declarative = declarative.test(ending2);
  const is2Connective = connective.test(ending2);

  if (is1Declarative && is2Declarative) return true;
  if (is1Connective && is2Connective) return true;
  return false;
}

// --- 메인 검증 ---
const CHANNEL_SPECIFIC_RULES = new Set([
  "ending_signature", "consecutive_ending", "greeting_opening",
  "forbidden_ending", "soft_forbidden_ending", "emotion_flat",
  "punctuation_period", "emotion_word_text", "title_emotion_word",
  "punctuation_comma", "banned_phrase",
]);
export function validateScript(script: ScriptJSON, mode: "shorts" | "longform" = "shorts", options?: { skipChannelRules?: boolean }): ValidationResult {
  const issues: ValidationIssue[] = [];

  // ==================
  // FATAL 검증
  // ==================

  // F1: JSON 스키마 필수 필드 누락
  if (!script.scenes || !Array.isArray(script.scenes) || script.scenes.length === 0) {
    issues.push({
      level: "fatal",
      rule: "schema_missing_scenes",
      found: "scenes 배열이 없거나 비어있음",
    });
  }

  if (!script.metadata?.title) {
    issues.push({
      level: "fatal",
      rule: "schema_missing_title",
      found: "metadata.title이 없음",
    });
  }

  if (!script.metadata?.tags || script.metadata.tags.length === 0) {
    issues.push({
      level: "fatal",
      rule: "schema_missing_tags",
      found: "metadata.tags가 없거나 비어있음",
    });
  }

  for (const scene of script.scenes) {
    if (!scene.text) {
      issues.push({
        level: "fatal",
        rule: "schema_missing_text",
        scene: scene.id,
        found: `씬 ${scene.id}: text 필드 없음`,
      });
    }
    if (!scene.imagePrompt) {
      issues.push({
        level: "fatal",
        rule: "schema_missing_imagePrompt",
        scene: scene.id,
        found: `씬 ${scene.id}: imagePrompt 필드 없음`,
      });
    }
    if (!scene.beat) {
      issues.push({
        level: "fatal",
        rule: "schema_missing_beat",
        scene: scene.id,
        found: `씬 ${scene.id}: beat 필드 없음`,
      });
    }
  }

  // F2: 첫 씬 인사/소개 패턴
  if (script.scenes.length > 0 && script.scenes[0].text) {
    if (GREETING_PATTERNS.test(script.scenes[0].text.trim())) {
      issues.push({
        level: "fatal",
        rule: "greeting_opening",
        scene: 1,
        found: script.scenes[0].text.substring(0, 50),
      });
    }
  }

  // F3: 금지 어미 존재
  for (const scene of script.scenes) {
    if (scene.text && FORBIDDEN_ENDINGS.test(scene.text)) {
      issues.push({
        level: "fatal",
        rule: "forbidden_ending",
        scene: scene.id,
        found: `씬 ${scene.id}: "${scene.text.slice(-20)}"`,
      });
    }
  }
  // F4: "알고 계셨나요" 금기 패턴 — 전체 씬 스캔
  const BANNED_PHRASES = /알고 계셨나요|알고 계셨습니까|알고 있었나요/;
  for (const scene of script.scenes) {
    if (scene.text && BANNED_PHRASES.test(scene.text)) {
      issues.push({
        level: "fatal",
        rule: "banned_phrase",
        scene: scene.id,
        found: `씬 ${scene.id}: "${scene.text.substring(0, 40)}"`,
      });
    }
  }
  // FATAL 판정: 1개라도 있으면 즉시 REJECT
  const fatalCount = issues.filter((i) => i.level === "fatal").length;
  if (fatalCount > 0) {
    return {
      verdict: "REJECT",
      issues,
      summary: { fatal: fatalCount, critical: 0, warning: 0 },
    };
  }

  // ==================
  // CRITICAL 검증
  // ==================

  // C1: 엔딩 어미 위반
  if (!options?.skipChannelRules && script.scenes.length > 0) {
    const lastScene = script.scenes[script.scenes.length - 1];
    if (lastScene.text) {
      const matchesSignature = ALLOWED_ENDING_SIGNATURES.some((regex) =>
        regex.test(lastScene.text)
      );
      if (!matchesSignature) {
        issues.push({
          level: "warning",
          rule: "ending_signature",
          scene: lastScene.id,
          found: `마지막 씬: "${lastScene.text.slice(-30)}"`,
          fix: "마지막 문장을 ~때문입니다! / ~뜻이죠! / ~셈입니다! / ~수밖에 없습니다! 중 하나로 변경",
        });
      }
    }
  }

  // C2: 동일 어미 연속 반복
  for (let i = 0; i < script.scenes.length - 1; i++) {
    const current = script.scenes[i];
    const next = script.scenes[i + 1];
    if (current.text && next.text) {
      const ending1 = extractEnding(current.text);
      const ending2 = extractEnding(next.text);
      if (ending1 && ending2 && isSameEndingFamily(ending1, ending2)) {
        issues.push({
          level: "critical",
          rule: "consecutive_ending",
          scene: next.id,
          found: `씬 ${current.id}("${ending1}") → 씬 ${next.id}("${ending2}") 같은 계열 연속`,
          fix: "연속된 씬의 어미를 선언형↔연결형으로 교차",
        });
      }
    }
  }

  // C3: imagePrompt 길이 부족
  for (const scene of script.scenes) {
    if (scene.imagePrompt && scene.imagePrompt.length < MIN_IMAGE_PROMPT_LENGTH) {
      issues.push({
        level: "critical",
        rule: "imagePrompt_too_short",
        scene: scene.id,
        found: `씬 ${scene.id}: imagePrompt ${scene.imagePrompt.length}자 (최소 ${MIN_IMAGE_PROMPT_LENGTH}자)`,
        fix: "주체, 행동, 배경, 조명, 카메라 앵글 5요소를 포함하여 2줄 이상으로 확장",
      });
    }
  }

  // C4: imagePrompt 한국어 포함
  for (const scene of script.scenes) {
    if (scene.imagePrompt && KOREAN_CHAR.test(scene.imagePrompt)) {
      issues.push({
        level: "critical",
        rule: "imagePrompt_korean",
        scene: scene.id,
        found: `씬 ${scene.id}: imagePrompt에 한국어 포함`,
        fix: "imagePrompt를 영어로만 작성",
      });
    }
  }

  // C5: CTA 누락
  if (mode === "shorts" && script.scenes.length > 0) {
    const lastScene = script.scenes[script.scenes.length - 1];
    if (!lastScene.ctaType || !VALID_CTA_TYPES.includes(lastScene.ctaType)) {
      issues.push({
        level: "critical",
        rule: "cta_missing",
        scene: lastScene.id,
        found: `마지막 씬: ctaType이 없거나 A/B/C/D가 아님`,
        fix: "마지막 씬에 ctaType: A/B/C/D 중 하나 추가",
      });
    }
  }

  // C6: emotionLevel 단조
  const emotionLevels = script.scenes
    .map((s) => s.emotionLevel)
    .filter((e): e is number => typeof e === "number");

  if (emotionLevels.length >= 3) {
    const maxEmotion = Math.max(...emotionLevels);
    const minEmotion = Math.min(...emotionLevels);
    if (maxEmotion - minEmotion < 3) {
      issues.push({
        level: "critical",
        rule: "emotion_flat",
        found: `emotionLevel 범위: ${minEmotion}~${maxEmotion} (차이 ${maxEmotion - minEmotion}, 최소 3 필요)`,
        fix: "감정 곡선에 변화를 줄 것: 훅은 높게, 상황은 낮게, 반전은 최대로",
      });
    }
  }

  // C7: 제목 길이
  if (script.metadata?.title) {
    const titleLen = script.metadata.title.length;
    if (titleLen < 10 || titleLen > 50) {
      issues.push({
        level: "critical",
        rule: "title_length",
        found: `제목 ${titleLen}자 (10~50자 범위 밖)`,
        fix: "제목을 10~50자 사이로 조정",
      });
    }
  }
  // C8: beat 다양성 — shorts에서 hook/cta 필수 + 전부 동일 금지 + twist 필수
  if (mode === "shorts" && script.scenes.length > 0) {
    const beats = script.scenes.map((s) => s.beat);
    const uniqueBeats = new Set(beats);

    if (uniqueBeats.size === 1) {
      issues.push({
        level: "fatal",
        rule: "beat_all_same",
        found: `모든 씬의 beat가 "${beats[0]}"으로 동일 — 감정 곡선 불가`,
        fix: "hook → situation → promise → core → twist → cta 배분 필요",
      });
    }
    if (!beats.includes("hook")) {
      issues.push({
        level: "critical",
        rule: "missing_hook",
        found: "hook beat가 없음 — 첫 씬은 반드시 hook이어야 함",
        fix: "첫 씬의 beat를 hook으로 변경",
      });
    }
    if (!beats.includes("cta")) {
      issues.push({
        level: "critical",
        rule: "missing_cta",
        found: "cta beat가 없음 — 마지막 씬은 반드시 cta여야 함",
        fix: "마지막 씬의 beat를 cta로 변경하고 CTA 유형 적용",
      });
    }
    if (!beats.includes("twist") && script.scenes.length >= 5) {
      issues.push({
        level: "critical",
        rule: "missing_twist",
        found: "twist beat가 없음 — 5씬 이상에서 반전 필수",
        fix: "씬 4~5에 twist beat 추가",
      });
    }
  }

  // C9: 구두점 — 마침표 과다 사용 체크 (완전 금지 아님)
  if (!options?.skipChannelRules) {
    for (const scene of script.scenes) {
      if (scene.text) {
        const periodCount = (scene.text.match(/\./g) || []).length;
        if (periodCount >= 3) {
          issues.push({
            level: "warning",
            rule: "punctuation_period",
            scene: scene.id,
            found: `씬 ${scene.id}: 마침표 ${periodCount}개 — 마침표 과다 사용`,
            fix: "마침표를 줄이고 구어체 어미(~거든요, ~잖아요, ~인데요)로 변환 권장",
          });
        }
      }
    }
  }

  // C10: 금지 어미 보강 — "~나요?" "~까요?" "~죠?" (물음표 질문형만)
  const SOFT_FORBIDDEN = /[나까]요[?]?\s*$|죠[?]\s*$/;
  for (const scene of script.scenes) {
    if (scene.text && SOFT_FORBIDDEN.test(scene.text.trim())) {
      issues.push({
        level: "critical",
        rule: "soft_forbidden_ending",
        scene: scene.id,
        found: `씬 ${scene.id}: "${scene.text.trim().slice(-15)}" — 금지 어미 패턴`,
        fix: "선언형(~입니다!/~합니다!) 또는 연결형(~는데요!/~이죠!) 어미로 교체",
      });
    }
  }

  // C11: 제목 감정 단어 탐지
  const EMOTION_WORDS = /충격|소름|대박|경악|놀라운|미친|헐|레전드|ㄷㄷ/;
  if (script.metadata?.title && EMOTION_WORDS.test(script.metadata.title)) {
    issues.push({
      level: "critical",
      rule: "title_emotion_word",
      found: `제목에 감정 단어 포함: "${script.metadata.title}"`,
      fix: "감정 단어 제거 — 팩트 자체로 충격을 줘야 함",
    });
  }

  // C11-b: 대본 본문 감정 단어 탐지
  for (const scene of script.scenes) {
    if (scene.text && EMOTION_WORDS.test(scene.text)) {
      const match = scene.text.match(EMOTION_WORDS);
      issues.push({
        level: "critical",
        rule: "emotion_word_text",
        scene: scene.id,
        found: `씬 ${scene.id}: 감정 단어 "${match?.[0]}" 발견`,
        fix: "감정 단어를 삭제하고 팩트 자체로 충격을 주도록 수정",
      });
    }
  }

  // C12: 쉼표 과다 사용 체크 (완전 금지 아님)
  if (!options?.skipChannelRules) {
    for (const scene of script.scenes) {
      if (scene.text) {
        const commaCount = (scene.text.match(/,/g) || []).length;
        if (commaCount >= 3) {
          issues.push({
            level: "warning",
            rule: "punctuation_comma",
            scene: scene.id,
            found: `씬 ${scene.id}: 쉼표 ${commaCount}개 — 쉼표 과다 사용`,
            fix: "쉼표를 줄이고 문장을 분리하거나 조사로 연결",
          });
        }
      }
    }
  }
  // ==================
  // WARNING 검증
  // ==================

  // W1: 태그 수 부족
  if (script.metadata?.tags && script.metadata.tags.length < 10) {
    issues.push({
      level: "warning",
      rule: "tags_insufficient",
      found: `태그 ${script.metadata.tags.length}개 (최소 10개 권장)`,
    });
  }

  // W2: 해시태그 수 부족
  if (script.metadata?.hashtags && script.metadata.hashtags.length < 5) {
    issues.push({
      level: "warning",
      rule: "hashtags_insufficient",
      found: `해시태그 ${script.metadata.hashtags.length}개 (최소 5개 권장)`,
    });
  }

  // W3: 씬 수 범위
  if (mode === "shorts") {
    const sceneCount = script.scenes.length;
    if (sceneCount < 5 || sceneCount > 8) {
      issues.push({
        level: "warning",
        rule: "scene_count_range",
        found: `씬 ${sceneCount}개 (숏폼 권장 5~8개)`,
      });
    }
  }

  // W4: 총 길이 범위
  const totalDuration = script.scenes.reduce(
    (sum, s) => sum + (s.durationEstimate || 0),
    0
  );
  if (mode === "shorts" && (totalDuration < 20 || totalDuration > 65)) {
    issues.push({
      level: "warning",
      rule: "duration_range",
      found: `총 ${totalDuration.toFixed(1)}초 (숏폼 권장 20~65초)`,
    });
  }

  // ==================
  // 판정
  // ==================
  // skipChannelRules: 마스터 프롬프트 채널은 톤/어미 규칙 건너뜀
  const filteredIssues = options?.skipChannelRules
    ? issues.filter((i: ValidationIssue) => !CHANNEL_SPECIFIC_RULES.has(i.rule))
    : issues;
  const criticalCount = filteredIssues.filter((i) => i.level === "critical").length;
  const warningCount = filteredIssues.filter((i) => i.level === "warning").length;

  let verdict: "PASS" | "REVISE" | "REJECT";
  let reviseInstructions: string | undefined;

  if (criticalCount >= 2) {
    verdict = "REVISE";
    const criticalIssues = filteredIssues.filter((i) => i.level === "critical");
    reviseInstructions = criticalIssues
      .map((i) => `[${i.rule}] ${i.found} → ${i.fix || "수정 필요"}`)
      .join("\n");
  } else {
    verdict = "PASS";
  }

  return {
    verdict,
    issues: filteredIssues,
    summary: { fatal: 0, critical: criticalCount, warning: warningCount },
    reviseInstructions,
  };
}

