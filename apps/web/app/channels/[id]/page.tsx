

// ============================================================
// C:\Dev\reelzfactory\apps\web\app\channels\[id]\page.tsx
// 채널 상세 — Voice/Image/Subtitle/Render/YouTube 프리셋 편집
// ============================================================

"use client";
import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { getChannel, saveChannel, getSettings, ChannelProfile } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { DEFAULT_VOICE_PRESET, DEFAULT_IMAGE_PRESET, DEFAULT_SUBTITLE_PRESET, DEFAULT_RENDER_PRESET } from "@/constants/presets";
import { DEFAULT_SCRIPT_PRESET } from "@/lib/store";
import { ENGINE_MAP } from "@/constants/engineMap";
import { ALL_VOICES } from "@/constants/voiceConfig";

type Tab = "script" | "voice" | "image" | "subtitle" | "render" | "youtube";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "script", label: "Script", icon: "📝" },
  { key: "voice", label: "Voice", icon: "🎙️" },
  { key: "image", label: "Image", icon: "🖼️" },
  { key: "subtitle", label: "Subtitle", icon: "💬" },
  { key: "render", label: "Render", icon: "🎬" },
  { key: "youtube", label: "YouTube", icon: "▶" },
];



const OPENAI_VOICES: { id: string; label: string; desc: string; gender: "male" | "female" }[] = [
  { id: "alloy", label: "Alloy", desc: "중성적·균형", gender: "female" },
  { id: "echo", label: "Echo", desc: "남성·깊은 톤", gender: "male" },
  { id: "fable", label: "Fable", desc: "영국풍·내레이션", gender: "male" },
  { id: "nova", label: "Nova", desc: "여성·따뜻한", gender: "female" },
  { id: "onyx", label: "Onyx", desc: "남성·중후한", gender: "male" },
  { id: "shimmer", label: "Shimmer", desc: "여성·밝은", gender: "female" },
];

/* ── Image ── */
const IMAGE_STYLES = [
  { id: "viral-meme", label: "바이럴 밈", desc: "Wojak, Lo-fi, 자학 풍자, 고도파민" },
  { id: "drama-noir", label: "드라마/비사", desc: "K-Mystery, 실사 사극, 고대비, 임팩트" },
  { id: "info-docu", label: "인포 다큐", desc: "시네마틱 다큐, 다크 무디, 나레이션 중심 롱폼" },
  { id: "money-data", label: "머니 데이터", desc: "차트, 그래프, 수치 중심, 자본주의 룩" },
  { id: "logic-sketch", label: "논리 스케치", desc: "화이트보드, 설명, 흐름도(Flow)" },
  { id: "sim-monkey", label: "시뮬레이션: 몽키", desc: "원숭이 우화, 극단적 단순화, S-V-O 뼈대 문장" },
];

/* ── Subtitle ── */
const SUBTITLE_FONTS = [
  { id: "'Pretendard Variable', 'Pretendard', sans-serif", label: "Pretendard (기본)" },
  { id: "'Gaegu', cursive", label: "Gaegu (손글씨 한글)" },
  { id: "'Caveat', cursive", label: "Caveat (손글씨 영문)" },
  { id: "'Noto Sans KR', sans-serif", label: "Noto Sans KR" },
  { id: "'Inter', sans-serif", label: "Inter" },
  { id: "'Black Han Sans', sans-serif", label: "Black Han Sans (굵은 한글)" },
];
const ANIMATIONS = [
  { id: "popIn", label: "팝인" },
  { id: "fadeUp", label: "페이드업" },
  { id: "highlightSweep", label: "하이라이트 스윕" },
  { id: "typewriter", label: "타자기" },
  { id: "bounce", label: "바운스" },
  { id: "wave", label: "웨이브" },
];
const HIGHLIGHT_STYLES = [
  { id: "background", label: "배경 강조" },
  { id: "color", label: "색상 변경" },
  { id: "scale", label: "크기 확대" },
  { id: "underline", label: "밑줄" },
];

/* ── Render ── */
const TRANSITIONS = [
  { id: "fade", label: "페이드", desc: "부드러운 전환" },
  { id: "slideLeft", label: "슬라이드←", desc: "왼쪽으로 밀기" },
  { id: "slideRight", label: "슬라이드→", desc: "오른쪽으로 밀기" },
  { id: "zoomIn", label: "줌인", desc: "확대 진입" },
  { id: "zoomOut", label: "줌아웃", desc: "축소 전환" },
  { id: "dissolve", label: "디졸브", desc: "겹침 전환" },
];
const MOTION_LEVELS = [
  { id: "low", label: "낮음", desc: "차분하고 안정적" },
  { id: "medium", label: "보통", desc: "균형 잡힌 움직임" },
  { id: "high", label: "높음", desc: "역동적이고 빠름" },
];
const MUSIC_STYLES = [
  { id: "ambient", label: "앰비언트", desc: "잔잔한 배경" },
  { id: "energetic", label: "에너제틱", desc: "빠른 템포" },
  { id: "cinematic", label: "시네마틱", desc: "웅장하고 극적" },
  { id: "none", label: "없음", desc: "배경음악 없음" },
];
const RENDER_RECIPES = [
  {
    id: "monkey_economy", label: "🐵 원숭이 경제 우화", desc: "시네마틱 + 중간 움직임",
    preset: { transitions: ["fade", "zoomIn"], motionIntensity: "medium", musicStyle: "cinematic", fps: 30, resolution: { width: 1080, height: 1920 } },
  },
  {
    id: "health_shorts", label: "💊 건강 쇼츠", desc: "앰비언트 + 차분한 전환",
    preset: { transitions: ["fade", "slideLeft"], motionIntensity: "low", musicStyle: "ambient", fps: 30, resolution: { width: 1080, height: 1920 } },
  },
  {
    id: "shopping_shorts", label: "🛒 쇼핑 쇼츠", desc: "에너제틱 + 역동적 전환",
    preset: { transitions: ["slideLeft", "slideRight", "zoomIn"], motionIntensity: "high", musicStyle: "energetic", fps: 30, resolution: { width: 1080, height: 1920 } },
  },
];

