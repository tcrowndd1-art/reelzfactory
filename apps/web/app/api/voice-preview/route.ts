import { NextRequest, NextResponse } from "next/server";

// ===== PCM → WAV =====
function pcmToWavBuffer(pcmBase64: string, sampleRate = 24000): Buffer {
  const pcm = Buffer.from(pcmBase64, "base64");
  const header = Buffer.alloc(44);
  const channels = 1, bitsPerSample = 16;
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

// ===== 언어별 기본 프리뷰 문장 =====
const PREVIEW_TEXTS: Record<string, string> = {
  ko: "안녕하세요. 이 목소리로 영상을 제작하게 됩니다. 자연스럽고 몰입감 있는 톤을 확인해 보세요.",
  en: "Hello. This is the voice that will be used for your video. Check the natural and immersive tone.",
  ja: "こんにちは。この声で動画を制作します。自然で没入感のあるトーンをご確認ください。",
  zh: "你好。这是将用于您视频的声音。请确认自然且沉浸的语调。",
  es: "Hola. Esta es la voz que se usará para tu video. Verifica el tono natural e inmersivo.",
  pt: "Olá. Esta é a voz que será usada no seu vídeo. Confira o tom natural e imersivo.",
  vi: "Xin chào. Đây là giọng nói sẽ được sử dụng cho video của bạn. Hãy kiểm tra giọng tự nhiên và cuốn hút.",
  th: "สวัสดีครับ นี่คือเสียงที่จะใช้ในวิดีโอของคุณ ลองฟังน้ำเสียงที่เป็นธรรมชาติและน่าดึงดูด",
};

// ===== TTS Models =====
const TTS_MODELS = [
  { id: "gemini-2.5-pro-preview-tts", label: "Gemini 2.5 Pro TTS" },
  { id: "gemini-2.5-flash-preview-tts", label: "Gemini 2.5 Flash TTS" },
];

// ===== OpenAI 음성 매핑 =====
const OPENAI_VOICE_MAP: Record<string, string> = {
  "Kore": "nova", "Puck": "onyx", "Charon": "echo",
  "Fenrir": "fable", "Aoede": "shimmer", "Leda": "nova",
  "Orus": "onyx", "Zephyr": "alloy",
};

// ===== TYPES =====
interface PreviewRequest {
  voiceName: string;
  text?: string;
  language?: string;
  speed?: number;
  stylePrompt?: string;
  ttsModel?: "pro" | "flash";
  geminiKey?: string;
  openaiKey?: string;
  engine?: "google" | "openai" | "clone";
  fishApiKey?: string;
  fishModelId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: PreviewRequest = await req.json();
    const { voiceName, engine = "google" } = body;

    if (!voiceName) {
      return NextResponse.json({ error: "voiceName is required" }, { status: 400 });
    }

    const geminiKey = body.geminiKey || process.env.GEMINI_API_KEY;
    const openaiKey = body.openaiKey || process.env.OPENAI_API_KEY;
    const language = (body.language || "ko").substring(0, 2);
    const speed = body.speed || 1.0;
    const text = body.text || PREVIEW_TEXTS[language] || PREVIEW_TEXTS.en;

    // Pacing 텍스트 변환
    const pacingNote =
      speed <= 0.85 ? "Speak slowly with gravitas. Measured, unhurried delivery."
        : speed <= 1.05 ? "Speak at a natural conversational pace."
          : speed <= 1.3 ? "Speak at a slightly faster, energetic pace."
            : "Speak at a fast, energetic pace.";

    console.log(`[Preview] Voice: ${voiceName} | Engine: ${engine} | Lang: ${language} | Speed: ${speed} | Model: ${body.ttsModel || "pro"} | Style: ${body.stylePrompt || "(none)"}`);

    let audioBuffer: Buffer | null = null;
    let usedModel = "";
    let contentType = "audio/wav";

    // ───── 1. Fish Audio Clone ─────
    if (engine === "clone") {
      const fishApiKey = body.fishApiKey || process.env.FISH_AUDIO_API_KEY;
      const fishModelId = body.fishModelId || process.env.NEXT_PUBLIC_FISH_VOICE_ID;
      if (!fishApiKey || !fishModelId) {
        return NextResponse.json({ error: "Fish Audio API key and model ID required for clone engine" }, { status: 400 });
      }

      const res = await fetch("https://api.fish.audio/v1/tts", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${fishApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reference_id: fishModelId,
          text,
          format: "mp3",
          prosody: { speed },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json({ error: `Fish Audio failed: ${res.status} - ${errText.substring(0, 200)}` }, { status: 502 });
      }

      const arrayBuf = await res.arrayBuffer();
      audioBuffer = Buffer.from(arrayBuf);
      usedModel = "Fish Audio Clone";
      contentType = "audio/mpeg";
    }

    // ───── 2. OpenAI TTS ─────
    else if (engine === "openai") {
      if (!openaiKey) {
        return NextResponse.json({ error: "OpenAI API key required for openai engine" }, { status: 400 });
      }
      const OPENAI_NATIVE_VOICES = ["alloy", "echo", "fable", "nova", "onyx", "shimmer"];
      const openaiVoice = OPENAI_NATIVE_VOICES.includes(voiceName) ? voiceName : (OPENAI_VOICE_MAP[voiceName] || "nova");

      const res = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-tts",
          input: text,
          voice: openaiVoice,
          response_format: "mp3",
          instructions: `Voice style: ${voiceName}. ${body.stylePrompt ? body.stylePrompt + ". " : ""}${pacingNote}`,
          speed,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json({ error: `OpenAI TTS failed: ${res.status} - ${errText.substring(0, 200)}` }, { status: 502 });
      }

      const arrayBuf = await res.arrayBuffer();
      audioBuffer = Buffer.from(arrayBuf);
      usedModel = `OpenAI ${openaiVoice}`;
      contentType = "audio/mpeg";
    }

    // ───── 3. Google Gemini TTS (기본) ─────
    else {
      if (!geminiKey) {
        return NextResponse.json({ error: "Gemini API key required" }, { status: 400 });
      }

      const prompt = `${body.stylePrompt ? "Style instruction: " + body.stylePrompt + ". " : ""}Read this text naturally with a clear, engaging voice.

### PACING
${pacingNote}

### RULES
- 자연스럽고 깔끔하게 읽기
- 배경음악이나 효과음 없이 목소리만
- 감정은 자연스럽게, 과장하지 말 것

#### TRANSCRIPT
${text}`;

      const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      };

      const orderedModels = body.ttsModel === "flash"
        ? [...TTS_MODELS].reverse()
        : TTS_MODELS;
      for (const model of orderedModels) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(requestBody),
            }
          );

          if (res.status === 429) {
            console.log(`[Preview] ${model.label} rate limited, trying next...`);
            continue;
          }

          if (!res.ok) {
            const errText = await res.text();
            console.log(`[Preview] ${model.label} error ${res.status}: ${errText.substring(0, 150)}`);
            continue;
          }

          const data = await res.json();
          const audioBase64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (!audioBase64) {
            console.log(`[Preview] ${model.label}: no audio data returned`);
            continue;
          }

          audioBuffer = pcmToWavBuffer(audioBase64);
          usedModel = model.label;
          contentType = "audio/wav";
          break;
        } catch (err: any) {
          console.log(`[Preview] ${model.label} exception: ${err.message}`);
          continue;
        }
      }

      // Gemini 전부 실패 시 OpenAI 폴백
      if (!audioBuffer && openaiKey) {
        console.log(`[Preview] All Gemini models failed, falling back to OpenAI...`);
        const openaiVoice = OPENAI_VOICE_MAP[voiceName] || "nova";
        const res = await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini-tts",
            input: text,
            voice: openaiVoice,
            response_format: "mp3",
            speed,
          }),
        });

        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          audioBuffer = Buffer.from(arrayBuf);
          usedModel = `OpenAI ${openaiVoice} (fallback)`;
          contentType = "audio/mpeg";
        }
      }
    }

    if (!audioBuffer) {
      return NextResponse.json({ error: "All TTS engines failed to generate preview audio" }, { status: 502 });
    }

    console.log(`[Preview] ✓ ${usedModel} → ${(audioBuffer.length / 1024).toFixed(1)}KB`);

    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": audioBuffer.length.toString(),
        "X-TTS-Model": usedModel,
        "X-TTS-Voice": voiceName,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: any) {
    console.error("[Preview] Fatal:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
