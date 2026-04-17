import { generateImage } from './generateImage';

export interface SceneImageInput {
  sceneIndex: number;
  imagePrompt: string;
}

export interface SceneImageResult {
  sceneIndex: number;
  imagePrompt: string;
  imageUrl: string;
  success: boolean;
  error?: string;
}

export async function generateSceneImages(
  scenes: SceneImageInput[],
  options?: {
    stylePrefix?: string;
    delayMs?: number;
    maxRetries?: number;
  }
): Promise<SceneImageResult[]> {
  const {
    stylePrefix = 'cinematic, high quality, detailed, 4k',
    delayMs = 1000,
    maxRetries = 2,
  } = options || {};

  const results: SceneImageResult[] = [];

  console.log(`\n🖼️ 총 ${scenes.length}개 씬 이미지 생성 시작\n`);

  for (const scene of scenes) {
    let attempts = 0;
    let success = false;
    let imageUrl = '';
    let error = '';

    while (attempts < maxRetries && !success) {
      try {
        attempts++;
        console.log(`[씬 ${scene.sceneIndex}] 시도 ${attempts}/${maxRetries}`);

        imageUrl = await generateImage({
          prompt: scene.imagePrompt,
          stylePrefix,
        });

        success = true;
      } catch (e: any) {
        error = e.message;
        console.log(`❌ [씬 ${scene.sceneIndex}] 실패: ${error}`);

        if (attempts < maxRetries) {
          console.log(`⏳ ${delayMs}ms 후 재시도...`);
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
    }

    results.push({
      sceneIndex: scene.sceneIndex,
      imagePrompt: scene.imagePrompt,
      imageUrl,
      success,
      error: success ? undefined : error,
    });

    if (success && scenes.indexOf(scene) < scenes.length - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(`\n📊 결과: ${successCount}/${scenes.length} 성공\n`);

  return results;
}
