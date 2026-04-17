import { generateVoice, getVoiceId } from './generateVoice';
import * as path from 'path';

export interface SceneVoiceInput {
  sceneIndex: number;
  text: string;
}

export interface SceneVoiceResult {
  sceneIndex: number;
  audioPath: string;
  success: boolean;
  error?: string;
}

export async function generateSceneVoices(
  scenes: SceneVoiceInput[],
    options?: {
    outputDir?: string;
    language?: string;
    rate?: string;
    pitch?: string;
    category?: string;
    isLongform?: boolean;
  }
): Promise<SceneVoiceResult[]> {
  const {
    outputDir = './outputs/audio',
    language = 'ko',
    rate = '+0%',
    pitch = '+0Hz',
    category = 'general',
    isLongform = false,
  } = options || {};


  
  const results: SceneVoiceResult[] = [];

  console.log(`\n🎙️ 총 ${scenes.length}개 씬 음성 생성 시작 (${voice})\n`);

  for (const scene of scenes) {
    try {
      const outputPath = path.join(outputDir, `scene_${scene.sceneIndex}.mp3`);

      await generateVoice({
  text: scene.text,
  outputPath,
  language,
  category,      // ← "shopping_beauty" 등 전달
  isLongform,    // ← true/false 전달
});

      results.push({
        sceneIndex: scene.sceneIndex,
        audioPath: outputPath,
        success: true,
      });
    } catch (error: any) {
      results.push({
        sceneIndex: scene.sceneIndex,
        audioPath: '',
        success: false,
        error: error.message,
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(`\n📊 결과: ${successCount}/${scenes.length} 성공\n`);

  return results;
}
