import { bundle } from "@remotion/bundler";
import { renderMedia, getCompositions } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer } from "http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const projectId = process.argv[2];
  if (!projectId) {
    console.error("Usage: node render.mjs <projectId>");
    process.exit(1);
  }

  const dataPath = path.join(__dirname, "..", "apps", "web", "public", "render", `${projectId}.json`);
  if (!fs.existsSync(dataPath)) {
    console.error(`[Render] Data not found: ${dataPath}`);
    process.exit(1);
  }

  const renderData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  console.log(`[Render] ${renderData.scenes.length} scenes, ${renderData.totalDuration}s`);

  const publicDir = path.join(__dirname, "..", "apps", "web", "public");
  const ASSET_PORT = 3099;

  const assetServer = createServer((req, res) => {
    const filePath = path.join(publicDir, decodeURIComponent(req.url));
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
      };
      res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
    } else {
      console.log(`[AssetServer] 404: ${req.url}`);
      res.writeHead(404);
      res.end("Not found");
    }
  });

  await new Promise((resolve) => assetServer.listen(ASSET_PORT, () => {
    console.log(`[AssetServer] Running on http://localhost:${ASSET_PORT}`);
    resolve();
  }));

  const scenes = renderData.scenes.map((s) => ({
    ...s,
    imageUrl: rewriteUrl(s.imageUrl, ASSET_PORT),
    audioUrl: rewriteUrl(s.audioUrl, ASSET_PORT),
  }));

  scenes.forEach((s, i) => {
    console.log(`[Render] Scene ${i + 1} audio: ${s.audioUrl}`);
    console.log(`[Render] Scene ${i + 1} image: ${s.imageUrl.substring(0, 80)}`);
  });

  console.log("[Render] Bundling Remotion...");
  const bundled = await bundle({
    entryPoint: path.join(__dirname, "src", "entry.tsx"),
    webpackOverride: (config) => config,
  });

  const compositions = await getCompositions(bundled, {
    inputProps: { scenes, fps: renderData.fps, subtitlePreset: renderData.subtitlePreset, renderPreset: renderData.renderPreset },
  });

  const comp = compositions.find((c) => c.id === "ShortsVideo");
  if (!comp) {
    console.error("[Render] ShortsVideo composition not found");
    process.exit(1);
  }

  const outputDir = path.join(publicDir, "output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${projectId}.mp4`);

  console.log("[Render] Rendering MP4...");
  await renderMedia({
    composition: comp,
    serveUrl: bundled,
    codec: "h264",
    outputLocation: outputPath,
    inputProps: { scenes, fps: renderData.fps, subtitlePreset: renderData.subtitlePreset, renderPreset: renderData.renderPreset },
    onProgress: ({ progress }) => {
      process.stdout.write(`\r[Render] ${(progress * 100).toFixed(1)}%`);
    },
  });

  console.log(`\n[Render] Done! ${outputPath}`);
  assetServer.close();
}

function rewriteUrl(url, port) {
  if (!url) return "";
  if (url.startsWith("https://")) return url;
  if (url.startsWith("http://localhost")) {
    try {
      const parsed = new URL(url);
      return `http://localhost:${port}${parsed.pathname}`;
    } catch {
      return url;
    }
  }
  if (url.startsWith("/")) return `http://localhost:${port}${url}`;
  return url;
}

main().catch((e) => {
  console.error("[Render] Fatal:", e);
  process.exit(1);
});
