import { generateAnimationScript } from "./generateAnimationScript";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("\n🎬 === 애니메이션 대본 생성 테스트 시작 ===\n");
  console.log("⏳ Gemini API 호출 중... (10-30초 소요)\n");

  const startTime = Date.now();

  try {
    const result = await generateAnimationScript({
      product: "acerola_c",
      duration: 30,
      tone: "cognitive_gap",
      gender: "male",
      language: "ko",
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log("✅ 대본 생성 성공!\n");
    console.log(`📌 제목: ${result.title}`);
    console.log(`🎣 훅: ${result.scenes?.[0]?.tts_script || "N/A"}`);
    console.log(`🎬 총 씬: ${result.scenes?.length || 0}개`);
    console.log(`⏱️ 소요시간: ${elapsed}초`);
    console.log(`💰 예상비용: $${result.estimated_cost || "N/A"}`);

    console.log("\n--- 씬 상세 ---");
    if (result.scenes) {
      result.scenes.forEach((scene: any, i: number) => {
        console.log(
          `  [${i + 1}] ${scene.phase} | ${scene.duration_sec}s | ${scene.render_type} | "${(scene.tts_script || "").substring(0, 40)}..."`
        );
      });
    }

    // JSON 저장
    const outputDir = path.resolve("outputs");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, "test_animation_script.json");
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");
    console.log(`\n💾 저장 완료: ${outputPath}`);
    console.log("\n🎉 테스트 통과! Step 2로 진행 가능\n");

  } catch (error: any) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`\n❌ 에러 발생 (${elapsed}초 경과):`);
    console.error(`   ${error.message}`);
    if (error.response?.data) {
      console.error("   API 응답:", JSON.stringify(error.response.data, null, 2));
    }
    console.error("\n🔧 확인사항:");
    console.error("   1. .env에 OPENROUTER_API_KEY 확인");
    console.error("   2. generateAnimationScript.ts에 import 경로 확인");
    console.error("   3. knowledge JSON 파일들이 올바른 위치에 있는지 확인");
    process.exit(1);
  }
}

main();
