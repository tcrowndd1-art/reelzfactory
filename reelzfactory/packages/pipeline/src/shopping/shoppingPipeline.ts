import * as path from 'path';
import * as fs from 'fs';
import { generateShoppingScript, ShoppingScriptOutput } from './generateShoppingScript';
import { generateVoice } from '../voice/generateVoice';
import { renderVideo } from '../render/renderVideo';
import { uploadToYoutube } from '../upload/uploadYoutube';
import { generateImage } from '../image/generateImage';
import { analyzeProductImage } from './analyzeProduct';
import { generateAllSceneVideos } from './generateVideo';


export interface ShoppingPipelineOptions {
  productName: string;
  productDescription?: string;
  productImagePath?: string;
  productImageUrl?: string;
  language: string;
  mode: 'manual' | 'product_link' | 'video_link';
  uploadToYoutube?: boolean;
  privacyStatus?: 'private' | 'unlisted' | 'public';
}

export interface ShoppingPipelineResult {
  script: ShoppingScriptOutput;
  videoPath: string;
  youtubeUrl?: string;
  duration: number;
}

export async function runShoppingPipeline(options: ShoppingPipelineOptions): Promise<ShoppingPipelineResult> {
  const startTime = Date.now();
  const {
    productName,
    productDescription = '',
    productImagePath,
    productImageUrl,
    language,
    mode,
    privacyStatus = 'unlisted',
  } = options;

  const projectId = `shop_${Date.now()}`;
  const outputDir = path.resolve(`./outputs/${projectId}`);
  const audioDir = path.join(outputDir, 'audio');
  const videoDir = path.join(outputDir, 'video');
  fs.mkdirSync(audioDir, { recursive: true });
  fs.mkdirSync(videoDir, { recursive: true });

  const publicAudioDir = path.resolve('./public/audio');
  fs.mkdirSync(publicAudioDir, { recursive: true });

  console.log(`\n🛒 ===== 쇼핑 쇼츠 파이프라인 시작 =====`);
  console.log(`📦 제품: ${productName}`);
  console.log(`🌐 언어: ${language}`);
  console.log(`📂 출력: ${outputDir}\n`);

  // ── STEP 0: 제품 이미지 분석 ──
  let finalDescription = productDescription;
  if (productImagePath && fs.existsSync(productImagePath)) {
    console.log('🔍 Step 0: 제품 이미지 AI 분석...');
    try {
      const analysis = await analyzeProductImage(productImagePath, productName, language);
      finalDescription = [
        `제품명: ${analysis.productName}`,
        `카테고리: ${analysis.category}`,
        `특징: ${analysis.features.join(', ')}`,
        `타겟: ${analysis.targetAudience}`,
        `셀링포인트: ${analysis.sellingPoints.join(', ')}`,
        `무드: ${analysis.mood}`,
        `컬러: ${analysis.colorScheme}`,
        `설명: ${analysis.shortDescription}`,
      ].join('\n');
      console.log(`✅ 제품 분석 완료! 카테고리: ${analysis.category}`);
    } catch (error: any) {
      console.log(`⚠️ 이미지 분석 실패 (대본에 기본 정보만 사용): ${error.message}`);
    }
  } else {
    console.log('ℹ️ 제품 이미지 없음 — 제품명만으로 대본 생성');
  }

  // ── STEP 1: 대본 생성 ──
  console.log('📝 Step 1: 대본 생성...');
  const script = await generateShoppingScript({
    productName,
    productDescription: finalDescription,
    language,
  });
  console.log(`✅ 대본 완료: ${script.scenes.length}씬, 구조: ${script.structure}`);
  fs.writeFileSync(path.join(outputDir, 'script.json'), JSON.stringify(script, null, 2));

  // ── STEP 2: TTS 음성 생성 ──
  console.log('\n🎙️ Step 2: TTS 음성 생성...');
  const audioFileNames: string[] = [];
  for (let i = 0; i < script.scenes.length; i++) {
    const fileName = `shop_${projectId}_scene_${i}.mp3`;
    const audioPath = path.join(audioDir, `scene_${i}.mp3`);
    const publicPath = path.join(publicAudioDir, fileName);
    try {
      await generateVoice({
        text: script.scenes[i].text,
        outputPath: audioPath,
        language,
        category: 'shopping',
      });
      fs.copyFileSync(audioPath, publicPath);
      audioFileNames.push(`audio/${fileName}`);
      console.log(`  ✅ Scene ${i} 음성 완료`);
    } catch (error: any) {
      console.log(`  ⚠️ Scene ${i} 음성 실패: ${error.message}`);
      audioFileNames.push('');
    }
  }

    // ── STEP 3: 제품 이미지 준비 (원본 통일) ──
  console.log('\n🖼️ Step 3: 제품 이미지 준비...');
  const imageUrls: string[] = [];
  const productImg = productImagePath && fs.existsSync(productImagePath) ? productImagePath : '';

  if (productImg) {
    for (let i = 0; i < script.scenes.length; i++) {
      imageUrls.push(productImg);
      console.log(`  ✅ Scene ${i} 원본 제품 이미지 사용`);
    }
  } else {
    for (let i = 0; i < script.scenes.length; i++) {
      try {
        const imageUrl = await generateImage({
          prompt: script.scenes[i].imagePrompt,
          width: 720,
          height: 1280,
          category: 'shopping',
          forceNoCharacter: true,
        });
        imageUrls.push(imageUrl);
        console.log(`  ✅ Scene ${i} AI 이미지 생성`);
      } catch (error: any) {
        console.log(`  ⚠️ Scene ${i} 이미지 실패: ${error.message}`);
        imageUrls.push('');
      }
    }
  }

    // ── STEP 3.5: Kling 프롬프트 AI 생성 + 영상 변환 ──
  console.log('\n🎬 Step 3.5: Kling 영상 생성...');

  // 3.5-A: video_prompts.txt 레퍼런스 로드 + AI 프롬프트 생성
  const videoPromptsPath = path.resolve('./packages/pipeline/src/shopping/references/video_prompts.txt');
  const videoPromptsRef = fs.existsSync(videoPromptsPath)
    ? fs.readFileSync(videoPromptsPath, 'utf-8').slice(0, 3000)
    : '';

  const { default: OpenAI } = await import('openai');
  const klingClient = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  let klingPrompts: string[];
  try {
    console.log('  🤖 AI가 Kling 프롬프트 생성 중...');
    const klingResponse = await klingClient.chat.completions.create({
      model: 'google/gemini-2.5-pro',
      messages: [
        {
          role: 'system',
          content: `You create Kling AI video prompts for product advertisement videos.
Each prompt makes a 5-second video from ONE product photo.

REFERENCE STYLE GUIDE:
${videoPromptsRef}

RULES:
- Describe CAMERA MOVEMENT + LIGHTING + VISUAL EFFECTS only
- NO faces allowed, hands only if needed
- NO text overlays, NO UI elements
- Each scene must have DISTINCTLY DIFFERENT camera work:
  Scene 1: close-up/macro detail shot with dramatic lighting change
  Scene 2: medium shot with orbiting/rotating camera movement  
  Scene 3: wide/lifestyle shot with smooth pull-back or dolly movement
- Use realistic, natural lighting (NOT studio/AI look)
- Include specific details: light direction, shadow movement, surface texture, atmosphere
- Return ONLY a JSON array of exactly 3 strings
- NO markdown, NO code blocks, NO explanation`
        },
        {
          role: 'user',
          content: `Product: ${productName}
Scene 1 narration: ${script.scenes[0]?.text || ''}
Scene 2 narration: ${script.scenes[1]?.text || ''}
Scene 3 narration: ${script.scenes[2]?.text || ''}

Generate 3 cinematic Kling video prompts (5 seconds each), each with completely different camera movement.`
        }
      ],
      max_tokens: 1000,
    });
    const raw = klingResponse.choices[0]?.message?.content || '';
    const cleaned = raw.replace(/```json/gi, '').replace(/```/gi, '').trim();
    klingPrompts = JSON.parse(cleaned);
    if (!Array.isArray(klingPrompts) || klingPrompts.length < 3) throw new Error('Invalid array');
    console.log('  ✅ AI Kling 프롬프트 생성 완료');
  } catch (err: any) {
    console.log(`  ⚠️ AI 프롬프트 실패 (${err.message}), 기본 프롬프트 사용`);
    klingPrompts = [
      'Extreme close-up of product label and texture details, warm side lighting slowly shifting from left to right, shallow depth of field, slight lens flare, surface reflections visible, no faces',
      'Medium shot, camera slowly orbits 180 degrees around the product on a clean surface, natural window light casting soft moving shadows, product textures and colors clearly visible, no faces, slight handheld feel',
      'Wide lifestyle shot, smooth dolly zoom out revealing product in a warm natural setting, golden hour backlight gradually intensifying, dust particles floating in light beam, premium and elegant atmosphere, no faces',
    ];
  }

  // 3.5-B: Kling 영상 생성
  const sceneVideos = await generateAllSceneVideos(
    script.scenes.map((scene, i) => ({
      imageUrl: imageUrls[i],
      imagePrompt: klingPrompts[i] || klingPrompts[0],
    })),
    outputDir,
    'standard',
    5,
  );

  // ── STEP 4: FFmpeg 합성 (영상 5초 전체 활용 + TTS + crossfade) ──
  console.log('\n🎬 Step 4: FFmpeg 영상 합성...');
  const { execSync } = require('child_process');

  // 4-A: ffprobe 헬퍼 (영상 길이 측정)
  function getVideoDuration(filePath: string): number {
    try {
      const result = execSync(
        `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`,
        { encoding: 'utf-8', timeout: 10000 }
      ).trim();
      return parseFloat(result) || 5;
    } catch { return 5; }
  }

  // 4-B: 각 씬별 영상 + 음성 합성 (영상 전체 길이 유지)
  const finalParts: string[] = [];
  for (let i = 0; i < script.scenes.length; i++) {
    const videoFile = sceneVideos[i]?.localPath;
    const audioFile = path.join(audioDir, `scene_${i}.mp3`);
    const partOutput = path.join(videoDir, `part_${i}.mp4`);

    // Kling 실패 시 이미지 줌 폴백
    if (!videoFile || !fs.existsSync(videoFile)) {
      const img = imageUrls[i];
      if (img && fs.existsSync(img)) {
        console.log(`  🔄 Scene ${i} Kling 실패 → 이미지 줌 폴백`);
        const zoomFilter = i % 2 === 0
          ? `zoompan=z='min(zoom+0.002,1.3)':d=120:s=1080x1920`
          : `zoompan=z='if(lte(zoom,1.0),1.3,max(1.001,zoom-0.002))':d=120:s=1080x1920`;
        if (fs.existsSync(audioFile)) {
          execSync(
            `ffmpeg -y -loop 1 -i "${img}" -i "${audioFile}" -c:v libx264 -c:a aac -t 5 -vf "${zoomFilter}" -pix_fmt yuv420p "${partOutput}"`,
            { encoding: 'utf-8', timeout: 60000 }
          );
        } else {
          execSync(
            `ffmpeg -y -loop 1 -i "${img}" -c:v libx264 -t 5 -vf "${zoomFilter}" -pix_fmt yuv420p -an "${partOutput}"`,
            { encoding: 'utf-8', timeout: 60000 }
          );
        }
        finalParts.push(partOutput);
        console.log(`  ✅ Scene ${i} 줌 폴백 완료`);
      } else {
        console.log(`  ⚠️ Scene ${i} 영상+이미지 모두 없음 — 스킵`);
      }
      continue;
    }

    if (fs.existsSync(audioFile)) {
      // 영상 전체 길이 유지 + TTS를 오디오 트랙으로 올림 (shortest 없음)
      execSync(
        `ffmpeg -y -i "${videoFile}" -i "${audioFile}" -map 0:v -map 1:a -c:v libx264 -c:a aac -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p" "${partOutput}"`,
        { encoding: 'utf-8', timeout: 120000 }
      );
      console.log(`  ✅ Scene ${i} 합성 완료 (영상 전체 유지)`);
    } else {
      execSync(
        `ffmpeg -y -i "${videoFile}" -c:v libx264 -an -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p" "${partOutput}"`,
        { encoding: 'utf-8', timeout: 60000 }
      );
      console.log(`  ⚠️ Scene ${i} 영상만 (음성 없음)`);
    }
    finalParts.push(partOutput);
  }

  // 4-C: crossfade로 이어붙이기 (동적 offset)
  const videoPath = path.join(videoDir, 'shopping_shorts.mp4');
  const FADE_DURATION = 0.5;

  if (finalParts.length >= 3) {
    const dur0 = getVideoDuration(finalParts[0]);
    const dur1 = getVideoDuration(finalParts[1]);
    const offset0 = Math.max(dur0 - FADE_DURATION, 1);
    const temp = path.join(videoDir, 'temp_cf.mp4');

    execSync(
      `ffmpeg -y -i "${finalParts[0]}" -i "${finalParts[1]}" -filter_complex "[0:v]setpts=PTS-STARTPTS[v0];[1:v]setpts=PTS-STARTPTS[v1];[v0][v1]xfade=transition=fade:duration=${FADE_DURATION}:offset=${offset0}[vout];[0:a]apad[a0pad];[a0pad][1:a]acrossfade=d=${FADE_DURATION}[aout]" -map "[vout]" -map "[aout]" -c:v libx264 -c:a aac "${temp}"`,
      { encoding: 'utf-8', timeout: 300000 }
    );
    console.log(`  ✅ Scene 0+1 crossfade (offset=${offset0.toFixed(1)}s)`);

    const durTemp = getVideoDuration(temp);
    const offset1 = Math.max(durTemp - FADE_DURATION, 1);

    execSync(
      `ffmpeg -y -i "${temp}" -i "${finalParts[2]}" -filter_complex "[0:v]setpts=PTS-STARTPTS[v0];[1:v]setpts=PTS-STARTPTS[v1];[v0][v1]xfade=transition=fade:duration=${FADE_DURATION}:offset=${offset1}[vout];[0:a]apad[a0pad];[a0pad][1:a]acrossfade=d=${FADE_DURATION}[aout]" -map "[vout]" -map "[aout]" -c:v libx264 -c:a aac "${videoPath}"`,
      { encoding: 'utf-8', timeout: 300000 }
    );
    console.log(`  ✅ 최종 crossfade (offset=${offset1.toFixed(1)}s)`);
    fs.unlinkSync(temp);
  } else if (finalParts.length === 2) {
    const dur0 = getVideoDuration(finalParts[0]);
    const offset0 = Math.max(dur0 - FADE_DURATION, 1);
    execSync(
      `ffmpeg -y -i "${finalParts[0]}" -i "${finalParts[1]}" -filter_complex "[0:v]setpts=PTS-STARTPTS[v0];[1:v]setpts=PTS-STARTPTS[v1];[v0][v1]xfade=transition=fade:duration=${FADE_DURATION}:offset=${offset0}[vout];[0:a]apad[a0pad];[a0pad][1:a]acrossfade=d=${FADE_DURATION}[aout]" -map "[vout]" -map "[aout]" -c:v libx264 -c:a aac "${videoPath}"`,
      { encoding: 'utf-8', timeout: 300000 }
    );
    console.log(`  ✅ crossfade 완료 (2씬)`);
  } else if (finalParts.length === 1) {
    fs.copyFileSync(finalParts[0], videoPath);
    console.log('  ✅ 단일 영상 복사');
  } else {
    console.log('  ❌ 합성할 영상 없음');
  }
  console.log(`✅ 최종 영상: ${videoPath}`);


  // ── STEP 6: YouTube 업로드 ──
  let youtubeUrl: string | undefined;
  if (options.uploadToYoutube !== false) {
    console.log('\n📤 Step 6: YouTube 업로드...');
    try {
      const result = await uploadToYoutube({
        videoPath,
        title: `${script.title} #Shorts`,
        description: `${script.hook}\n\n${script.hashtags.join(' ')}`,
        tags: script.hashtags.map(t => t.replace('#', '')),
        privacyStatus,
        categoryId: '22',
      });
      youtubeUrl = result.url;
      console.log(`✅ 업로드 완료: ${youtubeUrl}`);
    } catch (error: any) {
      console.log(`⚠️ 업로드 실패: ${error.message}`);
    }
  }

  audioFileNames.forEach(f => {
    if (f) {
      const p = path.resolve(`./public/${f}`);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  });

  const duration = (Date.now() - startTime) / 1000;
  console.log(`\n🎉 ===== 쇼핑 쇼츠 완료! =====`);
  console.log(`⏱️ 소요: ${duration.toFixed(1)}초`);
  console.log(`📁 영상: ${videoPath}`);
  if (youtubeUrl) console.log(`🔗 YouTube: ${youtubeUrl}`);

  return { script, videoPath, youtubeUrl, duration };
}
