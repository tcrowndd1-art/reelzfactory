// packages/pipeline/src/animation/animationPipeline.ts
// 애니메이션 숏폼 풀 파이프라인 오케스트레이터

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';
import { generateAnimationScript, type AnimationScript, type AnimationScene, type AnimationScriptOptions } from './generateAnimationScript';
import { generateKlingVideo } from './generateKlingVideo';
import { generateVoice } from '../voice/generateVoice';
import { generateCaption } from '../caption/generateCaption';
import { generateImage } from '../image/generateImage';
import { getAnimationVoiceStyle, ANIMATION_SCENE_OVERRIDES } from '../voice/ttsStylePrompts';

dotenv.config();

// ── 타입 ──
export interface AnimationPipelineOptions {
  product: string;
  duration: 15 | 30 | 45 | 60;
  tone: 'cognitive_gap' | 'provocateur' | 'gravity';
  gender: 'male' | 'female';
  language?: string;
  structure?: string;
  characterId?: string;
  outputDir?: string;
  fps?: number;
}

export interface AnimationPipelineResult {
  title: string;
  videoPath: string;
  scriptPath: string;
  totalScenes: number;
  totalDuration: number;
  costs: {
    script: number;
    images: number;
    kling_video: number;
    kling_lipsync: number;
    tts: number;
    total: number;
  };
}

