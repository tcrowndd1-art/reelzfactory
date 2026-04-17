import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import {
  getVoiceStyle,
  getAnimationVoiceStyle,
  VOICE_OPTIONS,
  ANIMATION_SCENE_OVERRIDES,
  RECOMMENDED_GENDER,
  type SupportedLang,
} from "@/lib/ttsStylePrompts";

// ===== TYPES =====
interface VoiceRequest {
  scenes: { id: number; text: string; type?: string }[];
  geminiKey: string;
  openrouterKey?: string;
  projectId: string;
  language?: string;
  category?: string;
  gender?: "male" | "female";
  voiceStyle?: string;
  voiceName?: string;
  speed?: number;
  isLongform?: boolean;
  isAnimation?: boolean;
}

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

// ===== LANGUAGE NOTES =====
const LANG_NOTES: Record<string, string> = {
  ko: "이 대본은 한국어입니다. 반드시 한국어로 읽으세요.",
  en: "Read in English. Standard American pronunciation.",
  pt: "Leia em português brasileiro.",
  es: "Lea en español latinoamericano.",
  ja: "日本語で読んでください。",
  vi: "Đọc bằng tiếng Việt.",
  th: "อ่านเป็นภาษาไทย",
  zh: "请用标准普通话朗读。",
};

// ===== TTS MODELS (Pro → Flash 폴백) =====
const TTS_MODELS = [
  { id: "gemini-2.5-flash-preview-tts", label: "Gemini 2.5 Flash TTS" },
  { id: "gemini-2.5-pro-preview-tts", label: "Gemini 2.5 Pro TTS" },
];

// ===== RESOLVE VOICE CONFIG (기존 ttsStylePrompts 활용) =====
function resolveVoiceConfig(req: VoiceRequest) {
  const lang = (req.language || "ko").substring(0, 2) as SupportedLang;
  const gender = req.gender || RECOMMENDED_GENDER[req.category || "health"] || "male";
  const category = req.category || "health";
  const voiceStyle = req.voiceStyle || "cognitive_gap";
  const isAnimation = req.isAnimation !== false; // 기본 true (애니메이션 스타일 우선)

  // 1) 애니메이션 스타일 (cognitive_gap / provocateur / gravity)
  if (isAnimation && ["cognitive_gap", "provocateur", "gravity"].includes(voiceStyle)) {
    try {
      const animStyle = getAnimationVoiceStyle(
        voiceStyle as "cognitive_gap" | "provocateur" | "gravity",
        lang,
        gender as "male" | "female"
      );
      return {
        voiceName: req.voiceName || animStyle.voiceName,
        directorNote: animStyle.directorNote,
        speed: req.speed || animStyle.speed,
        sceneOverrides: ANIMATION_SCENE_OVERRIDES[voiceStyle as keyof typeof ANIMATION_SCENE_OVERRIDES] || {},
      };
    } catch {
      console.log(`[TTS] Animation style ${voiceStyle}/${lang}/${gender} not found, falling back to category style`);
    }
  }

  // 2) 카테고리별 스타일 (쇼핑, 일반 등) — ttsStylePrompts.ts의 전체 스타일 활용
  const style = getVoiceStyle(
    category,
    lang,
    req.isLongform || false,
    gender as "male" | "female",
    req.voiceName
  );

  return {
    voiceName: req.voiceName || style.voiceName,
    directorNote: style.directorNote,
    speed: req.speed || 1.0,
    sceneOverrides: ANIMATION_SCENE_OVERRIDES.cognitive_gap || {},
  };
}

