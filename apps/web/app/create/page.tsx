"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getChannels, saveProject, ChannelProfile } from "@/lib/store";

export default function CreatePage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState("shorts");
  const [duration, setDuration] = useState(mode === "shorts" ? 30 : 10);
  const [source, setSource] = useState("quick");
  const [category, setCategory] = useState("health");
  const [lastProjectId, setLastProjectId] = useState<string>("");
  const [language, setLanguage] = useState("ko");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [script, setScript] = useState<any>(null);
  const [revisionNeeded, setRevisionNeeded] = useState(false);
  const [reviseInstructions, setReviseInstructions] = useState("");
  const [error, setError] = useState("");
  const [channels, setChannels] = useState<ChannelProfile[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState("");

  // Benchmark / Reference 입력
  const [benchmarkUrl, setBenchmarkUrl] = useState("");
  const [referenceScript, setReferenceScript] = useState("");

  const categories = [
    { id: "health", label: "Health" },
    { id: "psychology", label: "Psychology" },
    { id: "invest", label: "Investment" },
    { id: "economy", label: "Economy" },
    { id: "ai_trend", label: "AI/Tech" },
    { id: "old_tales", label: "Stories" },
    { id: "shopping_health", label: "Shop-Health" },
    { id: "shopping_beauty", label: "Shop-Beauty" },
  ];



  useEffect(() => {
    getChannels().then((chs) => {
      setChannels(chs);
      if (chs.length > 0) {
        setSelectedChannelId(chs[0].id || "");
        setCategory(chs[0].category || chs[0].niche || "health");
        setLanguage(chs[0].language || "ko");
      }
    });
  }, []);
  function normalizeScenes(scenes: any[]) {
    if (!scenes || !Array.isArray(scenes)) return [];
    return scenes.map((s: any, i: number) => ({
      ...s,
      sceneNumber: s.id || s.scene_number || s.sceneNumber || i + 1,
      narration: s.text || s.tts_script || s.narration || "",
      duration: s.durationEstimate || s.duration_sec || s.duration || 3,
      section: s.beat || s.type || s.phase || s.section || "core",
      imagePrompt: s.imagePrompt || s.image_prompt || "",
      textOverlay: s.subtitleEmphasis ? s.subtitleEmphasis.join(" / ") : s.textOverlay || "",
    }));
  }

  const handleGenerate = async () => {
    if (!topic.trim() && source !== "reference") { setError("Enter a topic"); return; }
    if (source === "benchmark" && !benchmarkUrl.trim()) { setError("Benchmark URL을 입력하세요"); return; }
    if (source === "reference" && !referenceScript.trim()) { setError("참고 대본을 입력하세요"); return; }

    const settings = JSON.parse(localStorage.getItem("reelzfactory_settings") || "{}");
    const apiKey = settings.apiKeys?.openrouter;
    if (!apiKey) { setError("Set OpenRouter API key in Settings"); return; }

    setIsGenerating(true); setStreamText(""); setScript(null); setError("");

    try {
      const selectedChannel = channels.find((c) => c.id === selectedChannelId);
      const scriptPreset = selectedChannel?.script_preset || {};
      const scriptEngine = mode === "longform"
        ? scriptPreset.longformEngine || "auto"
        : scriptPreset.shortsEngine || "auto";
      const requestBody: any = {
        topic: topic.trim(), mode, source, language, category, apiKey,
        customPrompt: scriptPreset.customPrompt || "",
        instruction_a: scriptPreset.instruction_a || "",
        knowledge_b: scriptPreset.knowledge_b || "",
        imageStyle: selectedChannel?.image_preset?.style || undefined,
        targetDuration: mode === "shorts" ? duration : duration * 60,
      };


      // Benchmark: YouTube URL 전달
      if (source === "benchmark" && benchmarkUrl.trim()) {
        requestBody.benchmarkUrl = benchmarkUrl.trim();
      }

      // Reference: 대본 텍스트 전달
      if (source === "reference" && referenceScript.trim()) {
        requestBody.referenceScript = referenceScript.trim();
      }

      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "API error"); }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No stream");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        for (const line of text.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const d = line.slice(6);
          if (d === "[DONE]") continue;
          try {
            const p = JSON.parse(d);
            if (p.type === "chunk") setStreamText((prev) => prev + p.content);
            else if (p.type === "complete") {
              console.log("[DEBUG] complete received, scenes:", p.script?.scenes?.length, "segments:", p.script?.segments?.length);
              if (p.revisionNeeded) {
                setRevisionNeeded(true);
                setReviseInstructions(p.validation?.reviseInstructions || "");
              } else {
                setRevisionNeeded(false);
                setReviseInstructions("");
              }
              const normalizedScript = {
                ...p.script,
                title: p.script.title || p.script.metadata?.title || topic,
                description: p.script.metadata?.description || "",
                totalScenes: p.script.totalScenes || p.script.total_scenes || p.script.scenes?.length || 0,
                estimatedDuration: p.script.estimatedDuration || (p.script.scenes?.reduce((sum: number, s: any) => sum + (s.durationEstimate || s.duration_sec || s.duration || 3), 0) + "s") || "30s",
                tags: p.script.metadata?.tags || p.script.tags || [],
                thumbnailPrompt: p.script.metadata?.thumbnail?.imagePrompt || "",
                scenes: normalizeScenes(p.script?.scenes || (Array.isArray(p.script?.segments) ? p.script.segments.flatMap((seg: any) => seg.scenes || [seg]) : [])),
              };

              setScript(normalizedScript);

              const projectId = crypto.randomUUID();
              setLastProjectId(projectId);
              const selectedChannel = channels.find((c) => c.id === selectedChannelId);
              await saveProject({
                id: projectId,
                channel_id: selectedChannelId || undefined,
                topic, mode: mode as "longform" | "shorts",
                source: source as "quick" | "benchmark" | "reference",
                category, language, status: "scripting",
                title: normalizedScript.title,
                script: normalizedScript,
                voice_preset_snapshot: selectedChannel?.voice_preset,
                image_preset_snapshot: selectedChannel?.image_preset,
                subtitle_preset_snapshot: selectedChannel?.subtitle_preset,
                render_preset_snapshot: selectedChannel?.render_preset,
                benchmark_url: benchmarkUrl || undefined,
              });
              localStorage.setItem("reelzfactory_script_" + projectId, JSON.stringify(normalizedScript));
            } else if (p.type === "error") setError(p.error);
          } catch (parseErr) { console.warn("[SSE] parse failed:", d.slice(0, 100), parseErr); }
        }
      }
    } catch (err: any) { setError(err.message); }
    finally { setIsGenerating(false); }
  };

  const S = { card: { padding: "12px", background: "#111827", border: "1px solid #1e293b", borderRadius: "8px" }, label: { display: "block", marginBottom: "6px", color: "#94a3b8", fontSize: "14px" }, select: { width: "100%", padding: "10px", background: "#111827", border: "1px solid #1e293b", borderRadius: "8px", color: "#fff" } };

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "24px", color: "#fff" }}>New Video</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={S.label}>Channel {selectedChannelId && <span style={{ marginLeft: "8px", color: "#10b981", fontSize: "12px" }}>Preset Auto-applied</span>}</label>
            <select value={selectedChannelId} onChange={(e) => {
              setSelectedChannelId(e.target.value);
              const ch = channels.find((c) => c.id === e.target.value);
              if (ch) { setCategory(ch.category || ch.niche || "health"); setLanguage(ch.language || "ko"); }
            }} style={S.select}>
              <option value="">No Channel (Manual)</option>
              {channels.map((ch) => <option key={ch.id} value={ch.id!}>{ch.name} ({ch.niche})</option>)}
            </select>
          </div>

          {source !== "reference" && (
            <div>
              <label style={S.label}>Topic</label>
              <textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. 3 seconds rule, Bitcoin ETF impact..." rows={3} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #1e293b", background: "#111827", color: "#e2e8f0", fontSize: "13px", resize: "vertical" }} />
            </div>
          )}

          <div>
            <label style={S.label}>Mode</label>
            <div style={{ display: "flex", gap: "8px" }}>
              {[["shorts", "Shorts"], ["longform", "Longform"]].map(([id, lb]) => (
                <button key={id} onClick={() => { setMode(id); setDuration(id === "shorts" ? 30 : 10); }} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid", borderColor: mode === id ? "#2563eb" : "#1e293b", background: mode === id ? "#1e3a5f" : "#111827", color: mode === id ? "#60a5fa" : "#94a3b8", cursor: "pointer", fontSize: "13px" }}>{lb}</button>
              ))}
            </div>
          </div>
          {mode === "shorts" && source !== "reference" && (
            <div style={{ marginTop: "8px" }}>
              <label style={S.label}>Duration: {duration}s</label>
              <input type="range" min={15} max={70} value={duration} onChange={(e) => setDuration(Number(e.target.value))} style={{ width: "100%" }} />
            </div>
          )}
          {mode === "longform" && source !== "reference" && (
            <div style={{ marginTop: "8px" }}>
              <label style={S.label}>Duration: {duration} min</label>
              <input type="range" min={3} max={30} value={duration} onChange={(e) => setDuration(Number(e.target.value))} style={{ width: "100%" }} />
            </div>
          )}

          <div>
            <label style={S.label}>Source</label>
            <div style={{ display: "flex", gap: "8px" }}>
              {[["quick", "Quick (AI Only)"], ["benchmark", "Benchmark"], ["reference", "My Script"]].map(([id, lb]) => (
                <button key={id} onClick={() => setSource(id)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid", borderColor: source === id ? "#2563eb" : "#1e293b", background: source === id ? "#1e3a5f" : "#111827", color: source === id ? "#60a5fa" : "#94a3b8", cursor: "pointer", fontSize: "13px" }}>{lb}</button>
              ))}
            </div>
          </div>

          {/* Benchmark 입력 */}
          {source === "benchmark" && (
            <div>
              <label style={S.label}>YouTube URL (벤치마크 영상)</label>
              <input
                type="url"
                value={benchmarkUrl}
                onChange={(e) => setBenchmarkUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... 또는 Shorts URL"
                style={S.select}
              />
              <div style={{ marginTop: "6px", fontSize: "11px", color: "#64748b" }}>
                이 영상의 구조/톤/전개를 분석하여 동일한 스타일로 대본을 생성합니다.
              </div>
            </div>
          )}

          {/* Reference 입력 */}
          {source === "reference" && (
            <div>
              <label style={S.label}>참고 대본 (Reference Script)</label>
              <textarea
                value={referenceScript}
                onChange={(e) => setReferenceScript(e.target.value)}
                placeholder={"성공한 영상의 대본을 붙여넣으세요.\n\n예시:\n[훅] 40대가 이걸 모르면 혈관이 막힙니다\n[상황] 대부분의 사람들은...\n[핵심] 첫 번째 비밀은...\n[CTA] 이 영상을 저장하지 않으면..."}
                rows={8}
                style={{ ...S.select, resize: "vertical", lineHeight: "1.6" }}
              />
              <div style={{ marginTop: "6px", fontSize: "11px", color: "#64748b" }}>
                이 대본의 톤, 구조, 전개 방식을 분석하여 동일한 스타일로 새 대본을 생성합니다.
              </div>
            </div>
          )}



          <div>
            <label style={S.label}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={S.select}>
              {categories.map((c) => (<option key={c.id} value={c.id}>{c.label}</option>))}
            </select>
          </div>



          <div>
            <label style={S.label}>Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} style={S.select}>
              {[["ko", "Korean"], ["en", "English"], ["pt", "Portuguese"], ["es", "Spanish"], ["ja", "Japanese"]].map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
            </select>
          </div>

          <button onClick={handleGenerate} disabled={isGenerating || (source !== "reference" && !topic.trim())} style={{ padding: "14px", borderRadius: "8px", border: "none", background: isGenerating ? "#1e293b" : "#2563eb", color: "#fff", fontWeight: "bold", fontSize: "16px", cursor: isGenerating ? "not-allowed" : "pointer", marginTop: "8px" }}>
            {isGenerating ? "Generating..." : source === "benchmark" ? "Benchmark → Generate" : source === "reference" ? "Reference → Generate" : "Generate Script"}
          </button>

          {error && (<div style={{ padding: "12px", background: "#450a0a", border: "1px solid #ef4444", borderRadius: "8px", color: "#fca5a5", fontSize: "14px" }}>{error}</div>)}
          {revisionNeeded && (
            <div style={{ padding: "12px", background: "#422006", border: "1px solid #f59e0b", borderRadius: "8px", fontSize: "13px" }}>
              <div style={{ color: "#fbbf24", fontWeight: 600, marginBottom: 6 }}>⚠️ 대본 품질 검토 필요 (REVISE)</div>
              {reviseInstructions && <div style={{ color: "#fde68a", marginBottom: 8, lineHeight: 1.6 }}>{reviseInstructions}</div>}
              <button onClick={() => { setRevisionNeeded(false); handleGenerate(); }} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #f59e0b", background: "#78350f", color: "#fbbf24", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                🔄 재생성
              </button>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {(isGenerating || streamText) && (
            <div>
              <label style={S.label}>{isGenerating ? "Generating..." : "Complete"}</label>
              <div style={{ padding: "16px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", maxHeight: "300px", overflow: "auto", fontSize: "12px", color: "#e2e8f0", fontFamily: "monospace", whiteSpace: "pre-wrap", lineHeight: "1.6" }}>{streamText || "Waiting..."}</div>
            </div>
          )}

          {script && (
            <div>
              <label style={S.label}>Script Result - {script.totalScenes || script.scenes?.length || 0} scenes</label>
              <div style={{ ...S.card, marginBottom: "12px" }}>
                <div style={{ fontSize: "16px", fontWeight: "bold", color: "#fff" }}>{script.title || "Untitled"}</div>
                {source !== "quick" && (
                  <div style={{ marginTop: "4px", fontSize: "11px", color: "#8b5cf6" }}>
                    {source === "benchmark" ? `Benchmark: ${benchmarkUrl}` : "Reference 기반 생성"}
                  </div>
                )}
                {script.tags?.length > 0 && (<div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "4px" }}>{script.tags.slice(0, 8).map((t: any, i: number) => (<span key={i} style={{ padding: "2px 8px", background: "#1e293b", borderRadius: "12px", fontSize: "11px", color: "#94a3b8" }}>{t}</span>))}</div>)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "400px", overflow: "auto" }}>
                {script.scenes?.map((sc: any, i: number) => (
                  <div key={i} style={S.card}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12px", color: "#60a5fa", fontWeight: "bold" }}>Scene {sc.sceneNumber} - {sc.section}</span>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>{sc.duration}s</span>
                    </div>
                    <div style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: "1.5" }}>{sc.narration}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => { if (lastProjectId) router.push("/create/" + lastProjectId); }} style={{ marginTop: "16px", padding: "12px", width: "100%", borderRadius: "8px", border: "none", background: "#10b981", color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "14px" }}>Next: Generate Images</button>
            </div>
          )}

          {!isGenerating && !streamText && !script && (
            <div style={{ padding: "40px", background: "#0f172a", borderRadius: "12px", border: "1px dashed #1e293b", textAlign: "center", color: "#64748b" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>Video</div>
              <div style={{ fontSize: "16px", marginBottom: "8px" }}>Script will appear here</div>
              <div style={{ fontSize: "13px" }}>
                {source === "benchmark" ? "Benchmark 모드 — YouTube 영상 구조를 분석하여 복제합니다"
                  : source === "reference" ? "Reference 모드 — 참고 대본의 스타일을 분석하여 생성합니다"
                    : "Quick mode - AI general knowledge"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
