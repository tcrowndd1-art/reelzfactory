import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// Whisper STT로 단어별 타임스탬프 추출
async function getWordTimestamps(
  audioPath: string,
  openaiKey: string
): Promise<{ word: string; start: number; end: number }[]> {
  const audioBuffer = fs.readFileSync(audioPath);
  const blob = new Blob([audioBuffer], { type: "audio/mp3" });

  const formData = new FormData();
  formData.append("file", blob, path.basename(audioPath));
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "word");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openaiKey}` },
    body: formData,
  });

  if (!res.ok) {
    console.log(`[Render] Whisper failed: ${res.status}`);
    return [];
  }

  const data = await res.json();
  return (data.words || []).map((w: any) => ({
    word: w.word,
    start: w.start,
    end: w.end,
  }));
}

// MP3 듀레이션 추출 (ffprobe)
function getAudioDuration(audioPath: string): number {
  try {
    const result = execSync(
      `ffprobe -v quiet -print_format json -show_format "${audioPath}"`,
      { encoding: "utf-8" }
    );
    const json = JSON.parse(result);
    return parseFloat(json.format.duration) || 3;
  } catch {
    return 3;
  }
}

function postProcessWords(
  words: { word: string; start: number; end: number }[],
  originalText: string
): { word: string; start: number; end: number }[] {
  const result: { word: string; start: number; end: number }[] = [];

  // 결합해야 할 고유명사
  const GLUE_PAIRS: [string, string][] = [
    ['뉴트리', '라이트'],
  ];

  // 한 글자 조사 패턴
  const JOSA_PATTERN = /^(은|는|이|가|을|를|의|에|도|만|로|과|와)$/;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];

    // 빈 문자열 처리 — 이전 단어가 숫자면 % 붙이기
    if (w.word.trim() === '' && result.length > 0) {
      const prev = result[result.length - 1];
      if (/\d$/.test(prev.word) && originalText.includes(prev.word + '%')) {
        prev.word = prev.word + '%';
        prev.end = w.end;
      }
      continue;
    }

    if (w.word.trim() === '') continue;

    // 고유명사 결합 체크
    const next = words[i + 1];
    let glued = false;
    if (next) {
      for (const [first, second] of GLUE_PAIRS) {
        if (w.word === first && next.word === second) {
          result.push({ word: first + second, start: w.start, end: next.end });
          i++;
          glued = true;
          break;
        }
      }
    }

    // 조사 결합 체크 — 다음 단어가 한 글자 조사면 붙이기
    if (!glued && next && JOSA_PATTERN.test(next.word)) {
      result.push({ word: w.word + next.word, start: w.start, end: next.end });
      i++;
      glued = true;
    }

    if (!glued) {
      result.push({ ...w });
    }
  }

  return result;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, scenes, openaiKey, subtitlePreset, renderPreset } = body;
    if (!projectId || !scenes || !openaiKey) {
      return NextResponse.json(
        { error: "Missing projectId, scenes, or openaiKey" },
        { status: 400 }
      );
    }

    const audioDir = path.join(process.cwd(), "public", "audio", projectId);
    const fps = 30;
    const remotionScenes: any[] = [];

    // Remotion은 http:// URL만 지원 — localhost 기반으로 변환
    const baseUrl = "http://localhost:3000";

    console.log(`[Render] Starting render data prep for ${scenes.length} scenes...`);

    for (const scene of scenes) {
      const audioFile = path.join(audioDir, `scene_${scene.id}.mp3`);

      if (!fs.existsSync(audioFile)) {
        console.log(`[Render] Scene ${scene.id} audio not found, skipping`);
        remotionScenes.push({
          imageUrl: scene.imageUrl || "",
          audioUrl: "",
          words: [],
          subtitleEmphasis: [],
          durationInFrames: 90,
        });
        continue;
      }

      // 1. 오디오 듀레이션 추출
      const duration = getAudioDuration(audioFile);
      const durationInFrames = Math.ceil(duration * fps);

      // 2. Whisper STT로 단어별 타임스탬프
      console.log(`[Render] Scene ${scene.id} - Whisper STT (${duration.toFixed(1)}s)...`);
      const rawWords = await getWordTimestamps(audioFile, openaiKey);
      const words = postProcessWords(rawWords, scene.narration || scene.text || '');
      console.log(`[Render] Scene ${scene.id} - ${words.length} words detected`);

      // 3. 강조 단어 추출
      const emphasis = words
        .filter((w) => /[A-Z]{2,}|[0-9]+|!/.test(w.word))
        .map((w) => w.word.toLowerCase());

      // 4. 이미지 URL 처리 (외부 URL은 그대로, 상대경로는 localhost로 변환)
      let imageUrl = scene.imageUrl || "";
      if (imageUrl && !imageUrl.startsWith("http")) {
        imageUrl = `${baseUrl}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
      }

      remotionScenes.push({
        imageUrl,
        audioUrl: `${baseUrl}/audio/${projectId}/scene_${scene.id}.mp3`,
        words,
        subtitleEmphasis: emphasis,
        durationInFrames,
      });
    }

    const totalFrames = remotionScenes.reduce((sum, s) => sum + s.durationInFrames, 0);
    const totalDuration = (totalFrames / fps).toFixed(1);

    console.log(`[Render] Prep done: ${remotionScenes.length} scenes, ${totalFrames} frames (${totalDuration}s)`);

    // renderData를 JSON 파일로 저장 (Remotion 렌더용)
    const renderDir = path.join(process.cwd(), "public", "render");
    if (!fs.existsSync(renderDir)) fs.mkdirSync(renderDir, { recursive: true });

    const renderJson = {
      scenes: remotionScenes,
      fps,
      totalFrames,
      totalDuration: parseFloat(totalDuration),
      subtitlePreset: subtitlePreset || null,
      renderPreset: renderPreset || null,
    };
    fs.writeFileSync(
      path.join(renderDir, `${projectId}.json`),
      JSON.stringify(renderJson, null, 2)
    );
    console.log(`[Render] Saved render data: public/render/${projectId}.json`);

    return NextResponse.json({
      success: true,
      renderData: {
        scenes: remotionScenes,
        fps,
        totalFrames,
        totalDuration: parseFloat(totalDuration),
        subtitlePreset: subtitlePreset || null,
        renderPreset: renderPreset || null,
      },
    });
  } catch (err: any) {
    console.error("[Render] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
