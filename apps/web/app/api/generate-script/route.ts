import { NextRequest } from "next/server";
import OpenAI from "openai";
import { getSystemPrompt, buildUserPrompt, WORLDVIEW_OS } from "@/lib/prompts";
import type { ScriptMode, ScriptSource } from "@/lib/prompts";
import { knowledgeToPromptText } from "@/lib/knowledge";
import { composeShortformPrompt, composeLongformPrompt } from "@/lib/promptComposer";
import * as fs from "fs";
import * as path from "path";
import { resolveEngine } from "@/constants/engineMap";

function loadKnowledgePackServer(niche: string) {
  const assetsBase = path.resolve(process.cwd(), "../../packages/pipeline/assets");
  const knowledgePath = path.join(assetsBase, "knowledge", niche);
  if (!fs.existsSync(knowledgePath)) return null;

  const pack: any = { niche, hooks: [], scripts: null, compliance: null, character: null, factbase: [] };

  const dirs = [
    {
      name: "hooks", handler: (dir: string) => {
        for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json"))) {
          pack.hooks.push({ file: f, ...JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) });
        }
      }
    },
    {
      name: "scripts", handler: (dir: string) => {
        const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
        if (files.length > 0) {
          const target = files.find(f => f.includes("viral")) || files[0];
          pack.scripts = JSON.parse(fs.readFileSync(path.join(dir, target), "utf-8"));
        }
      }
    },
    {
      name: "compliance", handler: (dir: string) => {
        const cf = path.join(dir, "claims.json");
        if (fs.existsSync(cf)) pack.compliance = JSON.parse(fs.readFileSync(cf, "utf-8"));
      }
    },
    {
      name: "character", handler: (dir: string) => {
        const cf = fs.readdirSync(dir).find(f => f.endsWith(".json"));
        if (cf) pack.character = JSON.parse(fs.readFileSync(path.join(dir, cf), "utf-8"));
      }
    },
    {
      name: "factbase", handler: (dir: string) => {
        for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json"))) {
          pack.factbase.push({ file: f, ...JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) });
        }
      }
    },
  ];

  for (const d of dirs) {
    const dirPath = path.join(knowledgePath, d.name);
    if (fs.existsSync(dirPath)) d.handler(dirPath);
  }
  return pack;
}

