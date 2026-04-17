import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import * as path from 'path';
import * as fs from 'fs';

interface WordData {
  word: string;
  start: number;
  end: number;
}

interface SceneData {
  imageUrl: string;
  audioUrl: string;
  words: WordData[];
  subtitleEmphasis: string[];
  durationInFrames: number;
}

export interface RenderOptions {
  scenes: SceneData[];
  outputPath?: string;
  fps?: number;
  width?: number;
  height?: number;
  bgmPath?: string;
  bgmVolume?: number;
  category?: string;
  videoType?: 'shorts' | 'longform';
 headline?: string;
}

// 카테고리별 BGM 자동 매칭
function findBGM(category?: string): string | null {
  const bgmDir = path.resolve('./public/bgm');

  if (!fs.existsSync(bgmDir)) return null;

  const files = fs.readdirSync(bgmDir).filter(f => f.endsWith('.mp3') || f.endsWith('.wav'));

  if (files.length === 0) return null;

  // 카테고리 매칭 시도
  if (category) {
    const matched = files.find(f => f.toLowerCase().includes(category.toLowerCase()));
    if (matched) return path.join(bgmDir, matched);
  }

  // 매칭 안 되면 랜덤 선택
  const random = files[Math.floor(Math.random() * files.length)];
  return path.join(bgmDir, random);
}

export async function renderVideo(options: RenderOptions): Promise<string> {
    const {
    scenes,
    outputPath = './outputs/video/shorts.mp4',
    fps = 30,
    width,
    height,
    videoType = 'shorts',
    bgmPath,
    bgmVolume = 0.15,
    category,
    headline,
  } = options;

  const finalWidth = width ?? (videoType === 'shorts' ? 1080 : 1920);
  const finalHeight = height ?? (videoType === 'shorts' ? 1920 : 1080);


  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const totalFrames = scenes.reduce((sum, s) => sum + s.durationInFrames, 0);

  // BGM 찾기
  const finalBGM = bgmPath || findBGM(category);

  console.log(`\n🎬 영상 렌더링 시작`);
  console.log(`📐 해상도: ${width}x${height}`);
  console.log(`🎞️ 총 프레임: ${totalFrames} (${(totalFrames / fps).toFixed(1)}초)`);
  console.log(`🎵 BGM: ${finalBGM ? path.basename(finalBGM) : '없음 (세션10에서 업로드)'}`);
  console.log(`📁 출력: ${outputPath}\n`);

  // BGM 파일을 public에 복사 (Remotion에서 접근 가능하도록)
  let bgmFileName: string | null = null;
  if (finalBGM && fs.existsSync(finalBGM)) {
    bgmFileName = `bgm_${Date.now()}.mp3`;
    const publicAudioDir = path.resolve('./public/audio');
    if (!fs.existsSync(publicAudioDir)) fs.mkdirSync(publicAudioDir, { recursive: true });
    fs.copyFileSync(finalBGM, path.join(publicAudioDir, bgmFileName));
    console.log(`🎵 BGM 복사: ${bgmFileName}`);
  }

  // 1. Bundle Remotion project
  console.log('📦 Remotion 번들링 중...');
  const bundleLocation = await bundle({
    entryPoint: path.resolve('./remotion/src/entry.tsx'),
    webpackOverride: (config) => config,
  });

  // 2. Select composition
  const inputProps = {
    scenes,
    fps,
    bgmUrl: bgmFileName ? `audio/${bgmFileName}` : null,
    bgmVolume,
    headline,
  };

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'ShortsVideo',
    inputProps,
  });

  composition.durationInFrames = totalFrames;
  composition.fps = fps;
  composition.width = finalWidth;
  composition.height = finalHeight;

  // 3. Render
  console.log('🔨 렌더링 중... (시간이 좀 걸려요)\n');

  let lastProgress = 0;
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps,
    onProgress: ({ progress }) => {
      const percent = Math.round(progress * 100);
      if (percent >= lastProgress + 10) {
        console.log(`  ⏳ ${percent}% 완료`);
        lastProgress = percent;
      }
    },
  });

  const stats = fs.statSync(outputPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);

  console.log(`\n✅ 렌더링 완료!`);
  console.log(`📁 파일: ${outputPath}`);
  console.log(`📊 크기: ${sizeMB}MB`);
  console.log(`⏱️ 길이: ${(totalFrames / fps).toFixed(1)}초\n`);

  return outputPath;
}