// ===== GENERATE ONE VOICE (Pro → Flash 폴백) =====
async function generateOneVoice(
  text: string,
  sceneType: string,
  geminiKey: string,
  voiceName: string,
  directorNote: string,
  sceneOverride: string,
  language: string,
  speed: number = 1.0,
  openaiKey?: string,
  openrouterKey?: string,
): Promise<{ buffer: Buffer; model: string }> {
  // speed를 자연어 pacing으로 변환
  const pacingNote = speed <= 0.7 ? "Speak extremely slowly. Every word has weight. Ultra slow tempo."
    : speed <= 0.85 ? "Speak slowly with gravitas. Measured, unhurried delivery."
    : speed <= 0.95 ? "Speak at a calm, slightly slower than normal pace."
    : speed <= 1.05 ? "Speak at a natural conversational pace."
    : speed <= 1.2 ? "Speak at a slightly faster, energetic pace."
    : speed <= 1.5 ? "Speak at a fast, energetic pace. Rapid delivery with momentum."
    : "Speak as fast as possible. Extremely rapid-fire delivery. No pauses.";
  const langNote = LANG_NOTES[language] || LANG_NOTES.en;

  const cleanedText = text
    .replace(/\.{2,}/g, ".")
    .replace(/\s*\.\s*/g, ". ")
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  const fullPrompt = `${directorNote}

### PACING
${pacingNote}

### LANGUAGE
${langNote}

### SCENE DIRECTION
${sceneOverride}

### RULES
- 반드시 같은 목소리 유지 (동일 화자)
- 자연스러운 호흡과 끊어읽기
- 배경음악이나 효과음 절대 없이 목소리만
- 성분명/브랜드명은 또박또박 발음
- 감정은 자연스럽게, 과장하지 말 것

#### TRANSCRIPT
${cleanedText}`;

  const body = {
    contents: [{ parts: [{ text: fullPrompt }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  };

  for (const model of TTS_MODELS) {
    try {
      await new Promise(r => setTimeout(r, 7000));
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (res.status === 429) {
        const err429 = await res.text();
        console.log(`[TTS] ${model.label} 429: ${err429.substring(0, 200)}`);
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        console.log(`[TTS] ${model.label} error ${res.status}: ${errText} → trying next model...`);
        continue;
      }

      const data = await res.json();
      const audioBase64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioBase64) {
        console.log(`[TTS] ${model.label} no audio → trying next model...`);
        continue;
      }

      const wavBuf = pcmToWavBuffer(audioBase64);
      try {
        const tmpWav = path.join(require("os").tmpdir(), `tts_${Date.now()}.wav`);
        const tmpMp3 = tmpWav.replace(".wav", ".mp3");
        fs.writeFileSync(tmpWav, wavBuf);
        execSync(`ffmpeg -y -i "${tmpWav}" -codec:a libmp3lame -b:a 128k "${tmpMp3}"`, { stdio: "ignore" });
        const mp3Buf = fs.readFileSync(tmpMp3);
        fs.unlinkSync(tmpWav);
        fs.unlinkSync(tmpMp3);
        return { buffer: mp3Buf, model: model.label };
      } catch {
        return { buffer: wavBuf, model: model.label };
      }
    } catch (err: any) {
      console.log(`[TTS] ${model.label} exception: ${err.message} → trying next model...`);
      continue;
    }
  }

    // 3순위: OpenAI TTS 폴백
  if (openaiKey) {
    try {
      console.log(`[TTS] Trying OpenAI TTS fallback...`);
      const oaiRes = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini-tts", input: text, voice: "alloy", response_format: "mp3", instructions: directorNote, speed: speed }),
      });
      if (oaiRes.ok) {
        const arrayBuf = await oaiRes.arrayBuffer();
        console.log(`[TTS] OpenAI TTS success (${(arrayBuf.byteLength / 1024).toFixed(1)}KB)`);
        return { buffer: Buffer.from(arrayBuf), model: "OpenAI gpt-4o-mini-tts" };
      }
      console.log(`[TTS] OpenAI TTS failed: ${oaiRes.status}`);
    } catch (e: any) {
      console.log(`[TTS] OpenAI exception: ${e.message}`);
    }
  }

  throw new Error("All TTS models failed (Gemini + OpenAI exhausted)");
}


