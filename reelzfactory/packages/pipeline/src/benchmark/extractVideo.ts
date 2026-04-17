import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface VideoMetadata {
  title: string;
  description: string;
  duration: number;
  viewCount: number;
  likeCount: number;
  uploadDate: string;
  tags: string[];
  subtitles: string;
  language: string;
}

export async function extractVideoData(
  url: string,
  outputDir: string = './temp/benchmark'
): Promise<VideoMetadata> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('\n━━━ 벤치마킹: 영상 데이터 추출 시작 ━━━');
  console.log(`🔗 URL: ${url}`);

  const metaJson = execSync(
    `yt-dlp --dump-json --no-download "${url}"`,
    { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
  );
  const meta = JSON.parse(metaJson);

  console.log(`📌 제목: ${meta.title}`);
  console.log(`⏱️ 길이: ${meta.duration}초`);
  console.log(`👀 조회수: ${meta.view_count?.toLocaleString()}`);

  let subtitles = '';
  const subFile = path.join(outputDir, 'subs');

  // 언어별로 개별 시도 (하나라도 성공하면 OK)
  const subLangs = ['en', 'ko', 'ja', 'pt', 'es'];
  for (const lang of subLangs) {
    try {
      execSync(
        `yt-dlp --remote-components ejs:github --write-auto-subs --sub-langs "${lang}" --skip-download --sub-format "vtt" -o "${subFile}" "${url}"`,
        { encoding: 'utf-8', timeout: 30000, stdio: 'pipe' }
      );
      console.log(`✅ ${lang} 자막 다운로드 성공`);
    } catch {
      console.log(`⚠️ ${lang} 자막 없음, 스킵`);
    }
  }

  const vttFiles = fs.readdirSync(outputDir).filter(f => f.endsWith('.vtt'));
  if (vttFiles.length > 0) {
    const vttContent = fs.readFileSync(path.join(outputDir, vttFiles[0]), 'utf-8');
    subtitles = parseVTT(vttContent);
    console.log(`📝 자막 추출 완료: ${subtitles.length}자 (${vttFiles[0]})`);
  } else {
    console.warn('⚠️ 자막 추출 실패, 메타데이터만 사용');
  }

  const language = detectLanguage(meta.title, subtitles);

  const result: VideoMetadata = {
    title: meta.title || '',
    description: meta.description || '',
    duration: meta.duration || 0,
    viewCount: meta.view_count || 0,
    likeCount: meta.like_count || 0,
    uploadDate: meta.upload_date || '',
    tags: meta.tags || [],
    subtitles,
    language,
  };

  try {
    const tempFiles = fs.readdirSync(outputDir);
    tempFiles.forEach(f => fs.unlinkSync(path.join(outputDir, f)));
  } catch {}

  console.log(`✅ 데이터 추출 완료 (언어: ${language})\n`);
  return result;
}

function parseVTT(vtt: string): string {
  return vtt
    .split('\n')
    .filter(line => !line.match(/^(WEBVTT|Kind:|Language:|$|\d{2}:\d{2})/))
    .filter(line => !line.match(/^<\d{2}:\d{2}/))
    .map(line => line.replace(/<[^>]+>/g, '').trim())
    .filter(line => line.length > 0)
    .filter((line, i, arr) => line !== arr[i - 1])
    .join(' ');
}

function detectLanguage(title: string, subtitles: string): string {
  const text = title + ' ' + subtitles.slice(0, 200);
  if (/[가-힣]/.test(text)) return 'ko';
  if (/[ぁ-ん]|[ァ-ン]/.test(text)) return 'ja';
  if (/[一-龥]/.test(text)) return 'zh';
  if (/[àáâãçéêíóôõú]/i.test(text)) return 'pt';
  if (/[áéíñóú¿¡]/i.test(text)) return 'es';
  return 'en';
}
