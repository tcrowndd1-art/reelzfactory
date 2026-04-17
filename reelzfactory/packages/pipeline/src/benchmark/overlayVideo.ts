import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface OverlayOptions {
  videoUrl: string;
  language: string;
  topic?: string;
  outputDir?: string;
}

export interface OverlayResult {
  videoPath: string;
  duration: number;
}

export async function downloadAndOverlay(options: OverlayOptions): Promise<OverlayResult> {
  const {
    videoUrl,
    language = 'ko',
    topic,
    outputDir = './outputs/overlay_' + Date.now(),
  } = options;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // URL 추출 (도우인/틱톡 공유 텍스트에서 링크만 추출)
  const urlMatch = videoUrl.match(/https?:\/\/[^\s]+/);
  const cleanUrl = urlMatch ? urlMatch[0] : videoUrl;

  console.log('\n━━━ 오버레이 영상 제작 시작 ━━━');
  console.log(`🔗 원본: ${videoUrl}`);
  console.log(`🔗 추출: ${cleanUrl}`);
  console.log(`🌐 언어: ${language}`);

  // Step 1: 영상 다운로드
  console.log('\n📥 Step 1: 영상 다운로드...');
  const rawVideo = path.join(outputDir, 'original.mp4');
  execSync(
    `yt-dlp --cookies-from-browser chrome -f "best[height<=1080]" -o "${rawVideo}" "${cleanUrl}"`,
    { encoding: 'utf-8', timeout: 120000 }
  );
  console.log(`✅ 다운로드 완료: ${rawVideo}`);
    // 소프트 자막 스트림 제거
  const cleanVideo = path.join(outputDir, 'clean.mp4');
  try {
    execSync(
      `ffmpeg -y -i "${rawVideo}" -an -sn -c:v copy "${cleanVideo}"`,
      { encoding: 'utf-8', timeout: 60000 }
    );
    fs.unlinkSync(rawVideo);
    fs.renameSync(cleanVideo, rawVideo);
    console.log('✅ 자막 스트림 제거 완료');
  } catch {
    console.log('ℹ️ 자막 스트림 없음 (원본 유지)');
  }

  // Step 2: 원본 자막 추출 (내용 파악용)
  console.log('\n📝 Step 2: 원본 내용 추출...');
  let originalText = '';
  try {
    const metaJson = execSync(
      `yt-dlp --dump-json --no-download "${cleanUrl}"`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );
    const meta = JSON.parse(metaJson);
    originalText = meta.title + '\n' + (meta.description || '').slice(0, 500);

    // 자막 추출 시도
    const subFile = path.join(outputDir, 'subs');
    try {
      execSync(
        `yt-dlp --write-auto-subs --sub-langs "ko,en,zh,ja" --skip-download --sub-format "vtt" -o "${subFile}" "${cleanUrl}"`,
        { encoding: 'utf-8', timeout: 30000 }
      );
      const vttFiles = fs.readdirSync(outputDir).filter(f => f.endsWith('.vtt'));
      if (vttFiles.length > 0) {
        const vttContent = fs.readFileSync(path.join(outputDir, vttFiles[0]), 'utf-8');
        originalText += '\n\n자막:\n' + parseVTT(vttContent);
      }
    } catch {}

    console.log(`✅ 원본 내용 추출: ${originalText.length}자`);
  } catch (e) {
    console.warn('⚠️ 메타데이터 추출 실패, 기본 주제 사용');
  }

  // Step 3: 영상 길이 확인
  const durationStr = execSync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${rawVideo}"`,
    { encoding: 'utf-8' }
  ).trim();
  const duration = parseFloat(durationStr);
  console.log(`⏱️ 영상 길이: ${duration.toFixed(1)}초`);

  // Step 4: AI 대본 생성
  console.log('\n🤖 Step 3: AI 대본 생성...');
  const OpenAI = (await import('openai')).default;
  const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const langMap: Record<string, string> = {
    ko: '한국어', en: 'English', pt: 'português brasileiro',
    es: 'español', ja: '日本語', zh: '中文',
  };
  const langLabel = langMap[language] || '한국어';

  const scriptResponse = await openai.chat.completions.create({
    model: 'google/gemini-2.5-pro',
    messages: [{
      role: 'user',
      content: `아래 영상의 내용을 ${langLabel}로 나레이션 대본을 작성하세요.

원본 내용:
${originalText.slice(0, 2000)}

규칙:
1. ${langLabel}로 작성
2. 영상 길이 ${duration.toFixed(0)}초에 맞춤
3. TTS로 읽을 대본 (자연스러운 구어체)
4. 문장별로 줄바꿈
5. 쇼핑 제품 리뷰/소개 톤으로 작성
6. 후킹 문구로 시작

대본만 출력하세요 (설명 없이):`,
    }],
    temperature: 0.7,
    max_tokens: 1500,
  });

  const script = scriptResponse.choices[0]?.message?.content || '';
  const scriptPath = path.join(outputDir, 'script.txt');
  fs.writeFileSync(scriptPath, script, 'utf-8');
  console.log(`✅ 대본 생성: ${script.length}자`);

  // Step 5: TTS 생성
  console.log('\n🔊 Step 4: TTS 음성 생성...');
  const { generateVoice } = await import('../voice/generateVoice');
  const audioPath = path.join(outputDir, 'narration.mp3');

  await generateVoice({
    text: script,
    outputPath: audioPath,
    language: language,
    category: 'shopping',
  });

  console.log(`✅ TTS 완료: ${audioPath}`);

  // Step 6: 자막 SRT 생성
  console.log('\n📝 Step 5: 자막 생성...');
  const srtPath = path.join(outputDir, 'subtitles.srt');
  generateSRT(script, duration, srtPath);
  console.log(`✅ 자막 완료: ${srtPath}`);

  // Step 7: FFmpeg 합성 (원본영상 + TTS + 자막)
  console.log('\n🎬 Step 6: 영상 합성...');
  const finalVideo = path.join(outputDir, 'final.mp4');
  const srtPathEscaped = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');

  execSync(
    `ffmpeg -y -i "${rawVideo}" -i "${audioPath}" ` +
    `-filter_complex "[0:a]volume=0.1[bg];[1:a]volume=1.0[tts];[bg][tts]amix=inputs=2:duration=shortest[aout]" ` +
    `-map 0:v -map "[aout]" ` +
    `-vf "subtitles='${srtPathEscaped}':force_style='FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Bold=1,Alignment=2,MarginV=60'" ` +
    `-c:v libx264 -preset fast -crf 23 -c:a aac -b:a 192k -shortest "${finalVideo}"`,
    { encoding: 'utf-8', timeout: 300000 }
  );

  const fileSize = fs.statSync(finalVideo).size / (1024 * 1024);
  console.log(`\n✅ 오버레이 영상 완성!`);
  console.log(`📁 ${finalVideo} (${fileSize.toFixed(1)}MB)`);
  console.log(`⏱️ ${duration.toFixed(1)}초\n`);

  return { videoPath: finalVideo, duration };
}

function generateSRT(script: string, totalDuration: number, outputPath: string): void {
  const sentences = script.split('\n').filter(s => s.trim().length > 0);
  const timePerSentence = totalDuration / sentences.length;
  let srt = '';

  sentences.forEach((sentence, i) => {
    const start = i * timePerSentence;
    const end = Math.min((i + 1) * timePerSentence, totalDuration);
    srt += `${i + 1}\n`;
    srt += `${formatSRTTime(start)} --> ${formatSRTTime(end)}\n`;
    srt += `${sentence.trim()}\n\n`;
  });

  fs.writeFileSync(outputPath, srt, 'utf-8');
}

function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad3(ms)}`;
}

function pad(n: number): string { return n.toString().padStart(2, '0'); }
function pad3(n: number): string { return n.toString().padStart(3, '0'); }

function parseVTT(vtt: string): string {
  return vtt
    .split('\n')
    .filter(line => !line.match(/^(WEBVTT|Kind:|Language:|$|\d{2}:\d{2})/))
    .map(line => line.replace(/<[^>]+>/g, '').trim())
    .filter(line => line.length > 0)
    .filter((line, i, arr) => line !== arr[i - 1])
    .join(' ');
}