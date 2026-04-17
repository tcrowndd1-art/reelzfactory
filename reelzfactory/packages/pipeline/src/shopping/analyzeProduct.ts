import 'dotenv/config';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

// ============ INTERFACES ============
export interface ProductAnalysis {
  productName: string;
  category: string;
  features: string[];
  targetAudience: string;
  sellingPoints: string[];
  mood: string;
  colorScheme: string;
  shortDescription: string;
}

// ============ ANALYZE PRODUCT IMAGE ============
export async function analyzeProductImage(
  imagePath: string,
  userProductName?: string,
  language: string = 'ko'
): Promise<ProductAnalysis> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY 환경변수가 없습니다.');

  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
  });

  // 이미지를 base64로 변환
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

  const langInstructions: Record<string, string> = {
    ko: '모든 응답을 한국어로 작성하세요. 자연스러운 한국어 표현을 사용하세요.',
    en: 'Write all responses in English. Use natural, conversational English.',
    pt: 'Escreva todas as respostas em português brasileiro. Use linguagem natural e conversacional.',
  };

  const systemPrompt = `You are an expert product analyst for shopping short-form video content.
Analyze the product image and return detailed information for script generation.

${langInstructions[language] || langInstructions['en']}

RULES:
- If the user provides a product name, use it as-is but still analyze the image for details.
- Identify the product category (e.g., beauty, household, electronics, fashion, food, health, baby, pet, etc.)
- List exactly 3 key features visible from the image or inferred from the product type.
- Identify the ideal target audience (age group, gender if applicable, lifestyle).
- List exactly 3 compelling selling points that would work in a 15-second shopping video.
- Describe the mood/vibe (e.g., premium, affordable luxury, fun, practical, cozy).
- Identify dominant color scheme from the image.
- Write a 1-sentence short description optimized for video script generation.

CRITICAL: Return ONLY raw JSON. Do NOT wrap in markdown code blocks. No backticks.

OUTPUT FORMAT (strict JSON only, no markdown):
{
  "productName": "제품명",
  "category": "카테고리",
  "features": ["특징1", "특징2", "특징3"],
  "targetAudience": "타겟 고객층",
  "sellingPoints": ["셀링포인트1", "셀링포인트2", "셀링포인트3"],
  "mood": "분위기/무드",
  "colorScheme": "메인 컬러 스킴",
  "shortDescription": "한 줄 설명"
}`;

  const userMessage = userProductName
    ? `제품명: ${userProductName}\n이 제품 이미지를 분석해주세요.`
    : '이 제품 이미지를 분석해주세요.';

  console.log('🔍 제품 이미지 분석 시작...');
  console.log(`   📸 이미지: ${imagePath}`);
  console.log(`   🏷️ 제품명: ${userProductName || '미입력 (AI가 판별)'}`);
  console.log(`   🌐 언어: ${language}`);

  const response = await client.chat.completions.create({
    model: 'google/gemini-2.5-pro',
    max_tokens: 2000,
    temperature: 0.3,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: userMessage },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          },
        ],
      },
    ],
  });

  const raw = response.choices[0]?.message?.content || '';
  console.log('📋 AI 분석 원본 (일부):', raw.substring(0, 200));

  // JSON 추출
  const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').replace(/`{3,}json\s*/gi, '').replace(/`{3,}\s*/gi, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('제품 분석 JSON 파싱 실패: ' + raw.substring(0, 300));

  const analysis: ProductAnalysis = JSON.parse(jsonMatch[0]);

  console.log('✅ 제품 분석 완료!');
  console.log(`   📦 제품: ${analysis.productName}`);
  console.log(`   📂 카테고리: ${analysis.category}`);
  console.log(`   🎯 타겟: ${analysis.targetAudience}`);
  console.log(`   💡 셀링포인트: ${analysis.sellingPoints.join(', ')}`);

  return analysis;
}
