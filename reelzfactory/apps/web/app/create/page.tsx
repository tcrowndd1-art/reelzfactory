"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreatePage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState("shorts");
  const [source, setSource] = useState("quick");
  const [niche, setNiche] = useState("");
  const [category, setCategory] = useState("health");
  const [language, setLanguage] = useState("ko");
  const [knowledgeStatus, setKnowledgeStatus] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [script, setScript] = useState(null);
  const [error, setError] = useState("");

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

  const nicheOptions = [
    { id: "", label: "None (General)" },
    { id: "nutrilite", label: "Nutrilite" },
  ];

  useEffect(() => {
    if (niche) {
      setKnowledgeStatus("Loading...");
      fetch("/api/knowledge/" + niche)
        .then((res) => { if (res.ok) return res.json(); throw new Error("fail"); })
        .then((data) => {
          const hc = (data.hooks || []).reduce((s, h) => s + (h.hooks?.length || h.scenes?.length || h.frameworks?.length || 0), 0);
          const fc = (data.factbase || []).reduce((s, f) => s + (f.ingredients?.length || f.products?.length || 0), 0);
          const ch = data.character?.length > 0 ? (data.character[0].character_name || data.character[0].name || "Unknown") : "None";
          setKnowledgeStatus("Hooks: " + hc + " / Facts: " + fc + " / Compliance: " + (data.compliance ? "OK" : "N/A") + " / Char: " + ch);
        })
        .catch(() => setKnowledgeStatus("Knowledge pack not found"));
    } else {
      setKnowledgeStatus("");
    }
  }, [niche]);

  // Normalize scene fields from various AI output formats
  function normalizeScenes(scenes) {
    if (!scenes || !Array.isArray(scenes)) return [];
    return scenes.map((s, i) => ({
      ...s,
      sceneNumber: s.id || s.scene_number || s.sceneNumber || i + 1,
      narration: s.text || s.tts_script || s.narration || "",
      duration: s.durationEstimate || s.duration_sec || s.duration || 3,
      section: s.type || s.phase || s.section || "core",
      imagePrompt: s.imagePrompt || s.image_prompt || "",
      textOverlay: s.subtitleEmphasis ? s.subtitleEmphasis.join(" / ") : s.textOverlay || "",
    }));
  }

  const handleGenerate = async () => {
    if (!topic.trim()) { setError("Enter a topic"); return; }
    const settings = JSON.parse(localStorage.getItem("reelzfactory_settings") || "{}");
    const apiKey = settings.apiKeys?.openrouter;
    if (!apiKey) { setError("Set OpenRouter API key in Settings"); return; }

    setIsGenerating(true); setStreamText(""); setScript(null); setError("");

    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), mode, source, language, category, niche: niche || undefined, apiKey }),
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
              // Normalize scenes before saving
              const normalizedScript = {
                ...p.script,
                title: p.script.title || p.script.metadata?.title || topic,
                description: p.script.metadata?.description || "",
                totalScenes: p.script.totalScenes || p.script.total_scenes || p.script.scenes?.length || 0,
                estimatedDuration: p.script.estimatedDuration || (p.script.scenes?.reduce((sum, s) => sum + (s.durationEstimate || s.duration_sec || s.duration || 3), 0) + "s") || "30s",
                tags: p.script.metadata?.tags || p.script.tags || [],
                thumbnailPrompt: p.script.metadata?.thumbnail?.imagePrompt || "",
                scenes: normalizeScenes(p.script.scenes),
              };

              setScript(normalizedScript);

              const projects = JSON.parse(localStorage.getItem("reelzfactory_projects") || "[]");
              const projectId = Date.now().toString();
              projects.unshift({ id: projectId, topic, mode, source, niche, category, knowledgeUsed: p.knowledgeUsed, createdAt: new Date().toISOString(), status: "script_done", title: normalizedScript.title });
              localStorage.setItem("reelzfactory_projects", JSON.stringify(projects));
              // Save normalized script separately for pipeline pages
              localStorage.setItem("reelzfactory_script_" + projectId, JSON.stringify(normalizedScript));
            } else if (p.type === "error") setError(p.error);
          } catch {}
        }
      }
    } catch (err) { setError(err.message); }
    finally { setIsGenerating(false); }
  };

  const S = { card: { padding: "12px", background: "#111827", border: "1px solid #1e293b", borderRadius: "8px" }, label: { display: "block", marginBottom: "6px", color: "#94a3b8", fontSize: "14px" }, select: { width: "100%", padding: "10px", background: "#111827", border: "1px solid #1e293b", borderRadius: "8px", color: "#fff" } };

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "24px", color: "#fff" }}>New Video</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={S.label}>Topic</label>
            <textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. 3 secrets for vascular health in your 40s" rows={3} style={{ ...S.select, resize: "vertical" }} />
          </div>

          <div>
            <label style={S.label}>Mode</label>
            <div style={{ display: "flex", gap: "8px" }}>
              {[["shorts","Shorts (25-45s)"],["longform","Longform (15-20m)"],["animation","Animation"]].map(([id,lb]) => (
                <button key={id} onClick={() => setMode(id)} style={{ flex:1, padding:"10px", borderRadius:"8px", border:"1px solid", borderColor: mode===id?"#2563eb":"#1e293b", background: mode===id?"#1e3a5f":"#111827", color: mode===id?"#60a5fa":"#94a3b8", cursor:"pointer", fontSize:"13px" }}>{lb}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={S.label}>Source</label>
            <div style={{ display: "flex", gap: "8px" }}>
              {[["quick","Quick (AI Only)"],["benchmark","Benchmark"],["reference","Reference"]].map(([id,lb]) => (
                <button key={id} onClick={() => setSource(id)} style={{ flex:1, padding:"10px", borderRadius:"8px", border:"1px solid", borderColor: source===id?"#2563eb":"#1e293b", background: source===id?"#1e3a5f":"#111827", color: source===id?"#60a5fa":"#94a3b8", cursor:"pointer", fontSize:"13px" }}>{lb}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={S.label}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={S.select}>
              {categories.map((c) => (<option key={c.id} value={c.id}>{c.label}</option>))}
            </select>
          </div>

          <div>
            <label style={S.label}>Knowledge Pack {niche && <span style={{ marginLeft:"8px", color:"#10b981", fontSize:"12px" }}>Active</span>}</label>
            <select value={niche} onChange={(e) => setNiche(e.target.value)} style={S.select}>
              {nicheOptions.map((n) => (<option key={n.id} value={n.id}>{n.label}</option>))}
            </select>
            {knowledgeStatus && (<div style={{ marginTop:"6px", padding:"8px 12px", background:"#0f172a", borderRadius:"6px", fontSize:"12px", color:"#10b981", border:"1px solid #1e293b" }}>{knowledgeStatus}</div>)}
          </div>

          <div>
            <label style={S.label}>Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} style={S.select}>
              {[["ko","Korean"],["en","English"],["pt","Portuguese"],["es","Spanish"],["ja","Japanese"]].map(([v,l]) => (<option key={v} value={v}>{l}</option>))}
            </select>
          </div>

          <button onClick={handleGenerate} disabled={isGenerating || !topic.trim()} style={{ padding:"14px", borderRadius:"8px", border:"none", background: isGenerating?"#1e293b":"#2563eb", color:"#fff", fontWeight:"bold", fontSize:"16px", cursor: isGenerating?"not-allowed":"pointer", marginTop:"8px" }}>
            {isGenerating ? "Generating..." : "Generate Script"}
          </button>

          {error && (<div style={{ padding:"12px", background:"#450a0a", border:"1px solid #ef4444", borderRadius:"8px", color:"#fca5a5", fontSize:"14px" }}>{error}</div>)}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {(isGenerating || streamText) && (
            <div>
              <label style={S.label}>{isGenerating ? "Generating..." : "Complete"}</label>
              <div style={{ padding:"16px", background:"#0f172a", border:"1px solid #1e293b", borderRadius:"8px", maxHeight:"300px", overflow:"auto", fontSize:"12px", color:"#e2e8f0", fontFamily:"monospace", whiteSpace:"pre-wrap", lineHeight:"1.6" }}>{streamText || "Waiting..."}</div>
            </div>
          )}

          {script && (
            <div>
              <label style={S.label}>Script Result - {script.totalScenes || script.scenes?.length || 0} scenes</label>
              <div style={{ ...S.card, marginBottom:"12px" }}>
                <div style={{ fontSize:"16px", fontWeight:"bold", color:"#fff" }}>{script.title || "Untitled"}</div>
                {script.tags?.length > 0 && (<div style={{ marginTop:"8px", display:"flex", flexWrap:"wrap", gap:"4px" }}>{script.tags.slice(0,8).map((t,i) => (<span key={i} style={{ padding:"2px 8px", background:"#1e293b", borderRadius:"12px", fontSize:"11px", color:"#94a3b8" }}>{t}</span>))}</div>)}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:"8px", maxHeight:"400px", overflow:"auto" }}>
                {script.scenes?.map((sc,i) => (
                  <div key={i} style={S.card}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
                      <span style={{ fontSize:"12px", color:"#60a5fa", fontWeight:"bold" }}>Scene {sc.sceneNumber} - {sc.section}</span>
                      <span style={{ fontSize:"11px", color:"#64748b" }}>{sc.duration}s</span>
                    </div>
                    <div style={{ fontSize:"13px", color:"#e2e8f0", lineHeight:"1.5" }}>{sc.narration}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => { const p = JSON.parse(localStorage.getItem("reelzfactory_projects") || "[]"); if (p.length > 0) router.push("/create/" + p[0].id); }} style={{ marginTop:"16px", padding:"12px", width:"100%", borderRadius:"8px", border:"none", background:"#10b981", color:"#fff", fontWeight:"bold", cursor:"pointer", fontSize:"14px" }}>Next: Generate Images</button>
            </div>
          )}

          {!isGenerating && !streamText && !script && (
            <div style={{ padding:"40px", background:"#0f172a", borderRadius:"12px", border:"1px dashed #1e293b", textAlign:"center", color:"#64748b" }}>
              <div style={{ fontSize:"48px", marginBottom:"12px" }}>Video</div>
              <div style={{ fontSize:"16px", marginBottom:"8px" }}>Script will appear here</div>
              <div style={{ fontSize:"13px" }}>{niche ? "Knowledge Pack (" + niche + ") active" : "Quick mode - AI general knowledge"}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
