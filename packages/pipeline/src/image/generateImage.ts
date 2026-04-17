import * as fal from '@fal-ai/serverless-client';
import * as dotenv from 'dotenv';
dotenv.config();

fal.config({
  credentials: process.env.FAL_KEY!,
});

// ============================================================
// 기본 내장 스타일 (Supabase에 프리셋 없을 때 폴백)
// ============================================================
const DEFAULT_STYLE = 'whiteboard animation style, white background, simple clean illustration, black outlines, limited color palette, clean and modern';

const CATEGORY_ACCENT: Record<string, string> = {
  invest: 'money and investment icons, green and gold accents',
  trading: 'stock chart and trading icons, red and green accents',
  psychology: 'brain and emotion icons, purple and blue accents',
  health: 'wellness and body icons, green and orange accents',
  economy: 'economy and news icons, blue and gold accents',
  ai_trend: 'robot and tech icons, cyan and purple accents',
  travel: 'travel and culture icons, warm vibrant accents',
  quotes: 'minimal elegant design, soft tone accents',
  old_tales: 'traditional Korean elements, warm earth tone accents',
  default: 'general topic icons, neutral accents',
};

// 캐릭터 등장 여부를 판단하는 키워드
const CHARACTER_KEYWORDS = [
  '사람', '인물', '캐릭터', '남자', '여자', '소년', '소녀',
  '서있', '앉아', '들고', '보고', '말하', '웃고', '울고',
  'person', 'character', 'man', 'woman', 'boy', 'girl',
  'standing', 'sitting', 'holding', 'looking', 'talking',
  '전문가', '분석가', '투자자', '선생', '의사', '주인공',
];

// ============================================================
// 타입 정의
// ============================================================
export interface StylePreset {
  name: string;
  basePrompt: string;
  categoryOverrides?: Record<string, string>;
  characterPromptSuffix?: string;
  noCharacterPromptSuffix?: string;
}

export interface ImageOptions {
  prompt: string;
  width?: number;
  height?: number;
  category?: string;
  sceneType?: string;
  characterRefUrl?: string;
  stylePreset?: StylePreset;
  forceNoCharacter?: boolean;
  videoType?: 'shorts' | 'longform';
}

// ============================================================
// 메인 이미지 생성 함수
// ============================================================
export async function generateImage(options: ImageOptions): Promise<string> {
  const {
    prompt,
    width,
    height,
    videoType = 'shorts',
    category = 'default',
    sceneType = 'content',
    characterRefUrl,
    stylePreset,
    forceNoCharacter = false,
  } = options;

  // fal.ai Flux 모델은 1080×1920 (9:16) 지원
  const finalWidth = width ?? (videoType === 'shorts' ? 1080 : 1920);
  const finalHeight = height ?? (videoType === 'shorts' ? 1920 : 1080);

  // 1. 캐릭터 등장 여부 판단
  const needsCharacter = !forceNoCharacter && hasCharacterInPrompt(prompt);
  const hasReference = !!characterRefUrl;
  const useKontext = needsCharacter && hasReference;

  // 2. 모델 선택 (fal.ai 엔드포인트)
  const modelId = useKontext
    ? 'fal-ai/flux-pro/kontext'
    : 'fal-ai/flux-2-pro';

  // 3. 스타일 구성
  const baseStyle = stylePreset
    ? (stylePreset.categoryOverrides?.[category] || stylePreset.basePrompt)
    : `${DEFAULT_STYLE}, ${CATEGORY_ACCENT[category] || CATEGORY_ACCENT.default}`;

  // 4. 장면 타입별 무드
  const moodBoost = getMoodBoost(sceneType);

  // 5. 프롬프트 조합
  let fullPrompt: string;

  if (useKontext) {
    const charSuffix = stylePreset?.characterPromptSuffix
      || 'consistent character from reference image in same cartoon style, white background with scene elements as simple icons and illustrations';
    fullPrompt = `${baseStyle}, ${prompt}${moodBoost}, ${charSuffix}`;
  } else {
    const noCharSuffix = stylePreset?.noCharacterPromptSuffix
      || 'no human figures, scene depicted with simple icons and flat illustrations on white background';
    fullPrompt = `${baseStyle}, ${prompt}${moodBoost}, ${noCharSuffix}`;
  }

  // 6. 빈 이미지 방지
  fullPrompt += ', high quality, sharp details, no blank space, vivid colors';

  console.log(`🎨 이미지 생성 [fal.ai/${modelId}] [${category}/${sceneType}] 캐릭터:${needsCharacter ? '✅' : '❌'}`);
  console.log(`   프롬프트: "${fullPrompt.substring(0, 100)}..."`);

  // 7. fal.ai API 호출
  try {
    const input: Record<string, any> = {
      prompt: fullPrompt,
      image_size: {
        width: finalWidth,
        height: finalHeight,
      },
      num_images: 1,
      output_format: 'jpeg',
      guidance_scale: useKontext ? 3.5 : 8.0,
      num_inference_steps: useKontext ? 28 : 32,
      negative_prompt: 'deformed, shaky, blur, text, watermark, logo, low quality, blurry',

    };

    if (useKontext && characterRefUrl) {
      input.input_image_url = characterRefUrl;
    }

    const result = await fal.subscribe(modelId, { input }) as any;

    if (result?.images?.[0]?.url) {
      const finalUrl = result.images[0].url;
      console.log(`✅ 이미지 완료: ${String(finalUrl).substring(0, 60)}...`);
      return String(finalUrl);
    }

    throw new Error(`이미지 생성 실패: output이 없음`);
  } catch (err: any) {
    console.error(`❌ 이미지 에러: ${err.message}`);
    throw err;
  }
}

// ============================================================
// 헬퍼 함수들
// ============================================================
function hasCharacterInPrompt(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return CHARACTER_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
}

function getMoodBoost(sceneType: string): string {
  switch (sceneType) {
    case 'hook':
      return ', extreme close-up, intense dramatic impact, attention-grabbing';
    case 'cta':
      return ', wide shot, epic scale, inspiring atmosphere';
    case 'twist':
      return ', dramatic reveal, high contrast, suspenseful';
    default:
      return '';
  }
}

// ============================================================
// Supabase 스타일 프리셋 로드
// ============================================================
export async function loadStylePreset(
  supabaseUrl: string,
  presetName: string
): Promise<StylePreset | null> {
  try {
    const url = `${supabaseUrl}/storage/v1/object/public/uploads/style_presets/${presetName}/config.json`;
    const response = await fetch(url);
    if (response.ok) {
      const config = await response.json() as StylePreset;
      console.log(`🎭 스타일 프리셋 로드: ${config.name}`);
      return config;
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================================
// 캐릭터 레퍼런스 URL 생성
// ============================================================
export function getCharacterRefUrl(
  supabaseUrl: string,
  userId: string,
  category: string
): string {
  return `${supabaseUrl}/storage/v1/object/public/uploads/${userId}/references/${category}/character.png`;
}

// ============================================================
// 캐릭터 레퍼런스 존재 여부 확인
// ============================================================
export async function checkCharacterRefExists(
  supabaseUrl: string,
  userId: string,
  category: string
): Promise<string | null> {
  const extensions = ['png', 'jpg', 'jpeg', 'webp'];
  for (const ext of extensions) {
    const url = `${supabaseUrl}/storage/v1/object/public/uploads/${userId}/references/${category}/character.${ext}`;
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        console.log(`📸 캐릭터 레퍼런스 발견: ${category}/character.${ext}`);
        return url;
      }
    } catch {
      continue;
    }
  }
  return null;
}
