import * as fal from '@fal-ai/serverless-client';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

fal.config({
  credentials: process.env.FAL_KEY!,
});

// ============ INTERFACES ============
export interface VideoGenerationOptions {
  imageUrl: string;          // 원본 이미지 URL 또는 로컬 경로
  prompt: string;            // 영상 움직임 프롬프트
  duration: 5 | 10;          // 5초 또는 10초
  modelTier: 'standard' | 'pro';  // Standard(720p) 또는 Pro(1080p)
  outputDir: string;         // 저장 폴더
  sceneIndex: number;        // 씬 번호
}

export interface VideoGenerationResult {
  videoUrl: string;          // 생성된 영상 URL
  localPath: string;         // 로컬 저장 경로
  duration: number;
}

// ============ VIDEO PROMPTS LOADER ============
function loadVideoPrompts(): string {
  const filePath = path.join(__dirname, 'references', 'video_prompts.txt');
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch {}
  return '';
}

// ============ GENERATE VIDEO FROM IMAGE ============
export async function generateVideoFromImage(
  options: VideoGenerationOptions
): Promise<VideoGenerationResult> {
  const {
    imageUrl,
    prompt,
    duration = 5,
    modelTier = 'standard',
    outputDir,
    sceneIndex,
  } = options;

    // 로컬 파일이면 URL로 변환
  let finalImageUrl = imageUrl;
  if (!imageUrl.startsWith('http')) {
    const imageBuffer = fs.readFileSync(imageUrl);
    const base64 = imageBuffer.toString('base64');
    const ext = imageUrl.endsWith('.png') ? 'png' : 'jpeg';
    finalImageUrl = `data:image/${ext};base64,${base64}`;
  }

  

  const modelId = modelTier === 'pro'
    ? 'fal-ai/kling-video/v3/pro/image-to-video'
    : 'fal-ai/kling-video/v3/standard/image-to-video';

  // 비디오 프롬프트 레퍼런스 로드
  const videoPromptRef = loadVideoPrompts();

  // 프롬프트에 레퍼런스 스타일 적용
  const enhancedPrompt = videoPromptRef
    ? `${prompt}. Style guide: realistic, natural light, handheld feel, no faces, slight camera movement for authenticity, warm natural tones`
    : prompt;

  console.log(`🎬 Kling 영상 생성 [Scene ${sceneIndex}] [${modelTier}] [${duration}s]`);
  console.log(`   📸 이미지: ${imageUrl.substring(0, 80)}...`);
  console.log(`   📝 프롬프트: ${enhancedPrompt.substring(0, 80)}...`);

  const input: Record<string, any> = {
    prompt: enhancedPrompt,
    image_url: finalImageUrl,
    duration: String(duration),
    negative_prompt: 'deformed, shaky, blur, text, watermark, logo, low quality',
  };

  const result = await fal.subscribe(modelId, { input }) as any;

  const videoUrl = result?.video?.url || result?.data?.video?.url;
  if (!videoUrl) {
    throw new Error(`Kling 영상 생성 실패: 결과에 video URL 없음`);
  }

  // 영상 다운로드
  const localPath = path.join(outputDir, `scene_${sceneIndex}.mp4`);
  const response = await fetch(videoUrl);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(localPath, buffer);

  const fileSize = (buffer.length / 1024 / 1024).toFixed(1);
  console.log(`   ✅ Scene ${sceneIndex} 영상 완료: ${localPath} (${fileSize}MB)`);

  return { videoUrl, localPath, duration };
}

// ============ BATCH GENERATE VIDEOS ============
export async function generateAllSceneVideos(
  scenes: Array<{ imageUrl: string; imagePrompt: string }>,
  outputDir: string,
  modelTier: 'standard' | 'pro' = 'standard',
  duration: 5 | 10 = 5,
): Promise<VideoGenerationResult[]> {
  const videoDir = path.join(outputDir, 'videos');
  fs.mkdirSync(videoDir, { recursive: true });

  console.log(`\n🎬 Kling 영상 일괄 생성 (${scenes.length}씬, ${modelTier}, ${duration}s)`);

  const results: VideoGenerationResult[] = [];

  for (let i = 0; i < scenes.length; i++) {
    try {
      const result = await generateVideoFromImage({
        imageUrl: scenes[i].imageUrl,
        prompt: scenes[i].imagePrompt,
        duration,
        modelTier,
        outputDir: videoDir,
        sceneIndex: i,
      });
      results.push(result);
    } catch (error: any) {
      console.log(`   ⚠️ Scene ${i} 영상 생성 실패: ${error.message}`);
      results.push({ videoUrl: '', localPath: '', duration: 0 });
    }
  }

  const successCount = results.filter(r => r.videoUrl).length;
  console.log(`✅ 영상 생성 완료: ${successCount}/${scenes.length}씬 성공\n`);

  return results;
}
