import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function safeJsonParse(filePath: string) {
  let raw = fs.readFileSync(filePath, "utf-8");
  if (raw.charCodeAt(0) === 0xFEFF) {
    raw = raw.slice(1);
  }
  raw = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  return JSON.parse(raw);
}

function loadJsonFiles(dirPath: string): any[] {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath)
    .filter((f: string) => f.endsWith(".json"))
    .map((f: string) => {
      try {
        return safeJsonParse(path.join(dirPath, f));
      } catch (e) {
        console.error(`Failed to parse ${f}:`, e);
        return null;
      }
    })
    .filter(Boolean);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ niche: string }> }
) {
  try {
    const { niche } = await params;

    const basePath = path.resolve(
      process.cwd(),
      "..",
      "..",
      "packages",
      "pipeline",
      "assets",
      "knowledge",
      niche
    );

    if (!fs.existsSync(basePath)) {
      return NextResponse.json(
        { error: `Knowledge pack '${niche}' not found`, path: basePath },
        { status: 404 }
      );
    }

    const hooks = loadJsonFiles(path.join(basePath, "hooks"));
    const scripts = loadJsonFiles(path.join(basePath, "scripts"));
    const compliance = loadJsonFiles(path.join(basePath, "compliance"));
    const character = loadJsonFiles(path.join(basePath, "character"));
    const factbase = loadJsonFiles(path.join(basePath, "factbase"));

    return NextResponse.json({
      niche,
      hooks,
      scripts,
      compliance,
      character,
      factbase,
      summary: {
        hookCount: hooks.length,
        scriptCount: scripts.length,
        complianceCount: compliance.length,
        characterCount: character.length,
        factbaseCount: factbase.length,
      },
    });
  } catch (error: any) {
    console.error("Knowledge API error:", error);
    return NextResponse.json(
      { error: error.message, stack: error.stack?.split("\n").slice(0, 3) },
      { status: 500 }
    );
  }
}