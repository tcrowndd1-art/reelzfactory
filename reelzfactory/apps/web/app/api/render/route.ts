import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// Whisper STTë¡œ ë‹¨ì–´ë³„ íƒ€ìž„ìŠ¤íƒ¬í”„ ì¶”ì¶œ
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
    headers: { "Authorization": `Bearer ${openaiKey}` },
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

// MP3 ë“€ë ˆì´ì…˜ ì¶”ì¶œ (ffprobe)
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, scenes, openaiKey } = body;

    if (!projectId || !scenes || !openaiKey) {
      return NextResponse.json({ error: "Missing projectId, scenes, or openaiKey" }, { status: 400 });
    }

    const audioDir = path.join(process.cwd(), "public", "audio", projectId);
    const fps = 30;
    const remotionScenes: any[] = [];

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

      // 1. ì˜¤ë””ì˜¤ ë“€ë ˆì´ì…˜ ì¶”ì¶œ
      const duration = getAudioDuration(audioFile);
      const durationInFrames = Math.ceil(duration * fps);

      // 2. Whisper STTë¡œ ë‹¨ì–´ë³„ íƒ€ìž„ìŠ¤íƒ¬í”„
      console.log(`[Render] Scene ${scene.id} - Whisper STT (${duration.toFixed(1)}s)...`);
      const words = await getWordTimestamps(audioFile, openaiKey);
      console.log(`[Render] Scene ${scene.id} - ${words.length} words detected`);

      // 3. ê°•ì¡° ë‹¨ì–´ ì¶”ì¶œ (ëŒ€ë¬¸ìž, ìˆ«ìž, ëŠë‚Œí‘œ í¬í•¨ ë‹¨ì–´)
      const emphasis = words
        .filter((w) => /[A-Z]{2,}|[0-9]+|!/.test(w.word))
        .map((w) => w.word.toLowerCase());

      remotionScenes.push({
        imageUrl: scene.imageUrl || "",
        audioUrl: `/audio/${projectId}/scene_${scene.id}.mp3`,
        words,
        subtitleEmphasis: emphasis,
        durationInFrames,
      });
    }

    const totalFrames = remotionScenes.reduce((sum, s) => sum + s.durationInFrames, 0);
    const totalDuration = (totalFrames / fps).toFixed(1);

    console.log(`[Render] Prep done: ${remotionScenes.length} scenes, ${totalFrames} frames (${totalDuration}s)`);
    // renderDataë¥¼ JSON íŒŒì¼ë¡œ ì €ìž¥ (Remotion ë Œë”ìš©)
    const renderDir = path.join(process.cwd(), "public", "render");
        if (!fs.existsSync(renderDir)) fs.mkdirSync(renderDir, { recursive: true });
    const renderJson = { scenes: remotionScenes, fps, totalFrames, totalDuration: parseFloat(totalDuration) };
    fs.writeFileSync(path.join(renderDir, `${projectId}.json`), JSON.stringify(renderJson, null, 2));
    console.log(`[Render] Saved render data: public/render/${projectId}.json`);

    return NextResponse.json({
      success: true,
      renderData: {
        scenes: remotionScenes,
        fps,
        totalFrames,
        totalDuration: parseFloat(totalDuration),
      },
    });
  } catch (err: any) {
    console.error("[Render] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
