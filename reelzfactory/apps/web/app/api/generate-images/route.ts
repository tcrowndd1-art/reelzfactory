import { NextRequest, NextResponse } from "next/server";

interface Scene {
  id: number;
  type: string;
  text: string;
  imagePrompt: string;
}

interface ImageResult {
  sceneId: number;
  imageUrl: string;
  success: boolean;
  error?: string;
  retries?: number;
}

const MOOD_BOOST: Record<string, string> = {
  hook: ", extreme close-up, intense dramatic impact, attention-grabbing",
  cta: ", wide shot, epic scale, inspiring atmosphere",
  twist: ", dramatic reveal, high contrast, suspenseful",
  core: ", clear educational illustration, well-organized layout",
  core_personal: ", warm personal atmosphere, soft lighting",
  situation: ", relatable everyday scene, natural lighting",
  promise: ", bright optimistic mood, forward-looking",
};

const DEFAULT_STYLE = "whiteboard animation style, white background, simple clean illustration, black outlines, limited color palette, clean and modern";

// 안전하지 않은 키워드 제거
const UNSAFE_WORDS = [
  "blood", "bleeding", "dead", "death", "dying", "kill", "murder",
  "weapon", "gun", "knife", "explosion", "bomb", "terror",
  "naked", "nude", "sexy", "erotic", "nsfw",
  "gore", "horror", "corpse", "wound", "injury", "scar",
  "drug", "cocaine", "heroin", "meth",
  "suicide", "hanging", "drown",
  "war", "battlefield", "soldier shooting",
  "피", "죽음", "살인", "무기", "폭발", "나체", "공포",
];

function sanitizePrompt(prompt: string): string {
  let cleaned = prompt;
  for (const word of UNSAFE_WORDS) {
    const regex = new RegExp(word, "gi");
    cleaned = cleaned.replace(regex, "");
  }
  // 이중 공백 정리
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
  return cleaned;
}

// 실패 시 더 안전한 대체 프롬프트 생성
function makeSafePrompt(sceneType: string, originalText: string): string {
  const safeDescriptions: Record<string, string> = {
    hook: "dramatic bold text graphic with exclamation mark, eye-catching visual, bright colors, impactful design",
    cta: "motivational scene with upward arrow, positive energy, bright sunshine, hopeful atmosphere",
    twist: "light bulb moment, surprise reveal, question mark turning into exclamation mark",
    core: "clean infographic style illustration, organized information layout, icons and diagrams",
    core_personal: "cozy personal workspace, warm coffee cup, friendly atmosphere",
    situation: "everyday life scene, modern city, relatable moment",
    promise: "bright future path, open door with light, optimistic scene",
  };

  const safeDesc = safeDescriptions[sceneType] || "clean modern illustration, simple and clear design";
  return `${DEFAULT_STYLE}, ${safeDesc}, high quality, sharp details, no text, vivid colors`;
}

