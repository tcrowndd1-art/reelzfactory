// packages/pipeline/src/animation/generateKlingVideo.ts
// Kling 2.6 Pro API 연동 (FAL.AI 경유) — action + lipsync

import { fal } from '@fal-ai/client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

fal.config({
  credentials: process.env.FAL_KEY!,
});

// ── 타입 ──
export interface KlingVideoOptions {
  imageUrl: string;           // 레퍼런스 이미지 URL 또는 로컬 경로
  prompt: string;             // 영상 생성 프롬프트
  negativePrompt?: string;
  duration: number;           // 초 (5 또는 10)
  outputPath: string;
  mode: 'action' | 'lipsync';
  audioPath?: string;         // lipsync일 때 TTS 오디오 경로
}

export interface KlingVideoResult {
  videoPath: string;
  duration: number;
  cost: number;
  success: boolean;
  error?: string;
}

const NEGATIVE_PROMPT_BASE = 'missing cap, different clothes, human face, realistic human, blurry texture, hair, skin, low quality, watermark, text overlay, deformed bones';
const MASTER_STYLE_SUFFIX = 'cinematic lighting, soft shadows, 8k, 3D animation style, consistent color grading, clean background, subtle rim light';

// ── 이미지를 Data URL로 변환 ──
function imageToDataUrl(imagePath: string): string {
  const ext = path.extname(imagePath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  const buffer = fs.readFileSync(imagePath);
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

// ── Kling Action (이미지→영상, 오디오 OFF) ──
async function generateAction(options: KlingVideoOptions): Promise<KlingVideoResult> {
  const { imageUrl, prompt, negativePrompt, duration, outputPath } = options;

  console.log(`  🎬 Kling Action 생성 중... (${duration}초)`);

  try {
    const imageInput = imageUrl.startsWith('http')
      ? imageUrl
      : imageToDataUrl(imageUrl);

    const result: any = await fal.subscribe('fal-ai/kling-video/v2.6/pro/image-to-video', {
      input: {
        image_url: imageInput,
        prompt: `${prompt}, ${MASTER_STYLE_SUFFIX}`,
        negative_prompt: negativePrompt || NEGATIVE_PROMPT_BASE,
        duration: String(duration),
        aspect_ratio: '9:16',
      },
      logs: false,
    });

    if (result?.video?.url) {
      // 비디오 다운로드
      const response = await fetch(result.video.url);
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(outputPath, buffer);

      const cost = duration * 0.07; // $0.07/초
      console.log(`  ✅ Action 완료: ${outputPath} ($${cost.toFixed(2)})`);

      return { videoPath: outputPath, duration, cost, success: true };
    }

    throw new Error('Kling API 응답에 video URL이 없습니다');
  } catch (error: any) {
    console.error(`  ❌ Action 실패: ${error.message}`);
    return { videoPath: '', duration, cost: 0, success: false, error: error.message };
  }
}

// ── Kling LipSync (이미지 + 오디오 → 립싱크 영상) ──
async function generateLipsync(options: KlingVideoOptions): Promise<KlingVideoResult> {
  const { imageUrl, audioPath, duration, outputPath } = options;

  if (!audioPath) throw new Error('LipSync에는 audioPath가 필요합니다');

  console.log(`  🗣️ Kling LipSync 생성 중... (${duration}초)`);

  try {
    const imageInput = imageUrl.startsWith('http')
      ? imageUrl
      : imageToDataUrl(imageUrl);

    const audioInput = audioPath.startsWith('http')
      ? audioPath
      : `data:audio/mp3;base64,${fs.readFileSync(audioPath).toString('base64')}`;

    const result: any = await fal.subscribe('fal-ai/kling-video/ai-avatar/v2/standard', {
      input: {
        face_image_url: imageInput,
        audio_url: audioInput,
        aspect_ratio: '9:16',
      },
      logs: false,
    });

    if (result?.video?.url) {
      const response = await fetch(result.video.url);
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(outputPath, buffer);

      const cost = Math.ceil(duration / 5) * 0.014; // $0.014 / 5초
      console.log(`  ✅ LipSync 완료: ${outputPath} ($${cost.toFixed(3)})`);

      return { videoPath: outputPath, duration, cost, success: true };
    }

    throw new Error('Kling LipSync API 응답에 video URL이 없습니다');
  } catch (error: any) {
    console.error(`  ❌ LipSync 실패: ${error.message}`);
    return { videoPath: '', duration, cost: 0, success: false, error: error.message };
  }
}

// ── 메인 함수 ──
export async function generateKlingVideo(options: KlingVideoOptions): Promise<KlingVideoResult> {
  if (options.mode === 'lipsync') {
    return generateLipsync(options);
  }
  return generateAction(options);
}