// ── 캐릭터 설정 로드 ──
function loadCharacterConfig(characterId: string) {
  const configPath = path.resolve(`./packages/pipeline/assets/characters/${characterId}/character_config.json`);
  if (!fs.existsSync(configPath)) {
    console.log(`⚠️ 캐릭터 ${characterId} config 없음, 범용 사용`);
    const fallback = path.resolve('./packages/pipeline/assets/characters/nutrilite_bot_v1/character_config.json');
    if (fs.existsSync(fallback)) return JSON.parse(fs.readFileSync(fallback, 'utf-8'));
    return null;
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

// ── 캐릭터 레퍼런스 이미지 경로 ──
function getCharacterImagePath(characterId: string, filename: string): string {
  return path.resolve(`./packages/pipeline/assets/characters/${characterId}/${filename}`);
}

// ── 메인 파이프라인 ──
export async function runAnimationPipeline(
  options: AnimationPipelineOptions
): Promise<AnimationPipelineResult> {
  const {
    product,
    duration,
    tone,
    gender,
    language = 'ko',
    structure,
    characterId = 'acerola_c_v1',
    outputDir = './outputs',
    fps = 30,
  } = options;

  const timestamp = Date.now();
  const projectDir = path.join(outputDir, `animation_${timestamp}`);
  const audioDir = path.join(projectDir, 'audio');
  const imageDir = path.join(projectDir, 'images');
  const videoDir = path.join(projectDir, 'video');
  const klingDir = path.join(projectDir, 'kling');
  const publicAudioDir = path.resolve('./public/audio');

  [audioDir, imageDir, videoDir, klingDir, publicAudioDir].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  console.log('═══════════════════════════════════════════');
  console.log('🎨 Animation Shorts Pipeline 시작');
  console.log(`  제품: ${product}`);
  console.log(`  길이: ${duration}초 | 톤: ${tone} | 성별: ${gender}`);
  console.log(`  캐릭터: ${characterId}`);
  console.log('═══════════════════════════════════════════\n');

  const startTime = Date.now();
  const costs = { script: 0, images: 0, kling_video: 0, kling_lipsync: 0, tts: 0, total: 0 };

  // ── 캐릭터 로드 ──
  const charConfig = loadCharacterConfig(characterId);
  const primaryRef = charConfig
    ? getCharacterImagePath(characterId, charConfig.kling_elements_config?.primary_reference || 'reference/front.png')
    : '';

  // =====================
  // STEP 1: 대본 생성
  // =====================
  console.log('─── STEP 1/6: 대본 생성 ───\n');
  const step1Start = Date.now();

  const script = await generateAnimationScript({
    product,
    duration,
    tone,
    gender,
    language,
    structure,
  });

  costs.script = 0.02;
  const step1Time = ((Date.now() - step1Start) / 1000).toFixed(1);
  console.log(`✅ 대본 완료 (${step1Time}초)\n`);

  // 대본 저장
  const scriptPath = path.join(projectDir, 'script.json');
  fs.writeFileSync(scriptPath, JSON.stringify(script, null, 2));

  // =====================
  // STEP 2: TTS 음성 생성 (전 씬)
  // =====================
  console.log('─── STEP 2/6: TTS 음성 생성 ───\n');
  const step2Start = Date.now();

  const voiceStyle = getAnimationVoiceStyle(tone, language as any, gender);
  const sceneOverrides = ANIMATION_SCENE_OVERRIDES[tone] || {};

  const audioPaths: string[] = [];

  for (let i = 0; i < script.scenes.length; i++) {
    const scene = script.scenes[i];
    const audioPath = path.join(audioDir, `scene_${i}.mp3`);

    // 씬별 감정 오버라이드 적용
    const phaseKey = scene.phase.replace(/_\d+$/, '') as keyof typeof sceneOverrides;
    const emotionTag = (sceneOverrides as any)[phaseKey] || '';
    const fullDirectorNote = emotionTag
      ? `${emotionTag}\n${voiceStyle.directorNote}`
      : voiceStyle.directorNote;

    try {
      await generateVoice({
        text: scene.tts_script,
        outputPath: audioPath,
        language,
        voiceName: voiceStyle.voiceName,
        customDirectorNote: fullDirectorNote,
        speakingRate: voiceStyle.speed,
        category: 'animation',
      });
      audioPaths.push(audioPath);
      console.log(`  [${i + 1}/${script.scenes.length}] ✅ TTS: "${scene.tts_script.substring(0, 30)}..."`);
    } catch (error: any) {
      console.log(`  [${i + 1}] ⚠️ TTS 실패: ${error.message}`);
      audioPaths.push('');
    }
  }

  costs.tts = 0.04;
  const step2Time = ((Date.now() - step2Start) / 1000).toFixed(1);
  console.log(`\n✅ TTS 완료: ${audioPaths.filter(a => a).length}/${script.scenes.length}개 (${step2Time}초)\n`);

  // =====================
  // STEP 3: 이미지 생성 (image_motion 씬)
  // =====================
  console.log('─── STEP 3/6: 이미지 생성 ───\n');
  const step3Start = Date.now();

  const sceneAssets: { type: string; path: string }[] = [];

  for (let i = 0; i < script.scenes.length; i++) {
    const scene = script.scenes[i];

    if (scene.render_type === 'image_motion') {
      try {
        const prompt = scene.image_prompt || `${charConfig?.master_base_prompt || ''}, ${scene.scene_note}`;
        console.log(`  [${i + 1}] 🖼️ Flux 이미지 생성 중...`);

        const imageUrl = await generateImage({
          prompt: `${prompt}, ${charConfig?.master_style_suffix || ''}`,
          category: 'animation',
          sceneType: scene.phase,
          characterRefUrl: primaryRef && fs.existsSync(primaryRef) ? primaryRef : undefined,
        });

        // 이미지 다운로드
        const imagePath = path.join(imageDir, `scene_${i}.png`);
        if (imageUrl.startsWith('http')) {
          const resp = await fetch(imageUrl);
          const buf = Buffer.from(await resp.arrayBuffer());
          fs.writeFileSync(imagePath, buf);
        }

        sceneAssets.push({ type: 'image', path: imageUrl });
        costs.images += 0.05;

        if (i < script.scenes.length - 1) {
          await new Promise(r => setTimeout(r, 2000));
        }
      } catch (error: any) {
        console.log(`  [${i + 1}] ⚠️ 이미지 실패: ${error.message}`);
        sceneAssets.push({ type: 'image', path: '' });
      }
    } else {
      sceneAssets.push({ type: scene.render_type, path: '' }); // Kling에서 처리
    }
  }

  const step3Time = ((Date.now() - step3Start) / 1000).toFixed(1);
  const imageCount = sceneAssets.filter(a => a.type === 'image' && a.path).length;
  console.log(`\n✅ 이미지 완료: ${imageCount}장 (${step3Time}초)\n`);

  // =====================
  // STEP 4: Kling 영상 생성 (action + lipsync 씬)
  // =====================
  console.log('─── STEP 4/6: Kling 영상 생성 ───\n');
  const step4Start = Date.now();

  for (let i = 0; i < script.scenes.length; i++) {
    const scene = script.scenes[i];

    if (scene.render_type === 'action') {
      const videoPath = path.join(klingDir, `scene_${i}.mp4`);
      const result = await generateKlingVideo({
        imageUrl: primaryRef,
        prompt: scene.video_prompt || scene.scene_note,
        duration: 5,
        outputPath: videoPath,
        mode: 'action',
        negativePrompt: charConfig?.negative_prompt,
      });

      if (result.success) {
        sceneAssets[i] = { type: 'video', path: videoPath };
        costs.kling_video += result.cost;
      }

      await new Promise(r => setTimeout(r, 3000));
    }

    if (scene.render_type === 'lipsync') {
      const videoPath = path.join(klingDir, `scene_${i}_lipsync.mp4`);

      // lipsync용 캐릭터 이미지 선택
      let lipsyncImage = primaryRef;
      if (scene.phase === 'cta' || scene.phase === 'action') {
        const ctaImage = getCharacterImagePath(characterId, 'actions/action_cta.png');
        if (fs.existsSync(ctaImage)) lipsyncImage = ctaImage;
      }

      const result = await generateKlingVideo({
        imageUrl: lipsyncImage,
        prompt: '',
        duration: scene.duration_sec,
        outputPath: videoPath,
        mode: 'lipsync',
        audioPath: audioPaths[i],
      });

      if (result.success) {
        sceneAssets[i] = { type: 'video', path: videoPath };
        costs.kling_lipsync += result.cost;
      }

      await new Promise(r => setTimeout(r, 3000));
    }
  }

  const step4Time = ((Date.now() - step4Start) / 1000).toFixed(1);
  const klingCount = sceneAssets.filter(a => a.type === 'video' && a.path).length;
  console.log(`\n✅ Kling 완료: ${klingCount}개 영상 (${step4Time}초)\n`);

  // =====================
  // STEP 5: 자막 생성 + Remotion 데이터 준비
  // =====================
  console.log('─── STEP 5/6: 자막 + 렌더 데이터 준비 ───\n');
  const step5Start = Date.now();

  const scenesData: any[] = [];

  for (let i = 0; i < script.scenes.length; i++) {
    const scene = script.scenes[i];
    let words: any[] = [];
    let audioDuration = scene.duration_sec;

    // 자막 생성
    if (audioPaths[i] && fs.existsSync(audioPaths[i])) {
      try {
        const caption = await generateCaption(audioPaths[i], i, {
          modelSize: 'base',
          language,
        });
        if (caption.success && caption.words.length > 0) {
          words = caption.words;
          audioDuration = caption.duration;
        }
      } catch {}
    }

    const totalDuration = Math.max(scene.duration_sec, audioDuration) + 0.5;
    const durationInFrames = Math.ceil(totalDuration * fps);

    // 오디오를 public으로 복사
    let audioStaticUrl = '';
    if (audioPaths[i] && fs.existsSync(audioPaths[i])) {
      const audioFileName = `anim_${timestamp}_${i}.mp3`;
      const publicPath = path.join(publicAudioDir, audioFileName);
      fs.copyFileSync(audioPaths[i], publicPath);
      audioStaticUrl = `http://localhost:3000/public/audio/${audioFileName}`;
    }

    // 씬 데이터 구성
    const asset = sceneAssets[i];
    scenesData.push({
      imageUrl: asset.type === 'image' ? asset.path : '',
      videoUrl: asset.type === 'video' ? asset.path : '',
      audioUrl: audioStaticUrl,
      words,
      subtitleEmphasis: [],
      durationInFrames,
      renderType: scene.render_type,
      motionType: scene.motion_type || 'slow_zoom_in',
    });
  }

  const step5Time = ((Date.now() - step5Start) / 1000).toFixed(1);
  console.log(`✅ 렌더 데이터 준비 완료 (${step5Time}초)\n`);

  // =====================
  // STEP 6: Remotion 렌더링
  // =====================
  console.log('─── STEP 6/6: 영상 렌더링 ───\n');
  const step6Start = Date.now();

  const videoPath = path.resolve(path.join(videoDir, 'animation_shorts.mp4'));
  const entryPoint = path.resolve('./remotion/src/entry.tsx');

  const props = {
    fps,
    scenes: scenesData,
    bgmVolume: 0.12,
    headline: script.hook_text,
  };

  const propsPath = path.resolve(path.join(projectDir, 'render-props.json'));
  fs.writeFileSync(propsPath, JSON.stringify(props));

  try {
    console.log('🎬 렌더링 중... (1~3분 소요)\n');
    execSync(
      `npx remotion render "${entryPoint}" ShortsVideo "${videoPath}" --props="${propsPath}" --timeout=120000 --public-dir="./public"`,
      { stdio: 'inherit', timeout: 600000 }
    );
    console.log(`\n✅ 렌더링 완료\n`);
  } catch (error: any) {
    console.error(`\n❌ 렌더링 실패: ${error.message}`);
    throw error;
  }

  const step6Time = ((Date.now() - step6Start) / 1000).toFixed(1);

  // =====================
  // 결과 정리
  // =====================
  costs.total = costs.script + costs.images + costs.kling_video + costs.kling_lipsync + costs.tts;
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalDuration = scenesData.reduce((sum: number, s: any) => sum + s.durationInFrames / fps, 0);

  let videoSize = '0';
  if (fs.existsSync(videoPath)) {
    videoSize = (fs.statSync(videoPath).size / (1024 * 1024)).toFixed(1);
  }

  // public 오디오 정리
  try {
    const publicFiles = fs.readdirSync(publicAudioDir);
    publicFiles.forEach(f => {
      if (f.includes(`${timestamp}`)) {
        fs.unlinkSync(path.join(publicAudioDir, f));
      }
    });
  } catch {}

  console.log('═══════════════════════════════════════════');
  console.log('🎉 Animation Shorts Pipeline 완료!');
  console.log('═══════════════════════════════════════════');
  console.log(`  제목: ${script.title}`);
  console.log(`  씬 수: ${script.total_scenes}`);
  console.log(`  영상 길이: ${totalDuration.toFixed(1)}초`);
  console.log(`  파일 크기: ${videoSize}MB`);
  console.log(`  소요 시간: ${totalTime}초`);
  console.log(`  비용: $${costs.total.toFixed(2)}`);
  console.log(`    대본: $${costs.script.toFixed(2)}`);
  console.log(`    이미지: $${costs.images.toFixed(2)}`);
  console.log(`    Kling 영상: $${costs.kling_video.toFixed(2)}`);
  console.log(`    Kling 립싱크: $${costs.kling_lipsync.toFixed(3)}`);
  console.log(`    TTS: $${costs.tts.toFixed(2)}`);
  console.log(`  영상: ${videoPath}`);
  console.log(`  프로젝트: ${projectDir}`);
  console.log('═══════════════════════════════════════════\n');

  const result: AnimationPipelineResult = {
    title: script.title,
    videoPath,
    scriptPath,
    totalScenes: script.total_scenes,
    totalDuration,
    costs,
  };

  fs.writeFileSync(path.join(projectDir, 'result.json'), JSON.stringify(result, null, 2));

  return result;
}
