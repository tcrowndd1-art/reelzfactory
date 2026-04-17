import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface CaptionResult {
  sceneIndex: number;
  words: WordTimestamp[];
  fullText: string;
  duration: number;
  success: boolean;
  error?: string;
}

export async function generateCaption(
  audioPath: string,
  sceneIndex: number,
  options?: {
    modelSize?: string;
    language?: string;
  }
): Promise<CaptionResult> {
  const {
    modelSize = 'base',
    language = 'ko',
  } = options || {};

  console.log(`📝 자막 생성 중: 씬 ${sceneIndex}`);

  const pythonScript = `
import json
from faster_whisper import WhisperModel

model = WhisperModel("${modelSize}", device="cpu", compute_type="int8")
segments, info = model.transcribe("${audioPath.replace(/\\/g, '/')}", language="${language}", word_timestamps=True)

words = []
for segment in segments:
    if segment.words:
        for word in segment.words:
            words.append({
                "word": word.word.strip(),
                "start": round(word.start, 3),
                "end": round(word.end, 3)
            })

print(json.dumps(words, ensure_ascii=False))
`;

  const tempScript = path.join(path.dirname(audioPath), `whisper_${sceneIndex}.py`);

  try {
    fs.writeFileSync(tempScript, pythonScript);

      const { stdout, stderr } = await execAsync(`python "${tempScript}"`, {
      timeout: 120000,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });


    const words: WordTimestamp[] = JSON.parse(stdout.trim());
    const duration = words.length > 0 ? words[words.length - 1].end : 0;
    const fullText = words.map((w) => w.word).join(' ');

    console.log(`✅ 자막 완료: ${words.length}개 단어, ${duration.toFixed(1)}초`);

    fs.unlinkSync(tempScript);

    return {
      sceneIndex,
      words,
      fullText,
      duration,
      success: true,
    };
  } catch (error: any) {
    console.error(`❌ 자막 실패: ${error.message}`);

    if (fs.existsSync(tempScript)) fs.unlinkSync(tempScript);

    return {
      sceneIndex,
      words: [],
      fullText: '',
      duration: 0,
      success: false,
      error: error.message,
    };
  }
}
