import { NextRequest } from "next/server";
import OpenAI from "openai";
import { getSystemPrompt, buildUserPrompt } from "@/lib/prompts";
import type { ScriptMode, ScriptSource } from "@/lib/prompts";
import { knowledgeToPromptText } from "@/lib/knowledge";
import * as fs from "fs";
import * as path from "path";

function loadKnowledgePackServer(niche: string) {
  const assetsBase = path.resolve(process.cwd(), "../../packages/pipeline/assets");
  const knowledgePath = path.join(assetsBase, "knowledge", niche);
  if (!fs.existsSync(knowledgePath)) return null;

  const pack: any = { niche, hooks: [], scripts: null, compliance: null, character: null, factbase: [] };

  const dirs = [
    { name: "hooks", handler: (dir: string) => {
      for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json"))) {
        pack.hooks.push({ file: f, ...JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) });
      }
    }},
    { name: "scripts", handler: (dir: string) => {
      const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
      if (files.length > 0) {
        const target = files.find(f => f.includes("viral")) || files[0];
        pack.scripts = JSON.parse(fs.readFileSync(path.join(dir, target), "utf-8"));
      }
    }},
    { name: "compliance", handler: (dir: string) => {
      const cf = path.join(dir, "claims.json");
      if (fs.existsSync(cf)) pack.compliance = JSON.parse(fs.readFileSync(cf, "utf-8"));
    }},
    { name: "character", handler: (dir: string) => {
      const cf = fs.readdirSync(dir).find(f => f.endsWith(".json"));
      if (cf) pack.character = JSON.parse(fs.readFileSync(path.join(dir, cf), "utf-8"));
    }},
    { name: "factbase", handler: (dir: string) => {
      for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json"))) {
        pack.factbase.push({ file: f, ...JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) });
      }
    }},
  ];

  for (const d of dirs) {
    const dirPath = path.join(knowledgePath, d.name);
    if (fs.existsSync(dirPath)) d.handler(dirPath);
  }
  return pack;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      topic,
      mode = "shorts" as ScriptMode,
      source = "quick" as ScriptSource,
      language = "ko",
      category,
      persona,
      tone,
      maxScenes,
      niche,
      benchmarkUrl,
      apiKey,
    } = body;

    if (!topic) {
      return new Response(JSON.stringify({ error: "Topic is required" }), { status: 400 });
    }
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OpenRouter API key is required" }), { status: 400 });
    }

    // 1. Knowledge Pack ?? (niche? ???)
    let knowledgeText = "";
    if (niche) {
      const pack = loadKnowledgePackServer(niche);
      if (pack) {
        knowledgeText = knowledgeToPromptText(pack);
        console.log("[Knowledge] Loaded pack for:", niche, "- Text length:", knowledgeText.length);
      }
    }

    // 2. ??? ???? ??
    const systemPrompt = getSystemPrompt(mode);

    // 3. ?? ???? ??
    const userPrompt = buildUserPrompt({
      topic,
      mode,
      source,
      language,
      category,
      persona,
      tone,
      maxScenes,
      knowledgeText: knowledgeText || undefined,
    });

    // 4. OpenRouter API ?? (SSE ????)
    const client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
    });

    const stream = await client.chat.completions.create({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
      temperature: 0.8,
      max_tokens: mode === "longform" ? 16000 : 4000,
    });

    // 5. SSE ??? ??
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          let fullText = "";
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              fullText += content;
              controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "chunk", content }) + "\n\n"));
            }
          }

          // ???? ?? ? JSON ?? ??
          try {
            const jsonMatch = fullText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              controller.enqueue(encoder.encode("data: " + JSON.stringify({
                type: "complete",
                script: parsed,
                knowledgeUsed: !!knowledgeText,
                niche: niche || null,
                mode,
                source,
              }) + "\n\n"));
            } else {
              controller.enqueue(encoder.encode("data: " + JSON.stringify({
                type: "error",
                error: "Failed to parse JSON from response",
                rawText: fullText.substring(0, 500),
              }) + "\n\n"));
            }
          } catch (parseErr: any) {
            controller.enqueue(encoder.encode("data: " + JSON.stringify({
              type: "error",
              error: "JSON parse error: " + parseErr.message,
              rawText: fullText.substring(0, 500),
            }) + "\n\n"));
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err: any) {
          controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "error", error: err.message }) + "\n\n"));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
