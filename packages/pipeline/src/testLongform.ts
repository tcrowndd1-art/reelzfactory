import { generateScript } from './script';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const topic = process.argv[2] || '40대 이후 반드시 알아야 할 혈관 건강의 모든 것';
  const maxScenes = parseInt(process.argv[3] || '40');

  console.log('\n🎬 === 롱폼 대본 테스트 ===');
  console.log(`📌 주제: ${topic}`);
  console.log(`📌 최대 씬: ${maxScenes}`);
  console.log(`📌 모드: ${maxScenes > 10 ? '롱폼' : '숏폼'}`);

  const startTime = Date.now();

  const script = await generateScript({
    topic,
    persona: '정보를 쉽고 재미있게 전달하는 유튜버',
    tone: 'Z세대, 솔직한, 약간 도발적',
    maxScenes,
    stylePrefix: '',
    category: '건강',
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  const outputDir = path.resolve('outputs');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'test_longform_script.json');
  fs.writeFileSync(outputPath, JSON.stringify(script, null, 2));

  console.log(`\n✅ 대본 생성 완료 (${elapsed}초)`);
  console.log(`📄 제목: ${script.title}`);
  console.log(`🎞️ 씬 수: ${script.scenes?.length || 0}`);
  console.log(`📁 저장: ${outputPath}`);

  if (script.scenes) {
    let totalDuration = 0;
    script.scenes.forEach((scene: any, i: number) => {
      const dur = scene.durationEstimate || scene.duration_sec || 10;
      totalDuration += dur;
      console.log(`  씬${i + 1}: [${scene.type || scene.render_type || '?'}] ${dur}초 - "${(scene.text || scene.tts_script || '').substring(0, 30)}..."`);
    });
    console.log(`\n⏱️ 예상 총 길이: ${totalDuration}초 (${(totalDuration / 60).toFixed(1)}분)`);
  }

  if (script.metadata) {
    console.log(`🏷️ 태그: ${script.metadata.tags?.length || 0}개`);
    console.log(`📝 설명: ${(script.metadata.description || '').substring(0, 50)}...`);
  }

  console.log(`\n💰 비용: ~$0.02 (Gemini 대본만)`);
}

main().catch(console.error);