// ===== POST HANDLER =====
export async function POST(req: NextRequest) {
  try {
    const body: VoiceRequest = await req.json();
    const { scenes, geminiKey, projectId } = body;

    if (!scenes?.length || !geminiKey || !projectId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const language = (body.language || "ko").substring(0, 2);
    const config = resolveVoiceConfig(body);

    // 기존 오디오 폴더 초기화
    const audioDir = path.join(process.cwd(), "public", "audio", projectId);
    if (fs.existsSync(audioDir)) { fs.rmSync(audioDir, { recursive: true, force: true }); }
    fs.mkdirSync(audioDir, { recursive: true });

    console.log(`\n[TTS] ===== Start: ${scenes.length} scenes =====`);
    console.log(`[TTS] Voice: ${config.voiceName} | Style: ${body.voiceStyle || "auto"} | Gender: ${body.gender || "male"} | Speed: ${config.speed}`);
    console.log(`[TTS] Director's Note preview: ${config.directorNote.substring(0, 100)}...`);
    console.log(`[TTS] Strategy: Gemini Pro → Flash fallback`);

    // RPM 안전 관리
    const RPM_LIMIT = 4;
    const WINDOW_MS = 60000;
    const requestTimestamps: number[] = [];
    const results: any[] = [];
    const modelUsage: Record<string, number> = {};
    let geminiExhausted = false;

    for (const scene of scenes) {
      const now = Date.now();
      while (requestTimestamps.length > 0 && requestTimestamps[0] < now - WINDOW_MS) {
        requestTimestamps.shift();
      }
      if (requestTimestamps.length >= RPM_LIMIT) {
        const waitTime = requestTimestamps[0] + WINDOW_MS - now + 1000;
        console.log(`[TTS] RPM limit reached. Waiting ${(waitTime / 1000).toFixed(0)}s...`);
        await new Promise(r => setTimeout(r, waitTime));
      }

      const sceneType = scene.type || "core";
      const overrides = config.sceneOverrides as Record<string, string>;
      const sceneOverride = overrides[sceneType] || "";

      try {
        console.log(`[TTS] Scene ${scene.id}/${scenes.length} (${sceneType}) generating...`);
        requestTimestamps.push(Date.now());

        let wavBuffer: Buffer;
        let usedModel: string;

        if (!geminiExhausted) {
          try {
            const result = await generateOneVoice(
              scene.text, sceneType, geminiKey,
              config.voiceName, config.directorNote,
              sceneOverride, language, config.speed, body.openaiKey, body.openrouterKey
            );
            wavBuffer = result.buffer;
            usedModel = result.model;
          } catch (e: any) {
            if (e.message.includes("All TTS models failed") && body.openaiKey) {
              console.log(`[TTS] Gemini exhausted → switching ALL remaining scenes to OpenAI`);
              geminiExhausted = true;
            } else {
              throw e;
            }
          }
        }

        if (geminiExhausted || !wavBuffer!) {
          const oaiRes = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: { "Authorization": `Bearer ${body.openaiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "gpt-4o-mini-tts", input: scene.text, voice: "alloy", response_format: "mp3", instructions: config.directorNote, speed: config.speed }),
          });
          if (!oaiRes.ok) throw new Error(`OpenAI TTS failed: ${oaiRes.status}`);
          const arrayBuf = await oaiRes.arrayBuffer();
          wavBuffer = Buffer.from(arrayBuf);
          usedModel = "OpenAI gpt-4o-mini-tts (auto-switch)";
        }

        modelUsage[usedModel] = (modelUsage[usedModel] || 0) + 1;

        const fileName = `scene_${scene.id}.mp3`;
        const filePath = path.join(audioDir, fileName);
        fs.writeFileSync(filePath, wavBuffer);
        const audioUrl = `/audio/${projectId}/${fileName}`;
        console.log(`[TTS] Scene ${scene.id} ✓ ${usedModel} (${(wavBuffer.length / 1024).toFixed(1)}KB)`);
        results.push({ sceneId: scene.id, audioUrl, success: true, model: usedModel });
      } catch (err: any) {
        if (err.message.includes("All TTS models failed")) {
          console.log(`[TTS] Scene ${scene.id} all failed → waiting 60s retry...`);
          await new Promise(r => setTimeout(r, 60000));
          try {
            requestTimestamps.push(Date.now());
            const { buffer: wavBuffer, model: usedModel } = await generateOneVoice(
              scene.text, sceneType, geminiKey,
              config.voiceName, config.directorNote,
              sceneOverride, language, config.speed, body.openaiKey, body.openrouterKey
            );
            modelUsage[usedModel] = (modelUsage[usedModel] || 0) + 1;
            const fileName = `scene_${scene.id}.mp3`;
            fs.writeFileSync(path.join(audioDir, fileName), wavBuffer);
            const audioUrl = `/audio/${projectId}/${fileName}`;
            console.log(`[TTS] Scene ${scene.id} ✓ retry ${usedModel}`);
            results.push({ sceneId: scene.id, audioUrl, success: true, model: usedModel });
            continue;
          } catch (retryErr: any) {
            results.push({ sceneId: scene.id, audioUrl: "", success: false, error: retryErr.message });
            continue;
          }
        }
        results.push({ sceneId: scene.id, audioUrl: "", success: false, error: err.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(`\n[TTS] ===== Done: ${successCount}/${scenes.length} =====`);
    console.log(`[TTS] Models used:`, modelUsage);

    return NextResponse.json({
      results,
      summary: {
        total: scenes.length,
        success: successCount,
        voiceName: config.voiceName,
        style: body.voiceStyle || "auto",
        speed: config.speed,
        modelUsage,
      },
      voiceOptions: VOICE_OPTIONS,
    });
  } catch (err: any) {
    console.error("[TTS] Fatal:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
