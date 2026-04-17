import { generateCaption } from './generateCaption';
import type { CaptionResult } from './generateCaption';

export async function generateSceneCaptions(
  audioPaths: { sceneIndex: number; audioPath: string }[],
  options?: {
    modelSize?: string;
    language?: string;
  }
): Promise<CaptionResult[]> {
  const results: CaptionResult[] = [];

  console.log(`\n📝 총 ${audioPaths.length}개 씬 자막 생성 시작\n`);

  for (const item of audioPaths) {
    const result = await generateCaption(
      item.audioPath,
      item.sceneIndex,
      options
    );
    results.push(result);
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(`\n📊 자막 결과: ${successCount}/${audioPaths.length} 성공\n`);

  return results;
}
