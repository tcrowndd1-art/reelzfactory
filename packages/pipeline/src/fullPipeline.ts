import { generateScript } from './script';
import { generateImage, loadStylePreset, checkCharacterRefExists } from './image';
import { generateVoice, getVoiceId } from './voice';
import { generateCaption } from './caption';
import { cleanupOldProjects, enforceStorageLimit, logPipelineError } from './utils/cleanup';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

export interface PipelineOptions {
  topic: string;
  language?: string;
  persona?: string;
  tone?: string;
  maxScenes?: number;
  stylePrefix?: string;
  voiceRate?: string;
  outputDir?: string;
  fps?: number;
  category?: string;
  knowledgeBase?: string;
  userId?: string;
  stylePresetName?: string;
}

export interface PipelineResult {
  topic: string;
  title: string;
  videoPath: string;
  totalScenes: number;
  totalDuration: number;
  metadata: any;
  costs: {
    script: string;
    images: string;
    voice: string;
    caption: string;
    render: string;
    total: string;
  };
}

export async function runFullPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const {
    topic,
    language = 'ko',
    persona = '정보를 쉽고 재미있게 전달하는 유튜버',
    tone = 'Z세대, 솔직한, 약간 도발적',
    maxScenes = 0,
    stylePrefix = 'whiteboard animation style, white background, simple clean illustration, black outlines',
    voiceRate = '+10%',
    outputDir = './outputs',
    fps = 30,
    category,
    knowledgeBase,
    userId,
    stylePresetName = 'whiteboard',
  } = options;

      // maxScenes 자동 계산
  let finalMaxScenes = maxScenes;
  if (finalMaxScenes === 0) {
    const durationMatch = knowledgeBase?.match(/길이:\s*(\d+)초/);
    const originalDuration = durationMatch ? parseInt(durationMatch[1]) : 0;
    if (originalDuration > 120) {
      finalMaxScenes = Math.min(Math.ceil(originalDuration / 10), 80);
      console.log(`📐 롱폼 모드: 원본 ${originalDuration}초 → ${finalMaxScenes}씬`);
    } else {
      finalMaxScenes = 5;
      console.log(`📐 숏폼 모드: ${finalMaxScenes}씬`);
    }
  }



  const timestamp = Date.now();
  const projectDir = path.join(outputDir, `project_${timestamp}`);
  const audioDir = path.join(projectDir, 'audio');
  const imageDir = path.join(projectDir, 'images');
  const videoDir = path.join(projectDir, 'video');
  const publicAudioDir = path.resolve('./public/audio');

  [audioDir, imageDir, videoDir, publicAudioDir].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  console.log('═══════════════════════════════════════════');
  console.log('🎬 ReelzFactory — 풀 파이프라인 시작');
  console.log(`📂 카테고리: ${category || 'default'}`);
  console.log(`🎭 스타일: ${stylePresetName}`);
  console.log('═══════════════════════════════════════════\n');

  const startTime = Date.now();
  cleanupOldProjects(outputDir, 7);
  enforceStorageLimit(outputDir, 5000);
  // =====================
  // STEP 0: 사전 로드 (스타일 프리셋 + 캐릭터 레퍼런스)
  // =====================
  console.log('─── STEP 0: 사전 로드 ───\n');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';

  // 스타일 프리셋 로드
  const stylePreset = supabaseUrl
    ? await loadStylePreset(supabaseUrl, stylePresetName)
    : null;
  if (stylePreset) {
    console.log(`🎭 스타일 프리셋 적용: ${stylePreset.name}`);
  } else {
    console.log(`🎭 기본 스타일 사용 (${stylePresetName} 프리셋 없음)`);
  }

  // 캐릭터 레퍼런스 확인
  let characterRefUrl: string | null = null;
  if (supabaseUrl && userId && category) {
    characterRefUrl = await checkCharacterRefExists(supabaseUrl, userId, category);
    if (characterRefUrl) {
      console.log(`📸 캐릭터 레퍼런스 발견: ${category}`);
    } else {
      console.log(`📸 캐릭터 레퍼런스 없음 → 캐릭터 미등장 모드`);
    }
  }

  // knowledge_base 로드 (Supabase에서)
  let finalKnowledgeBase = knowledgeBase || '';
  if (!finalKnowledgeBase && supabaseUrl && userId && category) {
    try {
      const kbUrl = `${supabaseUrl}/storage/v1/object/public/uploads/${userId}/references/${category}/knowledge_base.txt`;
      const kbResponse = await fetch(kbUrl);
      if (kbResponse.ok) {
        finalKnowledgeBase = await kbResponse.text();
        console.log(`📚 knowledge_base 로드: ${finalKnowledgeBase.substring(0, 50)}...`);
      }
    } catch {}
  }

    // BGM 로드 (카테고리별 또는 공유 BGM)
  let bgmUrl: string | null = null;
  if (supabaseUrl && userId && category) {
    const categoryBgmUrl = `${supabaseUrl}/storage/v1/object/public/uploads/${userId}/references/${category}/bgm.mp3`;
    try {
      const bgmCheck = await fetch(categoryBgmUrl, { method: 'HEAD' });
      if (bgmCheck.ok) {
        bgmUrl = categoryBgmUrl;
        console.log(`🎵 카테고리 BGM 발견: ${category}/bgm.mp3`);
      }
    } catch {}

    if (!bgmUrl) {
      const sharedBgmUrl = `${supabaseUrl}/storage/v1/object/public/uploads/${userId}/bgm/shared/default.mp3`;
      try {
        const bgmCheck = await fetch(sharedBgmUrl, { method: 'HEAD' });
        if (bgmCheck.ok) {
          bgmUrl = sharedBgmUrl;
          console.log(`🎵 공유 BGM 사용: shared/default.mp3`);
        }
      } catch {}
    }

    if (!bgmUrl) {
      console.log(`🎵 BGM 없음 → 음성만 사용`);
    }
  }


  // =====================
  // STEP 1: 대본 생성
  // =====================
  console.log('\n─── STEP 1/5: 대본 생성 ───\n');
  const stepStart1 = Date.now();

  const script = await generateScript({
    topic,
    persona,
    tone,
    maxScenes: finalMaxScenes,
    stylePrefix,
    category,
    knowledgeBase: finalKnowledgeBase || undefined,
    language,
  });

  const step1Time = ((Date.now() - stepStart1) / 1000).toFixed(1);
  console.log(`\n✅ 대본 완료: "${script.title}" (${script.scenes.length}씬, ${step1Time}초)\n`);

  // =====================
  // STEP 2: 이미지 생성
  // =====================
  console.log('─── STEP 2/5: 이미지 생성 ───\n');
  const stepStart2 = Date.now();

  const imageUrls: string[] = [];
  for (let i = 0; i < script.scenes.length; i++) {
    const scene = script.scenes[i];

    // [CHARACTER] / [NO_CHARACTER] 태그 파싱
    let cleanPrompt = scene.imagePrompt;
    let forceNoCharacter = false;

    if (cleanPrompt.startsWith('[NO_CHARACTER]')) {
      forceNoCharacter = true;
      cleanPrompt = cleanPrompt.replace('[NO_CHARACTER]', '').trim();
    } else if (cleanPrompt.startsWith('[CHARACTER]')) {
      cleanPrompt = cleanPrompt.replace('[CHARACTER]', '').trim();
    }

    try {
      console.log(`[${i + 1}/${script.scenes.length}] 이미지 생성 중...`);
      const imageUrl = await generateImage({
        prompt: cleanPrompt,
        category: category || 'default',
        sceneType: scene.type,
        characterRefUrl: characterRefUrl || undefined,
        stylePreset: stylePreset || undefined,
        forceNoCharacter,
      });
      imageUrls.push(imageUrl);

      if (i < script.scenes.length - 1) {
        await new Promise((r) => setTimeout(r, 8000));
      }
    } catch (error: any) {
      console.log(`⚠️ 씬 ${i} 이미지 실패, 8초 후 재시도...`);
      await new Promise((r) => setTimeout(r, 8000));
      try {
        const imageUrl = await generateImage({
          prompt: cleanPrompt,
          category: category || 'default',
          sceneType: scene.type,
          forceNoCharacter: true,
        });
        imageUrls.push(imageUrl);
      } catch (e2: any) {
        console.log(`❌ 씬 ${i} 재시도도 실패`);
        imageUrls.push('');
      }
    }
  }

  const step2Time = ((Date.now() - stepStart2) / 1000).toFixed(1);
  const successImages = imageUrls.filter((u) => u).length;
  console.log(`\n✅ 이미지 완료: ${successImages}/${script.scenes.length}장 (${step2Time}초)\n`);

  // =====================
  // STEP 3: 음성 생성
  // =====================
  console.log('─── STEP 3/5: 음성 생성 ───\n');
  const stepStart3 = Date.now();

  const audioPaths: string[] = [];

  for (let i = 0; i < script.scenes.length; i++) {
    const scene = script.scenes[i];
    const audioPath = path.join(audioDir, `scene_${i}.mp3`);
    try {
      await generateVoice({
        text: scene.text,
        outputPath: audioPath,
        language,
        category: category || 'general',
        isLongform: finalMaxScenes > 10,
      });
      audioPaths.push(audioPath);
    } catch (error: any) {
      console.log(`⚠️ 씬 ${i} 음성 실패`);
      audioPaths.push('');
    }
  }

  const step3Time = ((Date.now() - stepStart3) / 1000).toFixed(1);
  console.log(`\n✅ 음성 완료: ${audioPaths.filter((a) => a).length}/${script.scenes.length}개 (${step3Time}초)\n`);

  // =====================
  // STEP 4: 자막 생성 + 오디오를 public으로 복사
  // =====================
  console.log('─── STEP 4/5: 자막 생성 ───\n');
  const stepStart4 = Date.now();

  const scenesData: any[] = [];
  for (let i = 0; i < script.scenes.length; i++) {
    const scene = script.scenes[i];
    let words: any[] = [];
    let duration = 3;

    if (audioPaths[i]) {
      try {
        const caption = await generateCaption(audioPaths[i], i, {
          modelSize: 'base',
          language,
        });
        if (caption.success && caption.words.length > 0) {
          words = caption.words;
          duration = caption.duration;
        }
      } catch (error: any) {
        console.log(`⚠️ 씬 ${i} 자막 실패, 기본값 사용`);
      }
    }

    if (duration <= 0 && audioPaths[i] && fs.existsSync(audioPaths[i])) {
      const stats = fs.statSync(audioPaths[i]);
      duration = stats.size / 6000;
      console.log(`⏱️ 씬 ${i} 오디오 길이 추정: ${duration.toFixed(1)}초`);
    }
    if (duration <= 0) duration = 3;

    const totalDuration = duration + 1.0;
    const durationInFrames = Math.ceil(totalDuration * fps);

    let audioStaticUrl = '';
    if (audioPaths[i] && fs.existsSync(audioPaths[i])) {
      const audioFileName = `scene_${timestamp}_${i}.mp3`;
      const publicAudioPath = path.join(publicAudioDir, audioFileName);
      fs.copyFileSync(audioPaths[i], publicAudioPath);
      audioStaticUrl = `http://localhost:3000/public/audio/${audioFileName}`;
      console.log(`📁 오디오 복사: ${audioFileName}`);
    }

    scenesData.push({
      imageUrl: imageUrls[i] || '',
      audioUrl: audioStaticUrl,
      words,
      subtitleEmphasis: scene.subtitleEmphasis || [],
      durationInFrames,
    });
  }

  const step4Time = ((Date.now() - stepStart4) / 1000).toFixed(1);
  console.log(`\n✅ 자막 완료 (${step4Time}초)\n`);

  // =====================
  // STEP 5: 영상 렌더링
  // =====================
  console.log('─── STEP 5/5: 영상 렌더링 ───\n');
  const stepStart5 = Date.now();

  const videoPath = path.resolve(path.join(videoDir, 'shorts.mp4'));
  const entryPoint = path.resolve('./remotion/src/entry.tsx');

   const props = {
    fps,
    scenes: scenesData,
    bgmUrl: bgmUrl || undefined,
    bgmVolume: 0.15,
    headline: (() => {
      const h = script.metadata?.headline;
      if (h && h.line1 && h.line2) {
        return `${h.line1}\n${h.line2}`;
      }
      // 폴백: title에서 자동 생성
      const t = (script.metadata?.title || script.title || '')
        .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '')
        .trim();
      if (t.length <= 10) return t;
      const mid = Math.ceil(t.length / 2);
      const spaceIdx = t.lastIndexOf(' ', mid);
      const idx = spaceIdx > 2 ? spaceIdx : mid;
      return t.slice(0, idx).trim() + '\n' + t.slice(idx).trim();
    })(),
  };


  const propsPath = path.resolve(path.join(projectDir, 'render-props.json'));
  fs.writeFileSync(propsPath, JSON.stringify(props));

  const scriptPath = path.join(projectDir, 'script.json');
  fs.writeFileSync(scriptPath, JSON.stringify(script, null, 2));

  try {
    console.log('🎬 렌더링 중... (1~3분 소요)\n');

    execSync(
      `npx remotion render "${entryPoint}" ShortsVideo "${videoPath}" --props="${propsPath}" --timeout=120000 --public-dir="./public"`,
      { stdio: 'inherit', timeout: 600000 }
    );

    const step5Time = ((Date.now() - stepStart5) / 1000).toFixed(1);
    console.log(`\n✅ 렌더링 완료 (${step5Time}초)\n`);
  } catch (error: any) {
    console.error(`\n❌ 렌더링 실패: ${error.message}`);
    throw error;
  }

  // =====================
  // 정리
  // =====================
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalDuration = scenesData.reduce(
    (sum: number, s: any) => sum + s.durationInFrames / fps,
    0
  );

  let videoSize = '0';
  if (fs.existsSync(videoPath)) {
    videoSize = (fs.statSync(videoPath).size / (1024 * 1024)).toFixed(1);
  }

  try {
    const publicFiles = fs.readdirSync(publicAudioDir);
    publicFiles.forEach((f) => {
      if (f.includes(`${timestamp}`)) {
        fs.unlinkSync(path.join(publicAudioDir, f));
      }
    });
  } catch {}

  // 이미지 비용 계산 (kontext 사용 여부에 따라)
  const kontextCount = script.scenes.filter((s) => {
    const p = s.imagePrompt;
    return !p.startsWith('[NO_CHARACTER]') && characterRefUrl;
  }).length;
  const flux11Count = script.scenes.length - kontextCount;
  const imageCost = kontextCount * 0.04 + flux11Count * 0.04;

  console.log('═══════════════════════════════════════════');
  console.log('🎉 ReelzFactory — 파이프라인 완료!');
  console.log('═══════════════════════════════════════════');
  console.log(`📌 주제: ${topic}`);
  console.log(`📂 카테고리: ${category || 'default'}`);
  console.log(`🎬 제목: ${script.title}`);
  console.log(`🎞️ 씬 수: ${script.scenes.length} (캐릭터: ${kontextCount}, 배경: ${flux11Count})`);
  console.log(`⏱️ 영상 길이: ${totalDuration.toFixed(1)}초`);
  console.log(`📁 영상 파일: ${videoPath}`);
  console.log(`📊 파일 크기: ${videoSize}MB`);
  console.log(`⏰ 총 소요 시간: ${totalTime}초`);
  console.log(`🏷️ 태그: ${script.metadata?.tags?.length || 0}개`);
  console.log(`📂 프로젝트 폴더: ${projectDir}`);
  console.log('═══════════════════════════════════════════\n');

  const result: PipelineResult = {
    topic,
    title: script.title,
    videoPath,
    totalScenes: script.scenes.length,
    totalDuration,
    metadata: script.metadata,
    costs: {
      script: '~$0.01',
      images: `~$${imageCost.toFixed(2)}`,
      voice: '$0 (Google TTS)',
      caption: '$0 (local Whisper)',
      render: '$0 (local Remotion)',
      total: `~$${(0.01 + imageCost).toFixed(2)}`,
    },
  };

  const resultPath = path.join(projectDir, 'result.json');
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));

  return result;
}