export default function ChannelSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [channel, setChannel] = useState<ChannelProfile | null>(null);
  const [tab, setTab] = useState<Tab>("script")
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const [voice, setVoice] = useState<Record<string, any>>(DEFAULT_VOICE_PRESET);
  const [image, setImage] = useState<Record<string, any>>(DEFAULT_IMAGE_PRESET);
  const [scriptPreset, setScriptPreset] = useState<Record<string, any>>(DEFAULT_SCRIPT_PRESET);
  const [subtitle, setSubtitle] = useState<Record<string, any>>(DEFAULT_SUBTITLE_PRESET);
  const [render, setRender] = useState<Record<string, any>>(DEFAULT_RENDER_PRESET);
  const [youtubeId, setYoutubeId] = useState("");
  const [youtubeToken, setYoutubeToken] = useState("");
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState<string | null>(null);

  // 레퍼런스 이미지
  const [refImages, setRefImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // YouTube 검증
  const [ytVerifying, setYtVerifying] = useState(false);
  const [ytChannel, setYtChannel] = useState<{ title: string; thumbnail: string } | null>(null);
  const [ytError, setYtError] = useState<string | null>(null);

  useEffect(() => {
    getChannel(id).then((ch) => {
      if (!ch) { router.push("/channels"); return; }
      setChannel(ch);
      setVoice({ ...DEFAULT_VOICE_PRESET, ...ch.voice_preset });
      setScriptPreset({ ...DEFAULT_SCRIPT_PRESET, ...ch.script_preset });
      setImage({ ...DEFAULT_IMAGE_PRESET, ...ch.image_preset });
      setSubtitle({ ...DEFAULT_SUBTITLE_PRESET, ...ch.subtitle_preset });
      setRender({ ...DEFAULT_RENDER_PRESET, ...ch.render_preset });
      setYoutubeId(ch.youtube_channel_id || "");
      setYoutubeToken(ch.youtube_refresh_token || "");
      setRefImages(ch.image_preset?.referenceImages || []);
      setLoading(false);

      // YouTube 채널 자동 검증
      if (ch.youtube_channel_id) {
        verifyYouTubeChannel(ch.youtube_channel_id);
      }
    });
  }, [id, router]);

  /* ── YouTube 채널 검증 ── */
  const verifyYouTubeChannel = async (channelId: string) => {
    if (!channelId.trim()) return;
    setYtVerifying(true);
    setYtError(null);
    setYtChannel(null);

    try {
      const settings = getSettings();
      const apiKey = settings.apiKeys?.youtube;
      if (!apiKey) {
        setYtError("Settings에서 YouTube Data API 키를 먼저 입력하세요.");
        setYtVerifying(false);
        return;
      }

      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${apiKey}`
      );
      const data = await res.json();

      if (data.items && data.items.length > 0) {
        const snippet = data.items[0].snippet;
        setYtChannel({
          title: snippet.title,
          thumbnail: snippet.thumbnails?.default?.url || "",
        });
      } else {
        setYtError("채널을 찾을 수 없습니다. ID를 확인하세요.");
      }
    } catch {
      setYtError("검증 실패. 네트워크 또는 API 키를 확인하세요.");
    }
    setYtVerifying(false);
  };

  /* ── 레퍼런스 이미지 업로드 ── */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);

    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `channels/${id}/ref_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const { error } = await supabase.storage
        .from("uploads")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (!error) {
        const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
        if (urlData?.publicUrl) newUrls.push(urlData.publicUrl);
      }
    }

    const updated = [...refImages, ...newUrls].slice(0, 4);
    setRefImages(updated);
    setImage({ ...image, referenceImages: updated });
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveRefImage = async (url: string) => {
    const path = url.split("/uploads/")[1];
    if (path) await supabase.storage.from("uploads").remove([path]);
    const updated = refImages.filter((u) => u !== url);
    setRefImages(updated);
    setImage({ ...image, referenceImages: updated });
  };

  const handleSave = async () => {
    if (!channel?.id) return;
    setSaving(true);
    await saveChannel({
      id: channel.id,
      voice_preset: voice,
      image_preset: { ...image, referenceImages: refImages },
      subtitle_preset: subtitle,
      render_preset: render,
      script_preset: scriptPreset,
      youtube_channel_id: youtubeId || undefined,
      youtube_refresh_token: youtubeToken || undefined,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px", background: "#0a0a0a", border: "1px solid #1e293b",
    borderRadius: 6, color: "#fff", fontSize: 13, outline: "none", width: "100%",
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, color: "#94a3b8", marginBottom: 4, display: "block" };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };
  const rowStyle: React.CSSProperties = { display: "flex", gap: 12, marginBottom: 16 };
  const fieldStyle: React.CSSProperties = { flex: 1, display: "flex", flexDirection: "column" };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", color: "#64748b" }}>
      로딩 중...
    </div>
  );

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.push("/channels")}
            style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 20 }}>
            ←
          </button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>{channel?.name}</h1>
            <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>{channel?.niche} · {channel?.language}</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          style={{
            padding: "10px 24px", background: saved ? "#10b981" : "#2563eb",
            color: "#fff", border: "none", borderRadius: 8, cursor: "pointer",
            fontSize: 14, fontWeight: 600, transition: "background 0.3s",
          }}>
          {saving ? "저장 중..." : saved ? "✓ 저장됨" : "💾 저장"}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid #1e293b", paddingBottom: 1 }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: "10px 16px", background: tab === t.key ? "#1e293b" : "transparent",
              color: tab === t.key ? "#fff" : "#64748b", border: "none", borderRadius: "8px 8px 0 0",
              cursor: "pointer", fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
              borderBottom: tab === t.key ? "2px solid #2563eb" : "2px solid transparent",
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 12, padding: 24 }}>
        {/* ━━━ Script 탭 ━━━ */}
        {tab === "script" && (
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 20 }}>📝 스크립트 엔진 설정</h3>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Shorts 엔진</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["auto", ...Object.keys(ENGINE_MAP)].map((e) => (
                  <button key={e} onClick={() => setScriptPreset({ ...scriptPreset, shortsEngine: e })} style={{
                    padding: "8px 16px", borderRadius: 8, fontSize: 13, border: "none", cursor: "pointer",
                    background: scriptPreset.shortsEngine === e ? "#2563eb" : "#1e293b",
                    color: scriptPreset.shortsEngine === e ? "#fff" : "#94a3b8",
                  }}>{e === "auto" ? "🔄 Auto (Sonnet 4.6)" : ENGINE_MAP[e]?.label || e}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Longform 엔진</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["auto", ...Object.keys(ENGINE_MAP)].map((e) => (
                  <button key={e} onClick={() => setScriptPreset({ ...scriptPreset, longformEngine: e })} style={{
                    padding: "8px 16px", borderRadius: 8, fontSize: 13, border: "none", cursor: "pointer",
                    background: scriptPreset.longformEngine === e ? "#2563eb" : "#1e293b",
                    color: scriptPreset.longformEngine === e ? "#fff" : "#94a3b8",
                  }}>{e === "auto" ? "🔄 Auto (Sonnet 4.6)" : ENGINE_MAP[e]?.label || e}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>데이터 수집 엔진</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["auto", "kimi-k2.5", "gemini-2.5-flash", "gemini-2.5-pro"].map((e) => (
                  <button key={e} onClick={() => setScriptPreset({ ...scriptPreset, dataEngine: e })} style={{
                    padding: "8px 16px", borderRadius: 8, fontSize: 13, border: "none", cursor: "pointer",
                    background: scriptPreset.dataEngine === e ? "#2563eb" : "#1e293b",
                    color: scriptPreset.dataEngine === e ? "#fff" : "#94a3b8",
                  }}>{e === "auto" ? "🔄 Auto (Kimi K2.5)" : ENGINE_MAP[e]?.label || e}</button>
                ))}
              </div>
            </div>

            {/* A지침서 — 항상 로드 */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>
                📋 A지침서 — Project Instructions (항상 로드)
              </label>
              <p style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>
                역할, 타겟, 대본공식, 페르소나, 언어, 출력규칙을 정의합니다. 매 대본 생성 시 system prompt 최상단에 주입됩니다.
              </p>
              <textarea
                value={scriptPreset.instruction_a || ""}
                onChange={(e) => setScriptPreset({ ...scriptPreset, instruction_a: e.target.value })}
                placeholder={"예: ROLE: 전략 AI 파트너...\nTARGET: 40-60대 여성...\nSCRIPT FORMULA: HOOK(0-5s)→BODY(5-45s)→OUTRO(45-50s)..."}
                rows={10}
                style={{ width: "100%", background: "#0d1117", border: "1px solid #1e293b", borderRadius: 8, padding: 12, color: "#e2e8f0", fontSize: 12, resize: "vertical", lineHeight: 1.6 } as React.CSSProperties}
              />
            </div>

            {/* B지침서 — 대본/오디오 Knowledge */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>
                📚 B지침서 — Strategy & Knowledge (대본 생성 시 참조)
              </label>
              <p style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>
                Hook 패턴, 오디오 가이드, 제목 공식, 타겟 심리 등. 대본 생성 시 knowledge로 주입됩니다.
              </p>
              <textarea
                value={scriptPreset.knowledge_b || ""}
                onChange={(e) => setScriptPreset({ ...scriptPreset, knowledge_b: e.target.value })}
                placeholder={"예: HOOK 6 PATTERNS:\nIN MEDIAS RES: 대명사로 사건 클라이맥스 직입\nCOGNITIVE DISSONANCE: 기괴한 행동 선공개..."}
                rows={10}
                style={{ width: "100%", background: "#0d1117", border: "1px solid #1e293b", borderRadius: 8, padding: 12, color: "#e2e8f0", fontSize: 12, resize: "vertical", lineHeight: 1.6 } as React.CSSProperties}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <label style={labelStyle}>대본 검증기 (Validator)</label>
              <button
                onClick={() => setScriptPreset({ ...scriptPreset, validatorEnabled: !scriptPreset.validatorEnabled })}
                style={{
                  padding: "6px 16px", borderRadius: 8, fontSize: 13, border: "none", cursor: "pointer",
                  background: scriptPreset.validatorEnabled ? "#10b981" : "#374151",
                  color: "#fff",
                }}
              >{scriptPreset.validatorEnabled ? "ON" : "OFF"}</button>
            </div>
          </div>
        )}

        {/* ━━━ Voice 탭 ━━━ */}
        {tab === "voice" && (
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 20 }}>🎙️ 보이스 프리셋</h3>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>엔진</label>
              <div style={{ display: "flex", gap: 8 }}>
                {([
                  { id: "gemini", label: "Google", color: "#3b82f6", desc: "Gemini TTS" },
                  { id: "openai", label: "OpenAI", color: "#10b981", desc: "속도 정밀제어" },
                  { id: "clone", label: "Clone", color: "#f59e0b", desc: "내 목소리" },
                ] as const).map((e) => (
                  <button key={e.id} onClick={() => setVoice({ ...voice, provider: e.id, voiceName: "" })} style={{
                    flex: 1, padding: "12px 8px", borderRadius: 8, cursor: "pointer", textAlign: "center",
                    border: voice.provider === e.id ? `2px solid ${e.color}` : "1px solid #1e293b",
                    background: voice.provider === e.id ? `${e.color}12` : "#0d1117",
                    color: voice.provider === e.id ? e.color : "#64748b",
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{e.label}</div>
                    <div style={{ fontSize: 10, marginTop: 2, opacity: 0.7 }}>{e.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            {voice.provider === "gemini" && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>말하기 속도</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    {([
                      { id: "slow", label: "느리게", prompt: "천천히 또박또박 느린 속도로 말해줘" },
                      { id: "normal", label: "보통", prompt: "" },
                      { id: "fast", label: "빠르게", prompt: "기본보다 빠른 속도로 말해줘" },
                      { id: "faster", label: "더 빠르게", prompt: "기본보다 훨씬 빠른 속도로 말해줘" },
                      { id: "fastest", label: "아주 빠르게", prompt: "최대한 빠른 속도로 아주 빠르게 말해줘" },
                    ]).map((s) => {
                      const current = voice.speedPreset || "normal";
                      return (
                        <button key={s.id} onClick={() => {
                          const otherStyle = (voice.stylePrompt || "").replace(/천천히.*말해줘|기본보다.*말해줘|최대한.*말해줘/g, "").trim();
                          const newPrompt = s.prompt ? (otherStyle ? s.prompt + "\n" + otherStyle : s.prompt) : otherStyle;
                          setVoice({ ...voice, speedPreset: s.id, stylePrompt: newPrompt });
                        }} style={{
                          flex: 1, padding: "8px 4px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600,
                          border: current === s.id ? "1px solid #3b82f6" : "1px solid #1e293b",
                          background: current === s.id ? "rgba(59,130,246,0.08)" : "#0d1117",
                          color: current === s.id ? "#3b82f6" : "#64748b",
                        }}>{s.label}</button>
                      );
                    })}
                  </div>
                  <p style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>쇼츠 콘텐츠는 '빠르게' 이상 추천. 프롬프트 기반 제어라 정확한 배속이 아닌 근사치입니다.</p>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>음성 스타일 지침 (선택)</label>
                  <textarea
                    value={voice.stylePrompt || ""}
                    onChange={(e) => setVoice({ ...voice, stylePrompt: e.target.value })}
                    placeholder="예: 속삭이듯 부드럽게 말해줘 / 뉴스 앵커처럼 차분하게 / 흥분한 톤으로 빠르게 / 감성적이고 따뜻하게"
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
                  />
                  <p style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>TTS 생성 시 톤·감정 등을 자연어로 지시합니다. 속도는 위 버튼으로 조절하세요.</p>
                  <button
                    onClick={() => {
                      setVoice({ ...voice, stylePrompt: voice.stylePrompt || "" });
                      const btn = document.activeElement as HTMLButtonElement;
                      if (btn) { btn.textContent = "✅ 적용됨!"; setTimeout(() => { btn.textContent = "적용"; }, 1500); }
                    }}
                    style={{
                      marginTop: 8, padding: "6px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                      border: "1px solid #2563eb40", background: "rgba(37,99,235,0.08)",
                      color: "#3b82f6", cursor: "pointer",
                    }}
                  >적용</button>
                </div>
                <div style={rowStyle}>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>성별</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {(["male", "female"] as const).map((g) => (
                        <button key={g} onClick={() => setVoice({ ...voice, gender: g, voiceName: "" })} style={{
                          flex: 1, padding: "8px", borderRadius: 6, cursor: "pointer", fontSize: 13,
                          border: voice.gender === g ? "1px solid #3b82f6" : "1px solid #1e293b",
                          background: voice.gender === g ? "rgba(59,130,246,0.08)" : "#0d1117",
                          color: voice.gender === g ? "#3b82f6" : "#64748b",
                        }}>
                          {g === "male" ? "👨 남성" : "👩 여성"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>보이스</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {ALL_VOICES.filter((v) => v.gender === voice.gender).map((v) => (
                        <div key={v.name} style={{
                          padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                          border: voice.voiceName === v.name ? "1px solid #3b82f6" : "1px solid #1e293b",
                          background: voice.voiceName === v.name ? "rgba(59,130,246,0.08)" : "#0d1117",
                        }}>
                          <div onClick={() => setVoice({ ...voice, voiceName: v.name })} style={{ fontSize: 13, fontWeight: 500, color: voice.voiceName === v.name ? "#3b82f6" : "#e2e8f0" }}>{v.name}</div>
                          <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>{v.desc}</div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (previewLoading) return;
                              setPreviewLoading(v.name);
                              fetch("/api/voice-preview", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ voiceName: v.name, language: "ko", stylePrompt: voice.stylePrompt || "", ttsModel: voice.ttsModel || "pro" }),
                              })
                                .then((res) => res.blob())
                                .then((blob) => {
                                  setPreviewLoading(null);
                                  setPreviewPlaying(v.name);
                                  const audio = new Audio(URL.createObjectURL(blob));
                                  audio.onended = () => setPreviewPlaying(null);
                                  audio.play();
                                })
                                .catch(() => { setPreviewLoading(null); alert("미리듣기 실패"); });
                            }}
                            style={{
                              marginTop: 4, padding: "2px 8px", fontSize: 10, borderRadius: 4,
                              border: "1px solid", borderColor: previewPlaying === v.name ? "#3b82f6" : "#334155",
                              background: previewLoading === v.name || previewPlaying === v.name ? "#1e3a5f" : "#1e293b",
                              color: previewLoading === v.name || previewPlaying === v.name ? "#60a5fa" : "#94a3b8",
                              cursor: previewLoading ? "wait" : "pointer",
                            }}
                          >
                            {previewLoading === v.name ? "⏳ 로딩..." : previewPlaying === v.name ? "🔊 재생 중" : "▶ 미리듣기"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 16, marginBottom: 16 }}>
                  <label style={labelStyle}>TTS 모델</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={(e) => {
                      setVoice({ ...voice, ttsModel: "pro" });
                      const btn = e.currentTarget;
                      const orig = btn.querySelector('div')?.textContent;
                      if (btn.querySelector('div')) btn.querySelector('div')!.textContent = "✅ Pro 적용됨";
                      setTimeout(() => { if (btn.querySelector('div')) btn.querySelector('div')!.textContent = orig || "Pro"; }, 1500);
                    }} style={{
                      flex: 1, padding: "10px", borderRadius: 8, cursor: "pointer", textAlign: "center",
                      border: (voice.ttsModel || "pro") === "pro" ? "1px solid #3b82f6" : "1px solid #1e293b",
                      background: (voice.ttsModel || "pro") === "pro" ? "rgba(59,130,246,0.08)" : "#0d1117",
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: (voice.ttsModel || "pro") === "pro" ? "#3b82f6" : "#94a3b8" }}>Pro</div>
                      <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>고품질 · 약간 비쌈</div>
                    </button>
                    <button onClick={(e) => {
                      setVoice({ ...voice, ttsModel: "flash" });
                      const btn = e.currentTarget;
                      const orig = btn.querySelector('div')?.textContent;
                      if (btn.querySelector('div')) btn.querySelector('div')!.textContent = "✅ Flash 적용됨";
                      setTimeout(() => { if (btn.querySelector('div')) btn.querySelector('div')!.textContent = orig || "Flash"; }, 1500);
                    }} style={{
                      flex: 1, padding: "10px", borderRadius: 8, cursor: "pointer", textAlign: "center",
                      border: voice.ttsModel === "flash" ? "1px solid #10b981" : "1px solid #1e293b",
                      background: voice.ttsModel === "flash" ? "rgba(16,185,129,0.08)" : "#0d1117",
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: voice.ttsModel === "flash" ? "#10b981" : "#94a3b8" }}>Flash</div>
                      <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>빠름 · 가성비</div>
                    </button>
                  </div>
                  <p style={{ fontSize: 10, color: "#475569", marginTop: 8 }}>
                    Pro: High quality (100min ≈ $0.44) / Flash: Fast generation (100min ≈ $0.12) — approx. 3.7x price difference
                  </p>
                </div>
                <div style={{ padding: "10px 14px", borderRadius: 8, background: "#0d1117", border: "1px solid #1e293b" }}>
                  <p style={{ fontSize: 11, color: "#475569", margin: 0 }}>
                    Google Gemini TTS는 속도 정밀 제어가 불가합니다. 스타일의 프롬프트 기반으로 간접 조절됩니다.
                  </p>
                </div>
              </>
            )}
            {voice.provider === "openai" && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>성별</label>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    {(["male", "female"] as const).map((g) => (
                      <button key={g} onClick={() => setVoice({ ...voice, gender: g, voiceName: "" })} style={{
                        flex: 1, padding: "8px", borderRadius: 6, cursor: "pointer", fontSize: 13,
                        border: voice.gender === g ? "1px solid #10b981" : "1px solid #1e293b",
                        background: voice.gender === g ? "rgba(16,185,129,0.08)" : "#0d1117",
                        color: voice.gender === g ? "#10b981" : "#64748b",
                      }}>
                        {g === "male" ? "👨 남성" : "👩 여성"}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    {OPENAI_VOICES.filter(v => v.gender === voice.gender).map((v) => (
                      <div key={v.id} style={{
                        padding: "12px 8px", borderRadius: 8, cursor: "pointer", textAlign: "center",
                        border: voice.voiceName === v.id ? "1px solid #10b981" : "1px solid #1e293b",
                        background: voice.voiceName === v.id ? "rgba(16,185,129,0.08)" : "#0d1117",
                      }}>
                        <div onClick={() => setVoice({ ...voice, voiceName: v.id })} style={{ fontSize: 13, fontWeight: 600, color: voice.voiceName === v.id ? "#10b981" : "#e2e8f0" }}>{v.label}</div>
                        <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{v.desc}</div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (previewLoading) return;
                            setPreviewLoading(v.id);
                            fetch("/api/voice-preview", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ voiceName: v.id, language: "ko", engine: "openai", stylePrompt: voice.stylePrompt || "", speed: voice.speed || 1.0 }),
                            })
                              .then((res) => res.blob())
                              .then((blob) => {
                                setPreviewLoading(null);
                                setPreviewPlaying(v.id);
                                const audio = new Audio(URL.createObjectURL(blob));
                                audio.onended = () => setPreviewPlaying(null);
                                audio.play();
                              })
                              .catch(() => { setPreviewLoading(null); alert("미리듣기 실패"); });
                          }}
                          style={{
                            marginTop: 4, padding: "2px 8px", fontSize: 10, borderRadius: 4,
                            border: "1px solid", borderColor: previewPlaying === v.id ? "#10b981" : "#334155",
                            background: previewLoading === v.id || previewPlaying === v.id ? "#0d2818" : "#1e293b",
                            color: previewLoading === v.id || previewPlaying === v.id ? "#10b981" : "#94a3b8",
                            cursor: previewLoading ? "wait" : "pointer",
                          }}
                        >
                          {previewLoading === v.id ? "⏳ 로딩..." : previewPlaying === v.id ? "🔊 재생 중" : "▶ 미리듣기"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>음성 스타일 지침 (선택)</label>
                  <textarea
                    value={voice.stylePrompt || ""}
                    onChange={(e) => setVoice({ ...voice, stylePrompt: e.target.value })}
                    placeholder="예: 속삭이듯 부드럽게 말해줘 / 뉴스 앵커처럼 차분하게 / 흥분한 톤으로 빠르게 / 감성적이고 따뜻하게"
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
                  />
                  <p style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>TTS 생성 시 톤·감정·속도 등을 자연어로 지시합니다.</p>
                  <button
                    onClick={() => {
                      setVoice({ ...voice, stylePrompt: voice.stylePrompt || "" });
                      const btn = document.activeElement as HTMLButtonElement;
                      if (btn) { btn.textContent = "✅ 적용됨!"; setTimeout(() => { btn.textContent = "적용"; }, 1500); }
                    }}
                    style={{
                      marginTop: 8, padding: "6px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                      border: "1px solid #2563eb40", background: "rgba(37,99,235,0.08)",
                      color: "#3b82f6", cursor: "pointer",
                    }}
                  >적용</button>
                </div>
                <div style={rowStyle}>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>속도 ({voice.speed}x)</label>
                    <input type="range" min="0.5" max="2.0" step="0.05" value={voice.speed}
                      onChange={(e) => setVoice({ ...voice, speed: parseFloat(e.target.value) })}
                      style={{ width: "100%", accentColor: "#10b981" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#475569", marginTop: 4 }}>
                      <span>0.5x 느림</span><span>1.0x 보통</span><span>2.0x 빠름</span>
                    </div>
                  </div>
                </div>
              </>
            )}
            {voice.provider === "clone" && (
              <div>
                <div style={{ background: "#1a1a2e", border: "1px solid #f59e0b30", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#f59e0b", marginBottom: 8 }}>🎙️ 보이스 클론</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
                    Fish Audio Model ID를 입력하면 이 채널에서 클론 보이스로 생성합니다.
                  </div>
                  <input type="text" value={voice.fishModelId || ""}
                    onChange={(e) => setVoice({ ...voice, fishModelId: e.target.value })}
                    placeholder="Fish Audio Model ID (예: 9bad4749...)"
                    style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12, borderColor: "#f59e0b30" }} />
                  <p style={{ fontSize: 10, color: "#475569", marginTop: 6 }}>
                    Fish Audio에서 클론 모델 생성 후 Model ID를 붙여넣으세요. Settings에서 Fish API Key가 필요합니다.
                  </p>
                </div>

                <div style={{ marginTop: 16 }}>
                  <label style={labelStyle}>속도 ({voice.speed || 1.0}x)</label>
                  <input type="range" min="0.5" max="2.0" step="0.05" value={voice.speed || 1.0}
                    onChange={(e) => setVoice({ ...voice, speed: parseFloat(e.target.value) })}
                    style={{ width: "100%", accentColor: "#f59e0b" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#475569", marginTop: 4 }}>
                    <span>0.5x 느림</span><span>1.0x 보통</span><span>2.0x 빠름</span>
                  </div>
                  <p style={{ fontSize: 10, color: "#475569", marginTop: 8 }}>성별은 모델 원본이 적용됩니다. 속도만 조절 가능.</p>
                </div>
              </div>
            )}
          </div>
        )}
        {/* ━━━ Image 탭 ━━━ */}
        {tab === "image" && (
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 20 }}>🖼️ 이미지 프리셋</h3>
            <div style={rowStyle}>
              <div style={fieldStyle}>
                <label style={labelStyle}>스타일</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {IMAGE_STYLES.map((s) => (
                    <button key={s.id} onClick={() => setImage({ ...image, style: s.id })} style={{
                      padding: "12px 10px", borderRadius: 8, cursor: "pointer", textAlign: "left",
                      border: image.style === s.id ? "1px solid #3b82f6" : "1px solid #1e293b",
                      background: image.style === s.id ? "rgba(59,130,246,0.08)" : "#0d1117",
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: image.style === s.id ? "#3b82f6" : "#e2e8f0", marginBottom: 2 }}>{s.label}</div>
                      <div style={{ fontSize: 10, color: "#64748b", lineHeight: 1.3 }}>{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={rowStyle}>
              <div style={fieldStyle}>
                <label style={labelStyle}>색상 톤</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {([{ id: "dark", label: "다크" }, { id: "light", label: "라이트" }, { id: "vibrant", label: "비비드" }, { id: "pastel", label: "파스텔" }]).map((c) => (
                    <button key={c.id} onClick={() => setImage({ ...image, colorScheme: c.id })} style={{
                      flex: 1, padding: "8px", borderRadius: 6, cursor: "pointer", fontSize: 12,
                      border: image.colorScheme === c.id ? "1px solid #3b82f6" : "1px solid #1e293b",
                      background: image.colorScheme === c.id ? "rgba(59,130,246,0.08)" : "#0d1117",
                      color: image.colorScheme === c.id ? "#3b82f6" : "#64748b",
                    }}>{c.label}</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>레퍼런스 이미지 (최대 4장)</label>
              <p style={{ fontSize: 10, color: "#475569", marginBottom: 8 }}>업로드한 이미지의 스타일을 참고하여 일관된 이미지를 생성합니다.</p>
              {image.style === "brand-face" && refImages.length === 0 && (
                <div style={{ padding: "10px 12px", marginBottom: 8, borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444" }}>
                  <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 600 }}>⚠ 브랜드 페이스 스타일은 캐릭터 참조 이미지가 필수입니다. 아래에서 이미지를 업로드하세요.</span>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 8 }}>
                {refImages.map((url, i) => (
                  <div key={i} style={{ position: "relative", aspectRatio: "9/16", borderRadius: 8, overflow: "hidden", border: "1px solid #1e293b" }}>
                    <img src={url} alt={`ref-${i}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button onClick={() => handleRemoveRefImage(url)} style={{
                      position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%",
                      background: "rgba(0,0,0,0.7)", border: "none", color: "#ef4444", fontSize: 12,
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    }}>✕</button>
                  </div>
                ))}
                {refImages.length < 4 && (
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{
                    aspectRatio: "9/16", borderRadius: 8, border: "1px dashed #1e293b", background: "transparent",
                    color: uploading ? "#374151" : "#64748b", fontSize: 12,
                    cursor: uploading ? "not-allowed" : "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                  }}>
                    <span style={{ fontSize: 20 }}>{uploading ? "⏳" : "+"}</span>
                    <span>{uploading ? "업로드 중..." : "추가"}</span>
                  </button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} style={{ display: "none" }} />
            </div>
            {/* 이미지 엔진 */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>이미지 엔진</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {([
                  { id: "flux-pro", label: "FLUX.2 Pro", desc: "$0.035 · 가성비 최강 · 4위", color: "#3b82f6" },
                  { id: "nano-banana", label: "Nano Banana", desc: "$0.039 · 빠른 생성 · 5위", color: "#10b981" },
                  { id: "flux-max", label: "FLUX.2 Max", desc: "$0.070 · 최고 퀄리티 · 3위", color: "#8b5cf6" },
                  { id: "nano-banana-pro", label: "Nano Banana Pro", desc: "$0.138 · 프리미엄 · 2위", color: "#f59e0b" },
                ] as const).map((e) => (
                  <button key={e.id} onClick={() => setImage({ ...image, engine: e.id })} style={{
                    padding: "12px 10px", borderRadius: 8, cursor: "pointer", textAlign: "left",
                    border: (image.engine || "flux-pro") === e.id ? `1px solid ${e.color}` : "1px solid #1e293b",
                    background: (image.engine || "flux-pro") === e.id ? `${e.color}15` : "#0d1117",
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: (image.engine || "flux-pro") === e.id ? e.color : "#94a3b8" }}>{e.label}</div>
                    <div style={{ fontSize: 10, color: "#64748b", marginTop: 3 }}>{e.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            {/* 비율 선택 */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>화면 비율</label>
              <div style={{ display: "flex", gap: 8 }}>
                {([
                  { id: "9:16", label: "9:16 세로", desc: "Shorts / Reels" },
                  { id: "16:9", label: "16:9 가로", desc: "일반 YouTube" },
                ] as const).map((r) => (
                  <button key={r.id} onClick={() => setImage({ ...image, aspectRatio: r.id })} style={{
                    flex: 1, padding: "12px 10px", borderRadius: 8, cursor: "pointer", textAlign: "center",
                    border: (image.aspectRatio || "9:16") === r.id ? "1px solid #f59e0b" : "1px solid #1e293b",
                    background: (image.aspectRatio || "9:16") === r.id ? "rgba(245,158,11,0.08)" : "#0d1117",
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: (image.aspectRatio || "9:16") === r.id ? "#f59e0b" : "#94a3b8" }}>{r.label}</div>
                    <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* C지침서 — 이미지 스타일 */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>
                🎨 C지침서 — Visual DNA & Scene Prompt (이미지 생성 시 참조)
              </label>
              <p style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>
                스타일 아이덴티티, 캐릭터 규칙, 비주얼 테크닉, 카메라 기법 등.
              </p>
              <textarea
                value={image.knowledge_c || ""}
                onChange={(e) => setImage({ ...image, knowledge_c: e.target.value })}
                placeholder={"예: STYLE: Stylized low-poly 3D animation...\nCHARACTER RULES: ...\nVISUAL TECHNIQUES: X-RAY, MICROSCOPIC ZOOM-IN..."}
                rows={10}
                style={{ width: "100%", background: "#0d1117", border: "1px solid #1e293b", borderRadius: 8, padding: 12, color: "#e2e8f0", fontSize: 12, resize: "vertical", lineHeight: 1.6 } as React.CSSProperties}
              />
            </div>
          </div>
        )}

        {/* ━━━ Subtitle 탭 ━━━ */}
        {tab === "subtitle" && (
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 20 }}>💬 자막 프리셋</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>폰트</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {SUBTITLE_FONTS.map((f) => (
                  <button key={f.id} onClick={() => setSubtitle({ ...subtitle, fontFamily: f.id })} style={{
                    padding: "10px 12px", borderRadius: 8, cursor: "pointer", textAlign: "left",
                    border: subtitle.fontFamily === f.id ? "1px solid #3b82f6" : "1px solid #1e293b",
                    background: subtitle.fontFamily === f.id ? "rgba(59,130,246,0.08)" : "#0d1117",
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: subtitle.fontFamily === f.id ? "#3b82f6" : "#e2e8f0" }}>{f.label}</div>
                    <div style={{ fontSize: 15, fontFamily: f.id, color: "#94a3b8", marginTop: 4 }}>가나다 ABC 123</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={rowStyle}>
              <div style={fieldStyle}>
                <label style={labelStyle}>글자 크기 ({subtitle.fontSize}px)</label>
                <input type="range" min="32" max="72" step="2" value={subtitle.fontSize}
                  onChange={(e) => setSubtitle({ ...subtitle, fontSize: parseInt(e.target.value) })}
                  style={{ width: "100%", accentColor: "#3b82f6" }} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>글자 굵기 ({subtitle.fontWeight})</label>
                <input type="range" min="400" max="900" step="100" value={subtitle.fontWeight}
                  onChange={(e) => setSubtitle({ ...subtitle, fontWeight: parseInt(e.target.value) })}
                  style={{ width: "100%", accentColor: "#3b82f6" }} />
              </div>
            </div>
            <div style={rowStyle}>
              <div style={fieldStyle}>
                <label style={labelStyle}>글자 색상</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={subtitle.textColor} onChange={(e) => setSubtitle({ ...subtitle, textColor: e.target.value })} />
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>{subtitle.textColor}</span>
                </div>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>강조 색상</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={subtitle.highlightColor} onChange={(e) => setSubtitle({ ...subtitle, highlightColor: e.target.value })} />
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>{subtitle.highlightColor}</span>
                </div>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>외곽선 색상</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={subtitle.strokeColor} onChange={(e) => setSubtitle({ ...subtitle, strokeColor: e.target.value })} />
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>{subtitle.strokeColor}</span>
                </div>
              </div>
            </div>
            <div style={rowStyle}>
              <div style={fieldStyle}>
                <label style={labelStyle}>위치</label>
                <select value={subtitle.position} onChange={(e) => setSubtitle({ ...subtitle, position: e.target.value })} style={selectStyle}>
                  <option value="bottom">하단 (67%)</option>
                  <option value="center">중앙 (50%)</option>
                  <option value="top">상단 (25%)</option>
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>애니메이션</label>
                <select value={subtitle.animation} onChange={(e) => setSubtitle({ ...subtitle, animation: e.target.value })} style={selectStyle}>
                  {ANIMATIONS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>강조 방식</label>
                <select value={subtitle.highlightStyle} onChange={(e) => setSubtitle({ ...subtitle, highlightStyle: e.target.value })} style={selectStyle}>
                  {HIGHLIGHT_STYLES.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
                </select>
              </div>
            </div>
            <div style={rowStyle}>
              <div style={fieldStyle}>
                <label style={labelStyle}>외곽선 두께 ({subtitle.strokeWidth}px)</label>
                <input type="range" min="0" max="6" step="1" value={subtitle.strokeWidth}
                  onChange={(e) => setSubtitle({ ...subtitle, strokeWidth: parseInt(e.target.value) })}
                  style={{ width: "100%", accentColor: "#3b82f6" }} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>줄당 최대 단어 ({subtitle.maxWordsPerLine})</label>
                <input type="range" min="3" max="8" step="1" value={subtitle.maxWordsPerLine}
                  onChange={(e) => setSubtitle({ ...subtitle, maxWordsPerLine: parseInt(e.target.value) })}
                  style={{ width: "100%", accentColor: "#3b82f6" }} />
              </div>
            </div>
            <div style={{
              marginTop: 20, padding: 24, background: "#000", borderRadius: 8,
              display: "flex", justifyContent: "center", alignItems: "center", minHeight: 120,
            }}>
              <div style={{ padding: subtitle.bgPadding, background: subtitle.bgColor, borderRadius: subtitle.bgBorderRadius }}>
                <span style={{
                  fontFamily: subtitle.fontFamily, fontSize: subtitle.fontSize * 0.5,
                  fontWeight: subtitle.fontWeight, color: subtitle.textColor,
                  WebkitTextStroke: `${subtitle.strokeWidth * 0.5}px ${subtitle.strokeColor}`,
                }}>
                  자막 미리보기 <span style={{
                    color: subtitle.highlightStyle === "color" ? subtitle.highlightColor : subtitle.textColor,
                    background: subtitle.highlightStyle === "background" ? subtitle.highlightColor : "transparent",
                    borderRadius: 4, padding: "0 4px",
                  }}>Preview</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ━━━ Render 탭 ━━━ */}
        {tab === "render" && (
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 20 }}>🎬 렌더링 프리셋</h3>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>퀵 레시피</label>
              <p style={{ fontSize: 10, color: "#475569", marginBottom: 8 }}>콘텐츠 유형별 원클릭 프리셋. 선택 후 개별 수정 가능합니다.</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {RENDER_RECIPES.map((r) => {
                  const isActive = render.motionIntensity === r.preset.motionIntensity && render.musicStyle === r.preset.musicStyle;
                  return (
                    <button key={r.id} onClick={() => setRender({ ...render, ...r.preset })} style={{
                      padding: "10px 16px", borderRadius: 8, cursor: "pointer", fontSize: 12,
                      border: isActive ? "1px solid #f59e0b" : "1px solid #1e293b",
                      background: isActive ? "rgba(245,158,11,0.08)" : "#0d1117",
                      color: isActive ? "#f59e0b" : "#94a3b8",
                    }}>
                      <div style={{ fontWeight: 600 }}>{r.label}</div>
                      <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{r.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={rowStyle}>
              <div style={fieldStyle}>
                <label style={labelStyle}>움직임 강도</label>
                <p style={{ fontSize: 10, color: "#374151", margin: "0 0 6px" }}>이미지 줌/패닝 속도</p>
                <div style={{ display: "flex", gap: 8 }}>
                  {MOTION_LEVELS.map((m) => (
                    <button key={m.id} onClick={() => setRender({ ...render, motionIntensity: m.id })} style={{
                      flex: 1, padding: "10px 8px", borderRadius: 6, cursor: "pointer", textAlign: "center",
                      border: render.motionIntensity === m.id ? "1px solid #3b82f6" : "1px solid #1e293b",
                      background: render.motionIntensity === m.id ? "rgba(59,130,246,0.08)" : "#0d1117",
                    }}>
                      <div style={{ fontSize: 12, color: render.motionIntensity === m.id ? "#3b82f6" : "#94a3b8", fontWeight: 600 }}>{m.label}</div>
                      <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={rowStyle}>
              <div style={fieldStyle}>
                <label style={labelStyle}>배경음악</label>
                <p style={{ fontSize: 10, color: "#374151", margin: "0 0 6px" }}>영상 배경 분위기</p>
                <div style={{ display: "flex", gap: 8 }}>
                  {MUSIC_STYLES.map((m) => (
                    <button key={m.id} onClick={() => setRender({ ...render, musicStyle: m.id })} style={{
                      flex: 1, padding: "10px 8px", borderRadius: 6, cursor: "pointer", textAlign: "center",
                      border: render.musicStyle === m.id ? "1px solid #3b82f6" : "1px solid #1e293b",
                      background: render.musicStyle === m.id ? "rgba(59,130,246,0.08)" : "#0d1117",
                    }}>
                      <div style={{ fontSize: 12, color: render.musicStyle === m.id ? "#3b82f6" : "#94a3b8", fontWeight: 600 }}>{m.label}</div>
                      <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={rowStyle}>
              <div style={fieldStyle}>
                <label style={labelStyle}>FPS</label>
                <p style={{ fontSize: 10, color: "#374151", margin: "0 0 6px" }}>30fps 권장. 60fps는 부드럽지만 용량 큼.</p>
                <div style={{ display: "flex", gap: 8 }}>
                  {([{ v: 24, desc: "필름감" }, { v: 30, desc: "표준" }, { v: 60, desc: "부드러움" }]).map((f) => (
                    <button key={f.v} onClick={() => setRender({ ...render, fps: f.v })} style={{
                      flex: 1, padding: "10px 8px", borderRadius: 6, cursor: "pointer", textAlign: "center",
                      border: render.fps === f.v ? "1px solid #3b82f6" : "1px solid #1e293b",
                      background: render.fps === f.v ? "rgba(59,130,246,0.08)" : "#0d1117",
                    }}>
                      <div style={{ fontSize: 12, color: render.fps === f.v ? "#3b82f6" : "#94a3b8", fontWeight: 600 }}>{f.v} fps</div>
                      <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>씬 전환 효과</label>
              <p style={{ fontSize: 10, color: "#374151", margin: "0 0 6px" }}>선택한 효과 중 랜덤으로 씬 전환 시 적용됩니다. 여러 개 선택 가능.</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {TRANSITIONS.map((t) => {
                  const active = render.transitions?.includes(t.id);
                  return (
                    <button key={t.id} onClick={() => {
                      setRender({
                        ...render,
                        transitions: active
                          ? render.transitions.filter((x: string) => x !== t.id)
                          : [...(render.transitions || []), t.id],
                      });
                    }} style={{
                      padding: "6px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                      background: active ? "#2563eb" : "#1e293b",
                      color: active ? "#fff" : "#64748b", border: "none",
                    }} title={t.desc}>{t.label}</button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ━━━ YouTube 탭 ━━━ */}
        {tab === "youtube" && (
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 20 }}>▶ YouTube 연결</h3>
            <div style={rowStyle}>
              <div style={fieldStyle}>
                <label style={labelStyle}>YouTube 채널 ID</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={youtubeId} onChange={(e) => { setYoutubeId(e.target.value); setYtChannel(null); setYtError(null); }}
                    placeholder="UC..." style={{ ...inputStyle, fontFamily: "monospace", flex: 1 }} />
                  <button onClick={() => verifyYouTubeChannel(youtubeId)} disabled={ytVerifying || !youtubeId.trim()}
                    style={{
                      padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                      border: "1px solid #2563eb40", background: "rgba(37,99,235,0.08)",
                      color: ytVerifying ? "#374151" : "#3b82f6",
                      cursor: ytVerifying || !youtubeId.trim() ? "not-allowed" : "pointer",
                      flexShrink: 0, whiteSpace: "nowrap",
                    }}>
                    {ytVerifying ? "검증 중..." : "연결 확인"}
                  </button>
                </div>
                <p style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>YouTube Studio → 설정 → 채널 → 고급 설정 → 채널 ID</p>
              </div>
            </div>
            <div style={rowStyle}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Refresh Token</label>
                <input value={youtubeToken} onChange={(e) => setYoutubeToken(e.target.value)}
                  type="password" placeholder=".env에 이미 있으면 비워두세요" style={inputStyle} />
                <p style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>자동 업로드에 사용됩니다. .env에 설정되어 있으면 비워두세요.</p>
              </div>
            </div>
            <div style={{
              padding: "16px", borderRadius: 10, marginTop: 8,
              background: ytChannel ? "rgba(16,185,129,0.04)" : ytError ? "rgba(239,68,68,0.04)" : "#0d1117",
              border: `1px solid ${ytChannel ? "#10b98130" : ytError ? "#ef444430" : "#1e293b"}`,
            }}>
              {ytChannel && (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <img src={ytChannel.thumbnail} alt="channel"
                    style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", border: "1px solid #1e293b" }} />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#10b981" }}>연결 확인됨</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginTop: 2 }}>{ytChannel.title}</div>
                    <div style={{ fontSize: 11, color: "#475569", marginTop: 1 }}>ID: {youtubeId}</div>
                  </div>
                </div>
              )}
              {ytError && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#ef4444" }}>연결 실패</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#94a3b8", margin: "6px 0 0" }}>{ytError}</p>
                </div>
              )}
              {!ytChannel && !ytError && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: youtubeId ? "#f59e0b" : "#475569" }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: youtubeId ? "#f59e0b" : "#475569" }}>
                      {youtubeId ? "ID 입력됨 · 연결 확인 필요" : "미설정"}
                    </span>
                  </div>
                  {youtubeId && (
                    <p style={{ fontSize: 11, color: "#475569", margin: "6px 0 0" }}>
                      "연결 확인" 버튼을 눌러 채널 정보를 검증하세요.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}