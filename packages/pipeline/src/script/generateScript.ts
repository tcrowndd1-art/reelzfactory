import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { SHORTS_SCRIPT_SYSTEM_PROMPT, SHORTS_SCRIPT_USER_PROMPT, LONGFORM_SCRIPT_SYSTEM_PROMPT, LONGFORM_SCRIPT_USER_PROMPT } from './prompts';
import type { ScriptOutput } from '../../../shared/src/types/production';

dotenv.config();

interface GenerateOptions {
  topic: string;
  persona?: string;
  tone?: string;
  maxScenes?: number;
  stylePrefix?: string;
  apiKey?: string;
  model?: string;
  category?: string;
  knowledgeBase?: string;
  language?: string;

}

export async function generateScript(options: GenerateOptions): Promise<ScriptOutput> {
  const {
    topic,
    persona = '정보를 쉽고 재미있게 전달하는 유튜버',
    tone = 'Z세대, 솔직한, 약간 도발적',
    maxScenes = 15,
    stylePrefix = 'whiteboard animation style, white background, simple clean illustration, black outlines',
    apiKey = process.env.OPENROUTER_API_KEY,
    model = 'google/gemini-2.5-pro',
    category,
    knowledgeBase,
    language = 'ko',
  } = options;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is required');
  }

  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: apiKey,
  });

  console.log(`📝 대본 생성 시작 [${category || 'default'}]: "${topic}"`);
  if (knowledgeBase) {
    console.log(`📚 knowledge_base 적용: ${knowledgeBase.substring(0, 50)}...`);
  }

  const isLongform = maxScenes > 10;
  const systemPrompt = isLongform ? LONGFORM_SCRIPT_SYSTEM_PROMPT : SHORTS_SCRIPT_SYSTEM_PROMPT;
  const userPrompt = isLongform
     ? LONGFORM_SCRIPT_USER_PROMPT(
        topic,
        category || 'general',
        'Z세대~40대 유튜브 시청자',
        {
          name: persona.split(' ')[0] || '크리에이터',
          identity: persona,
          tone: tone,
          prop: '화이트보드 + 데이터 그래프'
        },
        stylePrefix,
        'CTR + 완주율 + 댓글/공유/저장 극대화',
        knowledgeBase
      )
    : SHORTS_SCRIPT_USER_PROMPT(topic, persona, tone, maxScenes, stylePrefix, category, knowledgeBase);
  console.log(`📋 프롬프트 모드: ${isLongform ? '롱폼' : '숏폼'} (${maxScenes}씬)`);
    const langNames: Record<string, string> = { ko: '한국어', en: 'English', pt: 'Português', es: 'Español', ja: '日本語' };
  const langInstruction = language !== 'ko'
    ? `\n\n[필수] 모든 대본(제목, 나레이션, 설명, 태그)을 반드시 ${langNames[language] || language}로 작성하세요. 한국어 사용 금지.`
    : '';


  const response = await client.chat.completions.create({
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt + langInstruction },
    ],
    temperature: 0.8,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content in response');
  }

  const jsonString = content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  try {
    const script: ScriptOutput = JSON.parse(jsonString);

    if (script.metadata && script.metadata.tags.length < 10) {
      console.log(`⚠️ 태그 ${script.metadata.tags.length}개 → 부족. AI가 더 생성해야 함`);
    }

    console.log(`✅ 대본 완료: "${script.title}" (${script.totalScenes}장면)`);
    console.log(`   태그: ${script.metadata?.tags?.length || 0}개, 해시태그: ${script.metadata?.hashtags?.length || 0}개`);

    return script;
  } catch (e) {
    throw new Error(`Failed to parse script JSON: ${(e as Error).message}\nRaw: ${jsonString}`);
  }
}