async function fetchBenchmarkAnalysis(benchmarkUrl: string, geminiKey?: string): Promise<string> {
  try {
    const res = await fetch("http://localhost:3000/api/analyze-benchmark", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: benchmarkUrl, geminiKey }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.log(`[Benchmark] Analysis failed: ${err.error}`);
      return "";
    }

    const data = await res.json();
    const parts: string[] = [];
    if (data.transcript) parts.push(`[원본 자막]\n${data.transcript}`);
    if (data.rawAnalysis) parts.push(`[구조 분석 결과]\n${data.rawAnalysis}`);
    console.log(`[Benchmark] Analysis loaded: ${parts.join("").length} chars`);
    return parts.join("\n\n");
  } catch (err: any) {
    console.log(`[Benchmark] Fetch error: ${err.message}`);
    return "";
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      topic,
      mode = "shorts" as ScriptMode,
      source = "quick" as ScriptSource,
      language = "ko",
      category = "health",
      format = "factbomb",
      persona,
      tone,
      maxScenes,
      targetDuration,
      niche,
      benchmarkUrl,
      referenceScript,
      apiKey,
      imageStyle,
      scriptEngine,
      customPrompt,
      instruction_a,
      knowledge_b,
    } = body;

    if (!topic && source !== "reference") {
      return new Response(JSON.stringify({ error: "Topic is required" }), { status: 400 });
    }
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OpenRouter API key is required" }), { status: 400 });
    }

    // 1. 시스템 프롬프트 구성
    let systemPrompt = "";
    let categoryOverlay = "";
    let promptSource = "fallback";
    let knowledgeText = "";

    // Supabase 블록 조합 (기본 뼈대)
    if (mode === "shorts") {
      const composed = await composeShortformPrompt(category, format);
      if (composed.source === "supabase") {
        systemPrompt = composed.systemPrompt;
        categoryOverlay = composed.categoryOverlay;
        promptSource = "supabase";
        console.log(`[Script] Supabase prompt loaded: shorts/${category}/${format}`);
      }
    } else if (mode === "longform") {
      const composed = await composeLongformPrompt(category, source);
      if (composed.source === "supabase") {
        systemPrompt = composed.systemPrompt;
        categoryOverlay = composed.categoryOverlay;
        promptSource = "supabase";
        console.log(`[Script] Supabase prompt loaded: longform/${category}/${source}`);
      }
    }

    if (!systemPrompt) {
      systemPrompt = getSystemPrompt(mode);
      console.log(`[Script] Fallback to hardcoded prompt: ${mode}`);
    }
    systemPrompt = WORLDVIEW_OS + "\n\n"
      + (instruction_a
        ? `${"=".repeat(50)}\n[채널 A지침서 — 이 규칙이 아래 모든 규칙보다 최우선]\n${"=".repeat(50)}\n${instruction_a}\n\n`
        : "")
      + systemPrompt;

    if (instruction_a) {
      promptSource = "channel_abc";
      console.log(`[Script] A지침서 주입 (최상단): ${instruction_a.length}자`);
    }

    // Knowledge Pack 로드 (niche 기반)
    if (niche) {
      const pack = loadKnowledgePackServer(niche);
      if (pack) {
        knowledgeText = knowledgeToPromptText(pack);
        console.log("[Knowledge] Loaded pack for:", niche, "- Text length:", knowledgeText.length);
      }
    }

    // 3. Benchmark 분석
    let benchmarkData = "";
    if (source === "benchmark" && benchmarkUrl) {
      console.log("[Benchmark] Starting analysis for:", benchmarkUrl);
      const geminiKey = process.env.GEMINI_API_KEY;
      benchmarkData = await fetchBenchmarkAnalysis(benchmarkUrl, geminiKey);
    }

    // 3.5 실시간 검색 (Tavily)
    let realtimeData = "";
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (tavilyKey && topic && source !== "reference") {
      try {
        console.log("[Tavily] Searching for:", topic);
        const tavilyRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: tavilyKey,
            query: topic,
            search_depth: "basic",
            max_results: 5,
            include_answer: true,
          }),
        });
        if (tavilyRes.ok) {
          const tavilyJson = await tavilyRes.json();
          const answer = tavilyJson.answer || "";
          const sources = (tavilyJson.results || [])
            .slice(0, 5)
            .map((r: any) => `- ${r.title}: ${r.content?.slice(0, 200)}`)
            .join("\n");
          realtimeData = `[실시간 데이터 — ${new Date().toISOString().split('T')[0]} 기준]\n${answer}\n\n[출처]\n${sources}`;
          console.log("[Tavily] Data received:", realtimeData.length, "chars");
        }
      } catch (e) {
        console.warn("[Tavily] Search failed:", e);
      }
    }

    // 4. 프롬프트 빌드
    const today = new Date().toISOString().split('T')[0];
    let finalPrompt: string;

    if (referenceScript && source === "reference") {
      // My Script 모드: 원문 보존
      const myScriptParts: string[] = [];
      myScriptParts.push(`오늘 날짜: ${today}`);
      myScriptParts.push(`모드: ${mode === "shorts" ? `YouTube Shorts (${targetDuration || 30}초)` : `YouTube Longform (${Math.round((targetDuration || 600) / 60)}분)`}`);
      myScriptParts.push(`언어: ${language}`);
      myScriptParts.push(`\n${"=".repeat(50)}\n[MY SCRIPT — 아래 대본의 내용을 절대 수정하지 마라]\n${"=".repeat(50)}`);
      myScriptParts.push(`아래 대본의 모든 문장, 수치, 표현을 1글자도 변경하지 않는다.`);
      myScriptParts.push(`역할: 씬 분할(beat 지정, durationEstimate 배분) + 각 씬에 맞는 imagePrompt 생성 + metadata 생성만 수행한다.`);
      myScriptParts.push(`text 필드에는 원본 대본의 문장을 그대로 넣는다. 요약, 재작성, 톤 변환 금지.`);
      myScriptParts.push(referenceScript);
      if (knowledge_b) myScriptParts.push(`\n${"=".repeat(50)}\n[채널 B지침서]\n${"=".repeat(50)}\n${knowledge_b}`);
      if (benchmarkData) myScriptParts.push(`\n${"=".repeat(50)}\n[벤치마크 분석]\n${"=".repeat(50)}\n${JSON.stringify(benchmarkData)}`);
      finalPrompt = myScriptParts.join("\n");
    } else {
      const userPrompt = buildUserPrompt({
        topic, mode, source, language, category,
        persona, tone, maxScenes, targetDuration,
        knowledgeText: knowledgeText || undefined,
        benchmarkData: benchmarkData || undefined,
        referenceScript: referenceScript || undefined,
      });

      // B지침서 + 카테고리 오버레이 + 레거시 customPrompt 합산
      const overlays: string[] = [];
      if (knowledge_b) {
        overlays.push(`[채널 B지침서]\n${knowledge_b}`);
        console.log(`[Script] B지침서 주입: ${knowledge_b.length}자`);
      }
      if (categoryOverlay) overlays.push(`[카테고리 가이드라인]\n${categoryOverlay}`);
      if (customPrompt) overlays.push(`[채널 추가 규칙]\n${customPrompt}`);

      const overlayText = overlays.length > 0
        ? `\n\n${"=".repeat(50)}\n${overlays.join(`\n\n${"=".repeat(30)}\n`)}\n${"=".repeat(50)}`
        : "";

      finalPrompt = `오늘 날짜: ${today}\n\n${userPrompt}${overlayText}`;
    }

    // [비활성화] 이미지 스타일 가이드는 이미지 생성 단계에서만 사용 (대본 프롬프트 오염 방지)

    console.log(`[Script] Mode: ${mode} | Source: ${source} | PromptSource: ${promptSource} | Category: ${category} | Format: ${format}`);
    console.log(`[Script] SystemPrompt length: ${systemPrompt.length} | First 200: ${systemPrompt.substring(0, 200)}`);


    // ============================================================
    // 5. 청크 분할 생성 (롱폼 10분 초과) vs 단일 생성
    // ============================================================
    const client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
    });

    const targetMinutes = maxScenes ? Math.ceil(maxScenes / 2) : (mode === "longform" ? 10 : 1);
    const SCENES_PER_CHUNK = 20;
    const totalScenes = maxScenes || (mode === "longform" ? targetMinutes * 2 : 6);
    const needsChunking = mode === "longform" && totalScenes > SCENES_PER_CHUNK;
    const chunkCount = needsChunking ? Math.ceil(totalScenes / SCENES_PER_CHUNK) : 1;

    console.log(`[Script] Chunking: ${needsChunking ? `YES (${chunkCount} chunks × ${SCENES_PER_CHUNK} scenes)` : `NO (${totalScenes} scenes)`}`);

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          let allScenes: any[] = [];
          let previousSummary = "";
          let finalScript: any = null;

          for (let chunkIdx = 0; chunkIdx < chunkCount; chunkIdx++) {
            const startScene = chunkIdx * SCENES_PER_CHUNK + 1;
            const endScene = Math.min((chunkIdx + 1) * SCENES_PER_CHUNK, totalScenes);
            const chunkSceneCount = endScene - startScene + 1;

            // 청크 진행률 알림
            if (needsChunking) {
              controller.enqueue(encoder.encode("data: " + JSON.stringify({
                type: "chunk",
                content: `\n\n[📝 청크 ${chunkIdx + 1}/${chunkCount} 생성 중... (씬 ${startScene}~${endScene})]\n\n`,
              }) + "\n\n"));
            }

            // 청크별 프롬프트 구성
            let chunkUserPrompt = finalPrompt;
            if (needsChunking) {
              chunkUserPrompt += `\n\n[청크 생성 지시]`;
              chunkUserPrompt += `\n- 이 호출에서 씬 ${startScene}~${endScene}번만 생성하세요 (총 ${chunkSceneCount}개)`;
              chunkUserPrompt += `\n- 씬 번호는 ${startScene}부터 시작합니다`;
              chunkUserPrompt += `\n- 전체 ${totalScenes}개 씬 중 ${chunkIdx + 1}/${chunkCount} 청크입니다`;
              if (previousSummary) {
                chunkUserPrompt += `\n\n[이전 청크 요약 - 이어서 작성]\n${previousSummary}`;
              }
              if (chunkIdx === 0) {
                chunkUserPrompt += `\n- 첫 청크: hook과 도입부를 포함하세요`;
              } else if (chunkIdx === chunkCount - 1) {
                chunkUserPrompt += `\n- 마지막 청크: 결론과 CTA를 포함하세요`;
              } else {
                chunkUserPrompt += `\n- 중간 청크: 본론을 이어가세요`;
              }
            }

            // API 호출 — 엔진 라우팅
            const engineMode = mode === "longform" ? "longform" : "shorts";
            const engine = resolveEngine(scriptEngine || "auto", engineMode);
            console.log(`[ENGINE] mode=${engineMode} requested=${scriptEngine || "auto"} resolved=${engine.modelId} maxTokens=${engine.maxTokens}`);
            const stream = await client.chat.completions.create({
              model: engine.modelId,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: chunkUserPrompt },
              ],
              stream: true,
              temperature: 0.7,
              max_tokens: engine.maxTokens,
            });

            // 스트리밍 수신
            let fullText = "";
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content || "";
              if (content) {
                fullText += content;
                controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "chunk", content }) + "\n\n"));
              }
            }

            console.log(`[Script] Parsed keys: ${JSON.stringify(Object.keys(JSON.parse(fullText.match(/\{[\s\S]*\}/)?.[0] || '{}')))}`);

            // JSON 파싱
            try {
              const jsonMatch = fullText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                let jsonStr = jsonMatch[0];
                const openBraces = (jsonStr.match(/\{/g) || []).length;
                const closeBraces = (jsonStr.match(/\}/g) || []).length;
                const openBrackets = (jsonStr.match(/\[/g) || []).length;
                const closeBrackets = (jsonStr.match(/\]/g) || []).length;
                for (let i = 0; i < openBrackets - closeBrackets; i++) jsonStr += ']';
                for (let i = 0; i < openBraces - closeBraces; i++) jsonStr += '}';
                jsonStr = jsonStr.replace(/,\s*([\]}])/g, '$1');
                const parsed = JSON.parse(jsonStr);
                console.log(`[Script] Chunk ${chunkIdx + 1} parsed structure: scenes=${!!parsed.scenes} segments=${!!parsed.segments} segmentCount=${(parsed.segments || []).length} firstSegmentKeys=${JSON.stringify(Object.keys((parsed.segments || [])[0] || {}))}`);
                console.log(`[Script] Chunk ${chunkIdx + 1} fullText length: ${fullText.length}`);
                console.log(`[Script] Chunk ${chunkIdx + 1} parsed keys: ${Object.keys(parsed).join(', ')}`);
                console.log(`[Script] Chunk ${chunkIdx + 1} scenes type: ${typeof parsed.scenes}, length: ${parsed.scenes?.length ?? 'N/A'}`);

                const scenes = parsed.scenes || parsed.script?.scenes || (Array.isArray(parsed.segments) ? parsed.segments.flatMap((seg: any) => seg.scenes || [seg]) : []);
                allScenes.push(...scenes);



                // 첫 청크에서 메타데이터 저장
                if (chunkIdx === 0) {
                  finalScript = { ...parsed, scenes: [] };
                }

                // 다음 청크를 위한 요약 생성
                if (needsChunking && chunkIdx < chunkCount - 1) {
                  const lastScenes = scenes.slice(-3);
                  previousSummary = lastScenes.map((s: any, i: number) =>
                    `씬 ${startScene + scenes.length - 3 + i}: ${s.text?.substring(0, 80) || s.narration?.substring(0, 80) || ""}`
                  ).join("\n");
                  previousSummary += `\n마지막 분위기: ${lastScenes[lastScenes.length - 1]?.section || "core"}`;
                }

                console.log(`[Script] Chunk ${chunkIdx + 1}/${chunkCount}: ${scenes.length} scenes parsed`);
              } else {
                console.error(`[Script] Chunk ${chunkIdx + 1}: JSON not found`);
                if (!needsChunking) {
                  controller.enqueue(encoder.encode("data: " + JSON.stringify({
                    type: "error",
                    error: "Failed to parse JSON from response",
                    rawText: fullText.substring(0, 500),
                  }) + "\n\n"));
                }
              }
            } catch (parseErr: any) {
              console.error(`[Script] Chunk ${chunkIdx + 1} parse error:`, parseErr.message);
              if (!needsChunking) {
                controller.enqueue(encoder.encode("data: " + JSON.stringify({
                  type: "error",
                  error: "JSON parse error: " + parseErr.message,
                  rawText: fullText.substring(0, 500),
                }) + "\n\n"));
              }
            }
          } // end for loop

          // 최종 병합 및 검증
          if (allScenes.length > 0) {
            const mergedScript = finalScript
              ? { ...finalScript, scenes: allScenes }
              : { scenes: allScenes };

            if (needsChunking) {
              controller.enqueue(encoder.encode("data: " + JSON.stringify({
                type: "chunk",
                content: `\n\n[✅ 전체 ${allScenes.length}개 씬 병합 완료]\n\n`,
              }) + "\n\n"));
            }


            // 씬 수 초과 강제 자르기
            const maxScenesLimit = maxScenes || (targetDuration <= 20 ? 5 : targetDuration <= 35 ? 8 : 12);
            if (allScenes.length > maxScenesLimit) {
              console.log(`[Script] Scene overflow: ${allScenes.length} → trimmed to ${maxScenesLimit}`);
              allScenes.length = maxScenesLimit;
              mergedScript.scenes = allScenes;
            }

            // 검증
            const { validateScript } = await import("@/lib/scriptValidator");
            const validation = validateScript(mergedScript, mode as "shorts" | "longform", { skipChannelRules: false });
            console.log(`[Validator] verdict: ${validation.verdict} | fatal: ${validation.summary.fatal} | critical: ${validation.summary.critical} | warning: ${validation.summary.warning}`,
              validation.issues.length > 0 ? JSON.stringify(validation.issues.slice(0, 5)) : "no issues");

            if (validation.verdict === "REJECT") {
              controller.enqueue(encoder.encode("data: " + JSON.stringify({
                type: "validation",
                verdict: "REJECT",
                issues: validation.issues,
                summary: validation.summary,
              }) + "\n\n"));
            }

            if (validation.verdict === "REVISE") {
              controller.enqueue(encoder.encode("data: " + JSON.stringify({
                type: "validation",
                verdict: "REVISE",
                issues: validation.issues,
                summary: validation.summary,
                reviseInstructions: validation.reviseInstructions,
              }) + "\n\n"));
            }

            controller.enqueue(encoder.encode("data: " + JSON.stringify({
              type: "complete",
              script: mergedScript,
              revisionNeeded: validation.verdict === "REVISE",
              validation: {
                verdict: validation.verdict,
                summary: validation.summary,
                issues: validation.issues,
                reviseInstructions: validation.reviseInstructions,
              },
              knowledgeUsed: !!knowledgeText,
              benchmarkUsed: !!benchmarkData,
              referenceUsed: !!referenceScript,
              promptSource,
              niche: niche || null,
              mode,
              source,
              category,
              format,
              chunksUsed: chunkCount,
              totalScenes: allScenes.length,
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

