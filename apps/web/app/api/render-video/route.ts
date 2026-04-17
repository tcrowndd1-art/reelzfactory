// apps/web/app/api/render-video/route.ts
import { NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import fs from "fs";

export async function POST(req: Request): Promise<Response> {
  try {
    const { projectId } = await req.json();
    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    // 1. 렌더 JSON 확인
    const renderJsonPath = path.join(process.cwd(), "public", "render", `${projectId}.json`);
    if (!fs.existsSync(renderJsonPath)) {
      return NextResponse.json(
        { error: "Render data not found. Run Prepare Render first." },
        { status: 404 }
      );
    }

    // 2. 출력 디렉토리 생성
    const outputDir = path.join(process.cwd(), "public", "output");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 3. Remotion 경로 (process.cwd() = apps/web → ../../remotion = 루트/remotion)
    const remotionRoot = path.resolve(process.cwd(), "..", "..", "remotion");
    const renderScript = path.join(remotionRoot, "render.mjs");

    console.log("[RenderVideo] cwd:", process.cwd());
    console.log("[RenderVideo] remotionRoot:", remotionRoot);
    console.log("[RenderVideo] renderScript:", renderScript);

    if (!fs.existsSync(renderScript)) {
      return NextResponse.json(
        {
          error: `render.mjs not found at ${renderScript}`,
          hint: "remotion 폴더가 프로젝트 루트(reelzfactory/remotion/)에 있는지 확인하세요.",
          cwd: process.cwd(),
          resolved: remotionRoot,
        },
        { status: 500 }
      );
    }

    // 4. 렌더 실행
    const outputPath = path.join(outputDir, `${projectId}.mp4`);

    const env = {
      ...process.env,
      RENDER_JSON: renderJsonPath,
      OUTPUT_PATH: outputPath,
    };

    // Promise<Response>로 명시적 타입 지정
    const response = await new Promise<Response>((resolve) => {
      const cmd = `node "${renderScript}" "${projectId}"`;
      console.log(`[RenderVideo] Executing: ${cmd}`);

      exec(
        cmd,
        { cwd: remotionRoot, timeout: 300000, env },
        (error, stdout, stderr) => {
          if (error) {
            console.error("[RenderVideo] Error:", error.message);
            console.error("[RenderVideo] Stderr:", stderr);
            resolve(
              NextResponse.json(
                { error: error.message, stderr, stdout },
                { status: 500 }
              )
            );
            return;
          }

          console.log("[RenderVideo] Stdout:", stdout);

          if (fs.existsSync(outputPath)) {
            resolve(
              NextResponse.json({
                success: true,
                videoUrl: `/output/${projectId}.mp4`,
                message: "Video rendered successfully!",
              })
            );
          } else {
            resolve(
              NextResponse.json(
                {
                  error: "Render completed but output file not found",
                  expectedPath: outputPath,
                  stdout,
                  stderr,
                },
                { status: 500 }
              )
            );
          }
        }
      );
    });

    return response;
  } catch (err: any) {
    console.error("[RenderVideo] Fatal:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
