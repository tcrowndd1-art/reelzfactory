import 'dotenv/config';
import { fal } from '@fal-ai/client';
import * as fs from 'fs';
import * as path from 'path';

fal.config({ credentials: process.env.FAL_KEY! });

async function testWav2LipHuman() {
  console.log('\n🎬 === Wav2Lip 인간 립싱크 테스트 (무료) ===\n');

  // 무료 스톡 인물 이미지 (정면, 고해상도)
  const imageUrl = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=512&h=512&fit=crop&crop=face';
  console.log('📸 인물 이미지 URL:', imageUrl);

  // 기존 TTS 파일 재사용
  const audioPath = path.resolve('outputs/test_voice.wav');
  if (!fs.existsSync(audioPath)) {
    console.error('❌ outputs/test_voice.wav 없음. 이전 테스트에서 생성된 파일 필요');
    return;
  }
  console.log('🎤 오디오:', audioPath, `(${(fs.statSync(audioPath).size / 1024).toFixed(1)}KB)`);

  const audioBuffer = fs.readFileSync(audioPath);
  const audioFile = new File([audioBuffer], 'test_voice.wav', { type: 'audio/wav' });
  const audioUrl = await fal.storage.upload(audioFile);
  console.log('✅ 오디오 업로드:', audioUrl);

  console.log('\n⏳ Wav2Lip 생성 중... (약 30초~2분)');
  console.log('💰 비용: $0');

  const start = Date.now();
  try {
    const result = await fal.subscribe('fal-ai/wav2lip', {
      input: {
        face_url: imageUrl,
        audio_url: audioUrl,
        static: true,
        fps: 25,
        pads: [0, 15, 0, 0],
        resize_factor: 1,
        nosmooth: false
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          update.logs?.map((log) => log.message).forEach(console.log);
        }
      },
    });

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n✅ 완료! (${elapsed}초)`);
    console.log('📹 비디오 URL:', result.data?.video?.url);

    const outDir = path.resolve('outputs');
    fs.writeFileSync(
      path.join(outDir, 'wav2lip_human_result.json'),
      JSON.stringify(result.data, null, 2)
    );
    console.log('💾 저장: outputs/wav2lip_human_result.json');
    console.log('\n👆 URL을 브라우저에 붙여넣어서 퀄리티 확인!');

  } catch (e: any) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.error(`\n❌ 에러 (${elapsed}초):`, e.message);
    if (e.body) console.error('상세:', JSON.stringify(e.body).slice(0, 300));
  }
}

testWav2LipHuman();
