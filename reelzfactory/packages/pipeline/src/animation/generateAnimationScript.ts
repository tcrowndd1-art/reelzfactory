// packages/pipeline/src/animation/generateAnimationScript.ts
// 애니메이션 숏폼 대본 생성 — Knowledge Base + ANIMATION_SHORTS_PROMPT

import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { ANIMATION_SHORTS_SYSTEM_PROMPT, ANIMATION_SHORTS_USER_PROMPT } from '../script/prompts';

dotenv.config();

// ── 타입 ──
export interface AnimationScene {
  scene_number: number;
  phase: string;
  render_type: 'lipsync' | 'action' | 'image_motion';
  duration_sec: number;
  tts_script: string;
  tts_emotion_tag: string;
  image_prompt?: string;
  video_prompt?: string;
  motion_type?: string;
  scene_note: string;
}

export interface AnimationScript {
  title: string;
  hook_text: string;
  duration_target: number;
  tone: string;
  structure: string;
  total_scenes: number;
  scenes: AnimationScene[];
  tags: string[];
  cta_text: string;
  disclaimer: boolean;
  product_name: string;
  estimated_cost: {
    kling_clips: number;
    flux_images: number;
    total_usd: number;
  };
}

export interface AnimationScriptOptions {
  product: string;
  duration: 15 | 30 | 45 | 60;
  tone: 'cognitive_gap' | 'provocateur' | 'gravity';
  gender: 'male' | 'female';
  language: string;
  structure?: string;
}

// ── Knowledge Base 로드 ──
function loadKnowledgeBase(): string {
  const basePath = path.resolve('./packages/pipeline/assets/knowledge/nutrilite');
  const files = [
    'factbase/products.json',
    'factbase/ingredients.json',
    'compliance/claims.json',
    'hooks/general_health.json',
    'hooks/nutrilite_brand.json',
    'hooks/facttack_trainer.json',
    'scripts/viral_structures.json',
    'scripts/billionaire_frameworks.json',
  ];

  let combined = '';
  for (const file of files) {
    const fullPath = path.join(basePath, file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      combined += `\n\n=== ${file} ===\n${content}`;
    }
  }
  return combined;
}

// ── 구조 자동 선택 ──
function selectStructure(duration: number): string {
  if (duration <= 15) return 'PAS 공포형 (pas_fear_30 축약)';
  if (duration <= 30) return 'PAS 공포형 (pas_fear_30)';
  if (duration <= 45) return 'PAS 호기심형 (pas_curiosity_45)';
  return 'AIDA 프리미엄형 (aida_premium_60)';
}

// ── 메인 함수 ──
export async function generateAnimationScript(
  options: AnimationScriptOptions
): Promise<AnimationScript> {
  const {
    product,
    duration,
    tone,
    gender,
    language = 'ko',
    structure,
  } = options;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is required');

  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
  });

  const knowledgeBase = loadKnowledgeBase();
  const selectedStructure = structure || selectStructure(duration);

  console.log(`\n🎬 애니메이션 대본 생성 시작`);
  console.log(`  제품: ${product}`);
  console.log(`  길이: ${duration}초`);
  console.log(`  톤: ${tone}`);
  console.log(`  성별: ${gender}`);
  console.log(`  구조: ${selectedStructure}`);

  const userPrompt = ANIMATION_SHORTS_USER_PROMPT
    .replace(/{product}/g, product)
    .replace(/{duration}/g, String(duration))
    .replace(/{tone}/g, tone)
    .replace(/{gender}/g, gender)
    .replace(/{language}/g, language)
    .replace(/{structure}/g, selectedStructure)
    .replace(/{knowledge_base}/g, knowledgeBase);

  const response = await client.chat.completions.create({
    model: 'google/gemini-2.5-pro',
    messages: [
      { role: 'system', content: ANIMATION_SHORTS_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
      response_format: { type: 'json_object' },
    max_tokens: 16384,
  });

  const raw = response.choices[0]?.message?.content || '';

    // JSON 파싱 (마크다운 코드블록 제거 + 잘린 JSON 복구)
  let jsonStr = raw;
  
  // 마크다운 코드블록 제거
  const codeBlockMatch = raw.match(/\\\json\s*([\s\S]*?)(\\\|$)/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  } else {
    const objMatch = raw.match(/\{[\s\S]*/);
    if (objMatch) jsonStr = objMatch[0];
  }
  
  // 잘린 JSON 자동 복구
  let script: AnimationScript;
  try {
    script = JSON.parse(jsonStr);
  } catch (e) {
    console.warn('⚠️ JSON 잘림 감지, 자동 복구 시도...');
    // 열린 괄호 수 맞추기
    const openBraces = (jsonStr.match(/\{/g) || []).length;
    const closeBraces = (jsonStr.match(/\}/g) || []).length;
    const openBrackets = (jsonStr.match(/\[/g) || []).length;
    const closeBrackets = (jsonStr.match(/\]/g) || []).length;
    
    // 마지막 불완전한 속성 제거
    jsonStr = jsonStr.replace(/,\s*"[^"]*"?\s*:?\s*[^}\]]*$/, '');
    jsonStr = jsonStr.replace(/,\s*\{[^}]*$/, '');
    jsonStr = jsonStr.replace(/,\s*$/, '');
    
    // 괄호 닫기
    for (let i = 0; i < openBrackets - closeBrackets; i++) jsonStr += ']';
    for (let i = 0; i < openBraces - closeBraces; i++) jsonStr += '}';
    
    try {
      script = JSON.parse(jsonStr);
      console.log('✅ JSON 자동 복구 성공!');
    } catch (e2) {
      console.error('❌ JSON 복구 실패. Raw:', raw.substring(0, 800));
      throw new Error('대본 생성 결과를 파싱할 수 없습니다');
    }
  }

  console.log(`\n✅ 대본 생성 완료: "${script.title}"`);
  console.log(`  씬 수: ${script.total_scenes}`);
  console.log(`  Kling 클립: ${script.estimated_cost.kling_clips}`);
  console.log(`  Flux 이미지: ${script.estimated_cost.flux_images}`);
  console.log(`  예상 비용: $${script.estimated_cost.total_usd}`);

  return script;
}



