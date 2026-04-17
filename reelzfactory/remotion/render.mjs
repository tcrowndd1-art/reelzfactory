undefined// 기존 toHttpUrl 함수 삭제하고 이걸로 교체

// 오디오/이미지를 Remotion이 읽을 수 있는 경로로 변환
const publicDir = path.join(__dirname, "..", "apps", "web", "public");

function resolveAssetUrl(url) {
  if (!url) return "";
  
  // 이미 외부 https URL이면 그대로 (fal.ai 이미지 등)
  if (url.startsWith("https://")) return url;
  
  // http://localhost:3000/audio/... → 로컬 파일 경로 추출
  let relativePath = url;
  if (url.startsWith("http://localhost")) {
    try {
      const parsed = new URL(url);
      relativePath = parsed.pathname; // "/audio/xxx/scene_1.mp3"
    } catch {
      return url;
    }
  }
  
  // 상대경로 → 절대 파일 경로 확인
  const absolutePath = path.join(publicDir, relativePath);
  if (fs.existsSync(absolutePath)) {
    // Remotion이 읽을 수 있도록 file:// 프로토콜 없이 절대경로 전달
    return absolutePath;
  }
  
  return url;
}
Copy
그리고 같은 파일에서 scenes 변환 부분도 수정:

Copy  // 기존: toHttpUrl 사용하던 부분
  // const scenes = renderData.scenes.map((s) => ({
  //   ...s,
  //   imageUrl: toHttpUrl(s.imageUrl),
  //   audioUrl: toHttpUrl(s.audioUrl),
  // }));

  // 새로: resolveAssetUrl 사용
  const scenes = renderData.scenes.map((s) => ({
    ...s,
    imageUrl: resolveAssetUrl(s.imageUrl),
    audioUrl: resolveAssetUrl(s.audioUrl),
  }));
근데 이러면 Scene.tsx에서 <Audio src={absolutePath}> 를 받게 되는데, Remotion <Audio>가 로컬 절대경로를 지원하는지가 관건이야.

확실한 방법: render.mjs 전체를 다시 줄 테니까, 현재 render.mjs 전체 코드 한번 더 보여줘. 아까 수정한 버전이 반영되었는지 확인하고 싶어!

이렇게 하니깐 음성은 나온다->http://localhost:3000/audio/1774071104765/scene_1.mp3
그럼 위에 코드 안바꿔도 되?
파일 자체는 정상이야. 문제는 Remotion이 렌더링할 때 localhost에 접근을 못하는 거야.

렌더링은 별도 프로세스(node render.mjs)로 돌아가는데, 그때 Next.js 서버(localhost:3000)가 켜져있어도 Remotion 렌더러가 HTTP 요청을 제대로 못 보내는 경우가 있어.

바꿔야 해. render.mjs 전체를 이걸로 교체해:

Copyimport { bundle } from "@remotion/bundler";
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

  // 로컬 파일 서빙용 미니 HTTP 서버 (포트 3099)
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

  // URL 변환: localhost:3000 → localhost:3099 (자체 서버로)
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
    inputProps: { scenes, fps: renderData.fps },
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
    inputProps: { scenes, fps: renderData.fps },
    onProgress: ({ progress }) => {
      process.stdout.write(`\r[Render] ${(progress * 100).toFixed(1)}%`);
    },
  });

  console.log(`\n[Render] Done! ${outputPath}`);

  // 미니 서버 종료
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