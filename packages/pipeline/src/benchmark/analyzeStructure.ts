import OpenAI from 'openai';
import { VideoMetadata } from './extractVideo';

export interface VideoStructure {
  hookType: string;
  hookTiming: string;
  scenes: {
    order: number;
    type: string;
    duration: string;
    technique: string;
    narration: string;
  }[];
  ctaStyle: string;
  emotionFlow: string;
  totalDuration: number;
  viralElements: string[];
  summary: string;
}

export async function analyzeVideoStructure(
  meta: VideoMetadata
): Promise<VideoStructure> {
  console.log('\n━━━ 벤치마킹: AI 구조 분석 시작 ━━━');

  const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const prompt = `당신은 바이럴 숏폼 영상 구조 분석 전문가입니다.

아래 영상의 제목, 설명, 자막을 분석하여 영상의 구조를 JSON으로 추출하세요.

=== 영상 정보 ===
제목: ${meta.title}
길이: ${meta.duration}초
조회수: ${meta.viewCount?.toLocaleString()}
좋아요: ${meta.likeCount?.toLocaleString()}
설명: ${meta.description?.slice(0, 500)}

=== 자막 (전체 나레이션) ===
${meta.subtitles?.slice(0, 3000) || '(자막 없음)'}

=== 분석 요구사항 ===
1. 훅 유형 (질문형/충격형/공감형/도발형/숫자형)
2. 씬별 구조 (순서, 유형, 예상 길이, 기법, 핵심 나레이션)
3. CTA 스타일
4. 감정 흐름 (예: 충격→공감→해결→긴급)
5. 바이럴 요소 (어떤 요소가 조회수를 만들었는지)
6. 한줄 요약

반드시 아래 JSON 형식으로만 응답:
{
  "hookType": "충격형",
  "hookTiming": "0~2초",
  "scenes": [
    { "order": 1, "type": "훅", "duration": "0~3초", "technique": "감정폭발", "narration": "핵심 문장" }
  ],
  "ctaStyle": "긴급형 CTA",
  "emotionFlow": "충격→공감→해결→긴급",
  "totalDuration": ${meta.duration},
  "viralElements": ["요소1", "요소2"],
  "summary": "한줄 요약"
}`;

  const response = await openai.chat.completions.create({
    model: 'openai/gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 2000,
  });

  const text = response.choices[0]?.message?.content || '{}';

  let structure: VideoStructure;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    structure = JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch {
    console.error('⚠️ JSON 파싱 실패, 기본 구조 사용');
    structure = {
      hookType: '알 수 없음',
      hookTiming: '0~3초',
      scenes: [],
      ctaStyle: '일반',
      emotionFlow: '정보전달',
      totalDuration: meta.duration,
      viralElements: [],
      summary: meta.title,
    };
  }

  console.log(`✅ 구조 분석 완료`);
  console.log(`   훅: ${structure.hookType} (${structure.hookTiming})`);
  console.log(`   씬: ${structure.scenes?.length || 0}개`);
  console.log(`   감정흐름: ${structure.emotionFlow}`);
  console.log(`   바이럴요소: ${structure.viralElements?.join(', ')}\n`);

  return structure;
}

export function structureToKnowledgeBase(
  meta: VideoMetadata,
  structure: VideoStructure
): string {
  const scenesText = structure.scenes
    ?.map(s => `  씬${s.order} (${s.type}, ${s.duration}): ${s.technique} — "${s.narration}"`)
    .join('\n') || '';

  return `[벤치마킹 원본 분석]
제목: ${meta.title}
조회수: ${meta.viewCount?.toLocaleString()} | 좋아요: ${meta.likeCount?.toLocaleString()}
길이: ${meta.duration}초
원본 언어: ${meta.language}

[구조 분석]
훅 유형: ${structure.hookType} (${structure.hookTiming})
감정 흐름: ${structure.emotionFlow}
CTA 스타일: ${structure.ctaStyle}

[씬 구조]
${scenesText}

[바이럴 요소]
${structure.viralElements?.join(', ')}

[지시사항]
위 영상의 구조, 훅 스타일, 감정 흐름, 타이밍을 정확히 복제하되,
주제와 내용은 완전히 새롭게 창작하세요.
나레이션 문장 길이, 리듬, 전환 타이밍을 원본과 동일하게 유지하세요.`;
}
