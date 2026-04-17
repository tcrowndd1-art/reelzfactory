import 'dotenv/config';
import * as fal from "@fal-ai/serverless-client";
import * as fs from "fs";
import * as path from "path";

fal.config({ credentials: process.env.FAL_KEY! });

async function testLipSync() {
  console.log("\n🎤 === Kling LipSync 테스트 (음성+이미지 → 립싱크) ===\n");

  // 1. 캐릭터 이미지
  const imagePath = path.resolve("packages/pipeline/assets/characters/acerola_c_v1/reference/front.png");
  if (!fs.existsSync(imagePath)) {
    console.error("❌ front.png 없음");
    return;
  }
  
  const imageBuffer = fs.readFileSync(imagePath);
  console.log("✅ 이미지:", (imageBuffer.length / 1024).toFixed(0), "KB");

  // 2. 이미지 업로드
  console.log("⏳ 이미지 업로드 중...");
  const imageUrl = await fal.storage.upload(imageBuffer, "image/png");
  console.log("✅ 이미지 URL:", imageUrl);

  // 3. Gemini TTS로 음성 생성
  console.log("\n⏳ Gemini TTS 음성 생성 중...");
  const ttsText = "스트레스 한번에 비타민C가 한시간만에 고갈된다는 사실, 알고 계셨습니까?";
  
  const ttsResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: ttsText }] }],
        generationConfig: {
          response_modalities: ["AUDIO"],
          speech_config: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Charon" }
            }
          }
        }
      })
    }
  );

  const ttsData = await ttsResponse.json();
  const audioBase64 = ttsData?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  
  if (!audioBase64) {
    console.error("❌ TTS 실패:", JSON.stringify(ttsData).substring(0, 300));
    return;
  }

  // 음성 파일 저장
  const audioBuffer = Buffer.from(audioBase64, "base64");
  const audioPath = path.resolve("outputs/test_voice.wav");
  const outputDir = path.resolve("outputs");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(audioPath, audioBuffer);
  console.log("✅ 음성 생성:", (audioBuffer.length / 1024).toFixed(0), "KB");

  // 4. 음성 파일 업로드
  console.log("⏳ 음성 업로드 중...");
  const audioUrl = await fal.storage.upload(audioBuffer, "audio/wav");
  console.log("✅ 음성 URL:", audioUrl);

  // 5. Kling LipSync 호출 ($0.014/5초)
  console.log("\n🚀 Kling LipSync 호출!");
  console.log("💰 비용: $0.014 (5초)");
  console.log("⏱ 예상 소요: 약 12분\n");

  const startTime = Date.now();

  try {
    const result: any = await fal.subscribe('fal-ai/kling-video/ai-avatar/v2/standard', {
  input: {
    image_url: imageUrl,
    audio_url: audioUrl,
    prompt: "The character speaks directly to camera with natural lip movements and subtle head gestures.",
  },
      logs: true,
      onQueueUpdate: (update: any) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        if (update.status === "IN_QUEUE") {
          console.log(`  [${elapsed}s] 대기 중...`);
        }
        if (update.status === "IN_PROGRESS") {
          console.log(`  [${elapsed}s] 생성 중...`);
        }
      },
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ 립싱크 영상 생성 완료! (${elapsed}초)`);
    
    const videoUrl = (result as any).video?.url || (result as any).data?.video?.url;
    console.log("📹 영상 URL:", videoUrl || "URL 확인 필요");
    
    // 결과 저장
    fs.writeFileSync(
      path.join(outputDir, "lipsync_test_result.json"),
      JSON.stringify(result, null, 2)
    );
    console.log("💾 결과 저장: outputs/lipsync_test_result.json");
    console.log("\n🎉 영상 URL을 브라우저에 붙여넣어서 확인하세요!");

  } catch (error: any) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`\n❌ 에러 (${elapsed}초):`, error.message);
    if (error.body) console.error("상세:", JSON.stringify(error.body, null, 2));
  }
}

testLipSync();
