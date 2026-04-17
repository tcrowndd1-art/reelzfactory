// packages/pipeline/src/voice/generateVoice.ts
// Gemini 2.5 Flash TTS – Director's Notes 기반 음성 생성

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { getVoiceStyle, type SupportedLang } from './ttsStylePrompts';

dotenv.config();

// ── 인터페이스 ──
export interface VoiceOptions {
  text: string;
  outputPath: string;
  voice?: string;
  language?: string;
  voiceName?: string;
  speakingRate?: number;
  rate?: string;
  pitch?: number;
  sceneType?: string;
  gender?: 'male' | 'female';
  // ★ 새로 추가
  category?: string;
  isLongform?: boolean;
  customDirectorNote?: string;  // 완전 커스텀 프롬프트 (옵션)
}

// ── PCM → WAV 변환 ──
function pcmToWav(pcmData: Buffer, sampleRate = 24000, channels = 1, bitsPerSample = 16): Buffer {
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const headerSize = 44;
  const buffer = Buffer.alloc(headerSize + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);         // Subchunk1Size (PCM)
  buffer.writeUInt16LE(1, 20);          // AudioFormat (PCM = 1)
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmData.copy(buffer, headerSize);

  return buffer;
}

// ── 메인 TTS 함수 ──
export async function generateVoice(options: VoiceOptions): Promise<string> {
  const {
    text,
    outputPath,
    language = 'ko',
    category = 'general',
    isLongform = false,
    customDirectorNote,
    sceneType = 'content',
    gender,
  } = options;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY가 .env에 없어요! Google AI Studio에서 발급하세요.');

  // 디렉토리 생성
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // 스타일 결정
  const langCode = (language || 'ko').substring(0, 2) as SupportedLang;
  const style = getVoiceStyle(category, langCode, isLongform, gender);
  const voiceName = options.voiceName || style.voiceName;

  // Director's Note + 대본 조합
  const directorNote = customDirectorNote || style.directorNote;
  const cleanedText = cleanTextForTTS(text);

  // 프롬프트 구성: Director's Note가 "어떻게 읽을지", TRANSCRIPT가 "무엇을 읽을지"
  const fullPrompt = `${directorNote}

#### TRANSCRIPT
${cleanedText}`;

  console.log(`🎬 Gemini TTS [${voiceName}/${category}/${langCode}] 생성 중...`);

  // Gemini API 호출
  const body = {
    contents: [{
      parts: [{ text: fullPrompt }]
    }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voiceName,
          }
        }
      }
    },
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini TTS 에러: ${response.status} - ${err}`);
  }

  const data = await response.json();

  // 응답에서 오디오 추출
  const audioBase64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!audioBase64) {
    throw new Error('Gemini TTS 응답에 오디오 데이터가 없습니다.');
  }

  const pcmBuffer = Buffer.from(audioBase64, 'base64');

  // 출력 파일 확장자에 따라 처리
  const ext = path.extname(outputPath).toLowerCase();
  if (ext === '.wav') {
    // PCM → WAV 변환 후 저장
    const wavBuffer = pcmToWav(pcmBuffer);
    fs.writeFileSync(outputPath, wavBuffer);
  } else {
    // .mp3 등은 일단 WAV로 저장 (ffmpeg 변환은 호출측에서)
    // 기존 파이프라인이 .mp3를 기대하므로 WAV로 저장하되 확장자는 유지
    const wavBuffer = pcmToWav(pcmBuffer);
    const wavPath = outputPath.replace(ext, '.wav');
    fs.writeFileSync(wavPath, wavBuffer);

    // ffmpeg로 WAV → MP3 변환
    const { execSync } = await import('child_process');
    try {
      execSync(`ffmpeg -y -i "${wavPath}" -codec:a libmp3lame -qscale:a 2 "${outputPath}"`, {
        stdio: 'pipe',
      });
      // WAV 임시 파일 삭제
      if (fs.existsSync(wavPath) && wavPath !== outputPath) {
        fs.unlinkSync(wavPath);
      }
    } catch (ffmpegErr) {
      console.warn(`⚠️ ffmpeg MP3 변환 실패, WAV 파일 사용: ${wavPath}`);
      // ffmpeg 실패 시 WAV를 MP3 경로로 복사
      if (fs.existsSync(wavPath)) {
        fs.copyFileSync(wavPath, outputPath);
      }
    }
  }

  const sizeKB = (fs.statSync(outputPath).size / 1024).toFixed(1);
  console.log(`✅ Gemini TTS 생성 [${voiceName}/${sceneType}]: ${outputPath} (${sizeKB}KB)`);
  return outputPath;
}

// ── 텍스트 정리 ──
function cleanTextForTTS(text: string): string {
  return text
    .replace(/\.{2,}/g, '.')
    .replace(/\s*\.\s*/g, '. ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ── 하위 호환용 (기존 코드에서 사용) ──
export function getVoiceId(language: string, gender: 'male' | 'female' = 'male'): string {
  // Gemini TTS는 voiceName만 쓰지만, 기존 호출 호환을 위해 유지
  const langCode = language.substring(0, 2) as SupportedLang;
  const style = getVoiceStyle('general', langCode, false);
  return style.voiceName;
}