async function generateOneImage(
  prompt: string,
  sceneType: string,
  falKey: string,
  characterRefUrl?: string
): Promise<string> {
  const needsCharacter = prompt.includes("[CHARACTER]");
  const cleanPrompt = prompt.replace("[CHARACTER]", "").replace("[NO_CHARACTER]", "").trim();
  const useKontext = needsCharacter && !!characterRefUrl;
  const modelId = useKontext ? "fal-ai/flux-pro/kontext" : "fal-ai/flux-2-pro";

  const mood = MOOD_BOOST[sceneType] || "";
  const suffix = needsCharacter
    ? "consistent character from reference image in same cartoon style, white background with scene elements"
    : "no human figures, scene depicted with simple icons and flat illustrations on white background";

  const sanitized = sanitizePrompt(cleanPrompt);
  const fullPrompt = `${DEFAULT_STYLE}, ${sanitized}${mood}, ${suffix}, high quality, sharp details, no blank space, vivid colors`;

  const input: Record<string, any> = {
    prompt: fullPrompt,
    image_size: { width: 1080, height: 1920 },
    num_images: 1,
    output_format: "jpeg",
    guidance_scale: useKontext ? 3.5 : 8.0,
    num_inference_steps: useKontext ? 28 : 32,
    negative_prompt: "deformed, shaky, blur, text, watermark, logo, low quality, blurry, nsfw, gore, blood, violence, weapon",
  };

  if (useKontext && characterRefUrl) {
    input.input_image_url = characterRefUrl;
  }

  const response = await fetch(`https://queue.fal.run/${modelId}`, {
    method: "POST",
    headers: {
      "Authorization": `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`fal.ai error ${response.status}: ${errText.substring(0, 200)}`);
  }

  const result = await response.json();

  if (result?.images?.[0]?.url) {
    return result.images[0].url;
  }
  if (result?.request_id) {
    return await pollFalResult(result.request_id, falKey, modelId);
  }
  throw new Error("No image in response");
}

async function pollFalResult(requestId: string, falKey: string, modelId: string): Promise<string> {
  const statusUrl = `https://queue.fal.run/${modelId}/requests/${requestId}/status`;
  const resultUrl = `https://queue.fal.run/${modelId}/requests/${requestId}`;

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const statusRes = await fetch(statusUrl, {
      headers: { "Authorization": `Key ${falKey}` },
    });
    const status = await statusRes.json();

    if (status.status === "COMPLETED") {
      const resultRes = await fetch(resultUrl, {
        headers: { "Authorization": `Key ${falKey}` },
      });
      const result = await resultRes.json();
      if (result?.images?.[0]?.url) return result.images[0].url;
      throw new Error("No image in completed result");
    }
    if (status.status === "FAILED") {
      throw new Error(`fal.ai job failed: ${status.error || "unknown"}`);
    }
  }
  throw new Error("fal.ai timeout after 120s");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scenes, falKey, characterRefUrl } = body;

    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return NextResponse.json({ error: "scenes array is required" }, { status: 400 });
    }
    if (!falKey) {
      return NextResponse.json({ error: "fal.ai API key is required" }, { status: 400 });
    }

    console.log(`[Images] Starting generation for ${scenes.length} scenes`);
    const results: ImageResult[] = [];
    const MAX_RETRIES = 3;

    for (const scene of scenes) {
      let success = false;
      let lastError = "";
      let retries = 0;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const isRetry = attempt > 0;
          const prompt = isRetry
            ? makeSafePrompt(scene.type, scene.text)
            : scene.imagePrompt;

          console.log(`[Images] Scene ${scene.id} (${scene.type}) - ${isRetry ? `retry ${attempt} (safe prompt)` : "generating"}...`);

          const imageUrl = await generateOneImage(
            prompt,
            scene.type,
            falKey,
            characterRefUrl
          );

          results.push({ sceneId: scene.id, imageUrl, success: true, retries: attempt });
          console.log(`[Images] Scene ${scene.id} - done${isRetry ? ` (retry ${attempt})` : ""}`);
          success = true;
          break;
        } catch (err: any) {
          lastError = err.message;
          retries = attempt + 1;
          console.log(`[Images] Scene ${scene.id} - attempt ${attempt + 1} failed: ${err.message}`);

          if (attempt < MAX_RETRIES - 1) {
            await new Promise(r => setTimeout(r, 2000));
          }
        }
      }

      if (!success) {
        console.error(`[Images] Scene ${scene.id} - all ${MAX_RETRIES} attempts failed`);
        results.push({ sceneId: scene.id, imageUrl: "", success: false, error: lastError, retries });
      }

      // 씬 사이 딜레이
      if (scenes.indexOf(scene) < scenes.length - 1) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[Images] Complete: ${successCount}/${scenes.length} success`);

    return NextResponse.json({ results, summary: { total: scenes.length, success: successCount } });
  } catch (error: any) {
    console.error("[Images] API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
