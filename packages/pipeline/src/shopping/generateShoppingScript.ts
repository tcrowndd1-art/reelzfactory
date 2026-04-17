import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

// ============ 후킹 문구 — 파일에서 로드 ============
function loadHooks(lang: string): string[] {
  const filePath = path.join(__dirname, 'references', `hooks_${lang}.txt`);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length > 0) return lines;
  } catch (e) {}
  const defaults: Record<string, string[]> = {
    ko: ['이거 안 쓰면 손해입니다', '솔직히 이건 사기급입니다', '이걸 왜 이제야 알았을까'],
    en: ['You NEED this in your life', 'Stop scrolling. You need this.', 'Why did nobody tell me about this?'],
    pt: ['Você PRECISA disso na sua vida', 'Para de rolar. Você precisa disso.', 'Por que ninguém me contou sobre isso?'],
  };
  return defaults[lang] || defaults.en;
}

function loadSampleScripts(): string {
  const filePath = path.join(__dirname, 'references', 'sample_scripts.txt');
  try {
    const content = fs.readFileSync(filePath, 'utf-8').trim();
    if (content.length > 0) return content;
  } catch (e) {}
  return '';
}

// ============ 대본 구조 4가지 ============
const SCRIPT_STRUCTURES = ['PAS', 'AIDA', 'BEFORE_AFTER', 'QA'];

function getRandomHook(lang: string): string {
  const hooks = loadHooks(lang);
  return hooks[Math.floor(Math.random() * hooks.length)];
}

function getRandomStructure(): string {
  return SCRIPT_STRUCTURES[Math.floor(Math.random() * SCRIPT_STRUCTURES.length)];
}

// ============ 타입 ============
interface ShoppingScriptOptions {
  productName: string;
  productDescription?: string;
  language: string;
  structure?: string;
  apiKey?: string;
  model?: string;
}

export interface ShoppingScriptOutput {
  scenes: {
    text: string;
    imagePrompt: string;
    transition: string;
  }[];
  hook: string;
  cta: string;
  hashtags: string[];
  title: string;
  structure: string;
}

// ============ SYSTEM PROMPT ============
function getSystemPrompt(lang: string, structure: string, hook: string): string {
  const langInstructions: Record<string, string> = {
    ko: '한국어로 작성. 구어체, 대화하듯 자연스럽게. TTS로 읽힐 때 자연스러워야 함.',
    en: 'Write in English. Conversational, natural tone. Must sound natural when read by TTS.',
    pt: 'Escreva em português brasileiro. Tom conversacional e natural. Deve soar natural quando lido por TTS.',
  };

  const structureGuides: Record<string, string> = {
    PAS: 'Problem → Agitate → Solution. Scene 1: 문제 제시 (후킹), Scene 2: 문제 심화 (공감+고통), Scene 3: 솔루션 제시 (제품 소개 + CTA)',
    AIDA: 'Attention → Interest → Desire → Action. Scene 1: 주목 (후킹), Scene 2: 흥미+욕구 (효과/장점), Scene 3: 행동 촉구 (CTA)',
    BEFORE_AFTER: 'Before → After → Bridge. Scene 1: 이전 상태 (문제/불편), Scene 2: 이후 상태 (해결된 모습), Scene 3: 연결 (이 제품 덕분 + CTA)',
    QA: 'Question → Answer → Proof. Scene 1: 질문 던지기 (후킹), Scene 2: 답변 (제품 소개), Scene 3: 증거/결론 (CTA)',
  };

  const samples = loadSampleScripts();
  const sampleSection = samples ? `\n\nREFERENCE SCRIPTS (study the style, don't copy):\n${samples}` : '';

  return `You are a viral shopping shorts script writer.

RULES:
- ${langInstructions[lang] || langInstructions.en}
- Exactly 3 scenes, each scene 5-10 seconds (total 15-30 seconds flexible)
- Each scene text: 1-2 SHORT sentences, 10-20 words max (must be speakable in 7 seconds)
- CRITICAL: shorter text is ALWAYS better. If in doubt, cut words.
- Structure: ${structureGuides[structure] || structureGuides.PAS}
- Hook reference: "${hook}" (adapt creatively, don't copy exactly)
- CTA: NEVER mention price. Direct to "profile link" or "link in bio"
- Image prompts: max 15 words each, simple product shot description, English only
- Transitions: use different ones (zoom_in, pan_left, pan_right, zoom_out, pan_up, pan_down)

CRITICAL: Return ONLY raw JSON. Do NOT wrap in markdown code blocks. No backticks.

OUTPUT FORMAT (strict JSON):
{
  "scenes": [
    { "text": "scene narration", "imagePrompt": "product photo description for AI generation", "transition": "zoom_in" },
    { "text": "scene narration", "imagePrompt": "product usage scene description", "transition": "pan_left" },
    { "text": "scene narration", "imagePrompt": "product lifestyle shot description", "transition": "zoom_out" }
  ],
  "hook": "opening hook text",
  "cta": "call to action text",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
  "title": "YouTube Shorts title (max 70 chars)"
}${sampleSection}`;
}

// ============ MAIN FUNCTION ============
export async function generateShoppingScript(options: ShoppingScriptOptions): Promise<ShoppingScriptOutput> {
  const {
    productName,
    productDescription = '',
    language = 'en',
    structure = getRandomStructure(),
    apiKey = process.env.OPENROUTER_API_KEY,
    model = 'google/gemini-2.5-pro',
  } = options;

  if (!apiKey) throw new Error('OPENROUTER_API_KEY is required');

  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
  });

  const hook = getRandomHook(language);
  const systemPrompt = getSystemPrompt(language, structure, hook);

  const userPrompt = `Product: ${productName}
${productDescription ? `Description: ${productDescription}` : ''}
Language: ${language}
Structure: ${structure}

Generate a 15-second shopping shorts script for this product.`;

  console.log(`🛒 쇼핑 대본 생성: "${productName}" [${language}] [${structure}]`);

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 4000,
    temperature: 0.8,
  });

  const raw = response.choices[0]?.message?.content || '';
  console.log('📄 Raw response:', raw.substring(0, 200));

  const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').replace(/`{3,}json\s*/gi, '').replace(/`{3,}\s*/gi, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse shopping script JSON');

  const parsed = JSON.parse(jsonMatch[0]) as ShoppingScriptOutput;
  parsed.structure = structure;

  console.log(`✅ 쇼핑 대본 완료: ${parsed.scenes.length}씬, 구조: ${structure}`);
  return parsed;
}
