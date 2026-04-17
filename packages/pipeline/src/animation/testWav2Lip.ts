import 'dotenv/config';
import { fal } from '@fal-ai/client';
import * as fs from 'fs';
import * as path from 'path';

fal.config({ credentials: process.env.FAL_KEY! });

async function testWav2Lip() {
  console.log('\n🎬 === Wav2Lip 테스트 (무료) ===\n');

  // 이미지를 먼저 다운 → fal에 업로드 (확장자 보장)
  console.log('📸 인물 이미지 다운로드 중...');
  const imgRes = await fetch('https://thispersondoesnotexist.com');
  const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
  const outDir = path.resolve('outputs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const imgPath = path.join(outDir, 'test_face.jpg');
  fs.writeFileSync(imgPath, imgBuffer);
  console.log('✅ 저장:', imgPath, `(${(imgBuffer.length / 1024).toFixed(1)}KB)`);

  const imgFile = new File([imgBuffer], 'test_face.jpg', { type: 'image/jpeg' });
  const imageUrl = await fal.storage.upload(imgFile);
  console.log('✅ 업로드:', imageUrl);

  // 기존 TTS 재사용
  const audioPath = path.resolve('outputs/test_voice.wav');
  if (!fs.existsSync(audioPath)) { console.error('❌ test_voice.wav 없음'); return; }
  const audioBuffer = fs.readFileSync(audioPath);
  const audioFile = new File([audioBuffer], 'test_voice.wav', { type: 'audio/wav' });
  const audioUrl = await fal.storage.upload(audioFile);
  console.log('✅ 오디오:', audioUrl);

  console.log('\n⏳ Wav2Lip 생성 중...');
  const start = Date.now();
  try {
    const result = await fal.subscribe('fal-ai/wav2lip', {
      input: {
        face_url: imageUrl,
        audio_url: audioUrl,
        static: true,
        fps: 25,
        pads: [0, 15, 0, 0]
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
    console.log('📹 URL:', result.data?.video?.url);
    fs.writeFileSync(path.join(outDir, 'wav2lip_result.json'), JSON.stringify(result.data, null, 2));
    console.log('\n👆 URL 브라우저에서 확인!');
  } catch (e: any) {
    console.error(`\n❌ 에러 (${((Date.now()-start)/1000).toFixed(1)}초):`, e.message);
    if (e.body) console.error('상세:', JSON.stringify(e.body).slice(0, 500));
  }
}

testWav2Lip();
