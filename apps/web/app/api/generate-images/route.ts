import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

async function generateOneImage(
  prompt: string,
  sceneType: string,
  falKey: string,
  characterRefUrl?: string,
  styleOverride?: string,
  colorScheme?: string,
  promptPrefix?: string,
  engine?: string,
  aspectRatio?: string,
  styleTemplate?: string,
): Promise<string> {
  const needsCharacter = prompt.includes("[CHARACTER]");
  const cleanPrompt = prompt.replace("[CHARACTER]", "").replace("[NO_CHARACTER]", "").trim();
  const useKontext = needsCharacter && !!characterRefUrl;
  const ENGINE_MAP: Record<string, string> = {
    "flux-pro": "fal-ai/flux-2-pro",
    "nano-banana": "fal-ai/nano-banana",
    "flux-max": "fal-ai/flux-2-max",
    "nano-banana-pro": "fal-ai/nano-banana-pro",
    "seedream": "fal-ai/seedream-v4",
  };
  const baseModel = ENGINE_MAP[engine || "flux-pro"] || "fal-ai/flux-2-pro";
  const modelId = useKontext ? "fal-ai/flux-pro/kontext" : baseModel;

  const mood = MOOD_BOOST[sceneType] || "";
  const suffix = needsCharacter
    ? "consistent character from reference image in same cartoon style, white background with scene elements"
    : "no human figures, scene depicted with simple icons and flat illustrations on white background";

  // 채널 프리셋 적용: styleOverride > DEFAULT_STYLE
  const baseStyle = styleOverride || DEFAULT_STYLE;
  const colorNote = colorScheme ? `, ${colorScheme} color palette` : "";
  const prefixNote = promptPrefix ? `${promptPrefix}, ` : "";

  const fullPrompt = styleTemplate
    ? `${styleTemplate}\n\n${prefixNote}${cleanPrompt}${mood}, ${suffix}, high quality, sharp details, no blank space, vivid colors`
    : `${prefixNote}${baseStyle}${colorNote}, ${cleanPrompt}${mood}, ${suffix}, high quality, sharp details, no blank space, vivid colors`;

  const input: Record<string, any> = {
    prompt: fullPrompt,
    image_size: aspectRatio === "16:9" ? { width: 1920, height: 1080 } : { width: 1080, height: 1920 },
    num_images: 1,
    output_format: "jpeg",
    guidance_scale: useKontext ? 3.5 : 8.0,
    num_inference_steps: useKontext ? 28 : 32,
    negative_prompt: styleOverride === "money-data"
      ? "deformed, shaky, blur, watermark, logo, low quality, blurry, readable numbers, specific statistics, real data, actual percentages, legible digits, readable text"
      : "deformed, shaky, blur, text, watermark, logo, low quality, blurry",
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
    const { scenes, falKey, characterRefUrl, styleOverride, colorScheme, promptPrefix, referenceImages, engine, aspectRatio } = body;
    const resolvedCharRef = characterRefUrl || (referenceImages?.length > 0 ? referenceImages[0] : undefined);


    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return NextResponse.json({ error: "scenes array is required" }, { status: 400 });
    }
    if (!falKey) {
      return NextResponse.json({ error: "fal.ai API key is required" }, { status: 400 });
    }

    console.log(`[Images] Starting generation for ${scenes.length} scenes | engine: ${engine || "flux-pro"} | ratio: ${aspectRatio || "9:16"}`);
    // DB에서 스타일 템플릿 조회
    let styleTemplate = "";
    if (styleOverride) {
      const styleName = `style_${styleOverride.replace(/-/g, "_")}`;
      const { data } = await supabase
        .from("prompt_templates")
        .select("content")
        .eq("name", styleName)
        .eq("block_type", "image_style")
        .single();
      if (data?.content) {
        styleTemplate = data.content;
        console.log(`[Images] Style template loaded: ${styleName}`);
      }
    }

    // 병렬 처리 (동시 3개씩)
    const CONCURRENCY = 3;
    const results: ImageResult[] = [];

    for (let i = 0; i < scenes.length; i += CONCURRENCY) {
      const batch = scenes.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.allSettled(
        batch.map(async (scene: Scene) => {
          console.log(`[Images] Scene ${scene.id} (${scene.type}) - generating...`);

          // 1차 시도: 선택된 엔진
          try {
            const imageUrl = await generateOneImage(
              scene.imagePrompt, scene.type, falKey, resolvedCharRef,
              styleOverride, colorScheme, promptPrefix, engine, aspectRatio, styleTemplate,
            );
            console.log(`[Images] Scene ${scene.id} - done (${engine || "flux-pro"})`);
            return { sceneId: scene.id, imageUrl, success: true } as ImageResult;
          } catch (err1: any) {
            console.log(`[Images] Scene ${scene.id} - ${engine || "flux-pro"} failed: ${err1.message}`);

            // 2차 시도: flux-pro 폴백 (이미 flux-pro면 nano-banana로)
            const fallbackEngine = (engine === "flux-pro" || !engine) ? "nano-banana" : "flux-pro";
            try {
              console.log(`[Images] Scene ${scene.id} - fallback to ${fallbackEngine}...`);
              const imageUrl = await generateOneImage(
                scene.imagePrompt, scene.type, falKey, resolvedCharRef,
                styleOverride, colorScheme, promptPrefix, fallbackEngine, aspectRatio, styleTemplate,
              );
              console.log(`[Images] Scene ${scene.id} - done (fallback: ${fallbackEngine})`);
              return { sceneId: scene.id, imageUrl, success: true, error: `fallback: ${fallbackEngine}` } as ImageResult;
            } catch (err2: any) {
              console.error(`[Images] Scene ${scene.id} - all engines failed`);
              return { sceneId: scene.id, imageUrl: "", success: false, error: `${err1.message} → ${err2.message}` } as ImageResult;
            }
          }
        })
      );

      // Promise.allSettled 결과 처리
      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          results.push(result.value);
          // image_library 자동 저장
          if (result.value.success && result.value.imageUrl) {
            const scene = scenes.find((s: Scene) => s.id === result.value.sceneId);
            supabase.from("image_library").insert({
              image_url: result.value.imageUrl,
              style: styleOverride || "default",
              engine: engine || "flux-pro",
              scene_type: scene?.type || "unknown",
              prompt: scene?.imagePrompt || "",
              aspect_ratio: aspectRatio || "9:16",
              tags: scene?.type ? [scene.type, styleOverride || "default"] : [],
            }).then(({ error }) => {
              if (error) console.warn("[Images] Library save failed:", error.message);
              else console.log(`[Images] Saved to library: scene ${result.value.sceneId}`);
            });
          }
        } else {
          results.push({ sceneId: 0, imageUrl: "", success: false, error: result.reason?.message || "Unknown error" });
        }
      }

      // 배치 간 딜레이 (rate limit 방지)
      if (i + CONCURRENCY < scenes.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    const successCount = results.filter(r => r.success).length;
    const fallbackCount = results.filter(r => r.error?.startsWith("fallback")).length;
    console.log(`[Images] Complete: ${successCount}/${scenes.length} success (${fallbackCount} fallback)`);

    return NextResponse.json({
      results,
      summary: {
        total: scenes.length,
        success: successCount,
        fallback: fallbackCount,
        engine: engine || "flux-pro",
        aspectRatio: aspectRatio || "9:16",
      },
    });
  } catch (error: any) {
    console.error("[Images] API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}