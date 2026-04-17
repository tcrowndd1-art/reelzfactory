// ============================================================
// C:\Dev\reelzfactory\apps\web\components\pipeline\VoiceSettingsModal.tsx
// 보이스 설정 모달 — 엔진별 완전 분리 UI
// ============================================================

"use client";

import { useState } from "react";
import { VOICE_STYLES, ALL_VOICES } from "@/constants/voiceConfig";
import type { VoiceOption } from "@/types/pipeline";

/* ── OpenAI 보이스 성별 매핑 ── */
const OPENAI_VOICES: { id: string; label: string; desc: string; gender: "male" | "female" }[] = [
  { id: "alloy", label: "Alloy", desc: "중성적·균형", gender: "female" },
  { id: "echo", label: "Echo", desc: "남성·깊은 톤", gender: "male" },
  { id: "fable", label: "Fable", desc: "영국풍·내레이션", gender: "male" },
  { id: "nova", label: "Nova", desc: "여성·따뜻한", gender: "female" },
  { id: "onyx", label: "Onyx", desc: "남성·중후한", gender: "male" },
  { id: "shimmer", label: "Shimmer", desc: "여성·밝은", gender: "female" },
];

interface VoiceSettingsModalProps {
  showVoiceModal: boolean;
  setShowVoiceModal: (show: boolean) => void;
  voiceStyle: string;
  setVoiceStyle: (style: string) => void;
  voiceGender: string;
  setVoiceGender: (gender: string) => void;
  voiceSpeed: number;
  setVoiceSpeed: (speed: number) => void;
  selectedVoiceName: string;
  setSelectedVoiceName: (name: string) => void;
  voiceTab: "style" | "category" | "all";
  setVoiceTab: (tab: "style" | "category" | "all") => void;
  activeVoiceName: string;
  categoryVoices: { male: VoiceOption[]; female: VoiceOption[] };
  categoryLabel: string;
  voiceEngine: "google" | "openai" | "clone";
  setVoiceEngine: (engine: "google" | "openai" | "clone") => void;
  onGenerate: () => void;
}

export function VoiceSettingsModal({
  showVoiceModal, setShowVoiceModal,
  voiceStyle, setVoiceStyle,
  voiceGender, setVoiceGender,
  voiceSpeed, setVoiceSpeed,
  selectedVoiceName, setSelectedVoiceName,
  voiceTab, setVoiceTab,
  activeVoiceName, categoryVoices, categoryLabel,
  voiceEngine, setVoiceEngine,
  onGenerate,
}: VoiceSettingsModalProps) {
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState<string | null>(null);

  if (!showVoiceModal) return null;

  const filteredOpenAIVoices = OPENAI_VOICES.filter((v) => v.gender === voiceGender);


  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999,
    }} onClick={() => setShowVoiceModal(false)}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#111827", border: "1px solid #1e293b", borderRadius: 16,
        width: "90%", maxWidth: 680, maxHeight: "85vh", overflow: "auto",
        padding: 0, boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
      }}>

        {/* ━━━ Header ━━━ */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "20px 24px", borderBottom: "1px solid #1e293b",
          position: "sticky", top: 0, background: "#111827", zIndex: 1,
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: 0 }}>Voice Settings</h2>
            <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0" }}>
              Engine: <span style={{ color: voiceEngine === "google" ? "#3b82f6" : voiceEngine === "openai" ? "#10b981" : "#f59e0b" }}>
                {voiceEngine === "google" ? "Google" : voiceEngine === "openai" ? "OpenAI" : "Clone"}
              </span>
              {voiceEngine !== "clone" && (
                <> · <span style={{ color: "#f59e0b" }}>
                  {voiceEngine === "openai" ? (selectedVoiceName || "—") : (activeVoiceName || selectedVoiceName || "—")}
                </span></>
              )}
            </p>
          </div>
          <button onClick={() => setShowVoiceModal(false)} style={{
            background: "none", border: "none", color: "#64748b", fontSize: 20, cursor: "pointer", padding: "4px 8px",
          }}>✕</button>
        </div>

        {/* ━━━ Google 전용: 탭 네비게이션 ━━━ */}
        {voiceEngine === "google" && (
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #1e293b" }}>
            {([
              { key: "style" as const, label: "Voice Style" },
              { key: "all" as const, label: "All Voices" },
            ]).map((tab) => (
              <button key={tab.key} onClick={() => setVoiceTab(tab.key)} style={{
                flex: 1, padding: "12px", border: "none", cursor: "pointer",
                background: voiceTab === tab.key ? "rgba(59,130,246,0.1)" : "transparent",
                color: voiceTab === tab.key ? "#3b82f6" : "#64748b",
                fontWeight: voiceTab === tab.key ? 600 : 400, fontSize: 13,
                borderBottom: voiceTab === tab.key ? "2px solid #3b82f6" : "2px solid transparent",
              }}>{tab.label}</button>
            ))}
          </div>
        )}

        <div style={{ padding: 24 }}>

          {/* ━━━ Engine Selection ━━━ */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {([
              { id: "google" as const, label: "Google", color: "#3b82f6", desc: "Gemini TTS" },
              { id: "openai" as const, label: "OpenAI", color: "#10b981", desc: "Speed 정밀제어" },
              { id: "clone" as const, label: "Clone", color: "#f59e0b", desc: "내 목소리" },
            ]).map((e) => (
              <button key={e.id} onClick={() => {
                setVoiceEngine(e.id);
                setSelectedVoiceName("");
                if (e.id === "google") setVoiceTab("style");
              }} style={{
                flex: 1, padding: "12px 10px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: voiceEngine === e.id ? `2px solid ${e.color}` : "1px solid #1e293b",
                background: voiceEngine === e.id ? `${e.color}15` : "#0d1117",
                color: voiceEngine === e.id ? e.color : "#64748b",
                cursor: "pointer", textAlign: "center",
              }}>
                <div>{e.label}</div>
                <div style={{ fontSize: 10, fontWeight: 400, marginTop: 2, opacity: 0.7 }}>{e.desc}</div>
              </button>
            ))}
          </div>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* ═════ GOOGLE ENGINE ═════ */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {voiceEngine === "google" && (
            <>
              {/* TAB 1: Voice Style */}
              {voiceTab === "style" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                  {VOICE_STYLES.map((vs) => (
                    <button key={vs.id} onClick={() => { setVoiceStyle(vs.id); setSelectedVoiceName(""); setVoiceSpeed(vs.speed); }} style={{
                      padding: "16px", borderRadius: 12, border: "1px solid",
                      borderColor: voiceStyle === vs.id ? "#3b82f6" : "#1e293b",
                      background: voiceStyle === vs.id ? "rgba(59,130,246,0.08)" : "#0d1117",
                      cursor: "pointer", textAlign: "left", width: "100%",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: voiceStyle === vs.id ? "#3b82f6" : "#e2e8f0", marginBottom: 4 }}>
                            {voiceStyle === vs.id ? "● " : "○ "}{vs.label}
                          </div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>{vs.desc}</div>
                        </div>
                        <div style={{ textAlign: "right", fontSize: 11, color: "#475569" }}>
                          <div>M: {vs.maleVoice}</div>
                          <div>F: {vs.femaleVoice}</div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (previewLoading) return;
                              const vName = voiceGender === "male" ? vs.maleVoice : vs.femaleVoice;
                              setPreviewLoading(vName);
                              fetch("/api/voice-preview", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ voiceName: vName, language: "ko", speed: vs.speed }),
                              })
                                .then((res) => res.blob())
                                .then((blob) => {
                                  setPreviewLoading(null);
                                  setPreviewPlaying(vName);
                                  const audio = new Audio(URL.createObjectURL(blob));
                                  audio.onended = () => setPreviewPlaying(null);
                                  audio.play();
                                })
                                .catch(() => { setPreviewLoading(null); alert("미리듣기 실패"); });
                            }}
                            style={{
                              marginTop: 4, padding: "2px 8px", fontSize: 10, borderRadius: 4,
                              border: "1px solid #334155", background: "#1e293b", color: "#94a3b8", cursor: "pointer",
                            }}
                          >
                            {previewLoading === (voiceGender === "male" ? vs.maleVoice : vs.femaleVoice) ? "⏳ 로딩..." : previewPlaying === (voiceGender === "male" ? vs.maleVoice : vs.femaleVoice) ? "🔊 재생 중" : "▶ 미리듣기"}
                          </button>
                        </div>
                      </div>
                    </button>
                  ))}
                  {/* 말하기 속도 프리셋 (Voice Style 탭) */}
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>말하기 속도 (Gemini)</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {([
                        { id: "slow", label: "느리게", speed: 0.75 },
                        { id: "normal", label: "보통", speed: 1.0 },
                        { id: "fast", label: "빠르게", speed: 1.25 },
                        { id: "faster", label: "더 빠르게", speed: 1.5 },
                        { id: "fastest", label: "아주 빠르게", speed: 1.75 },
                      ]).map((s) => (
                        <button key={s.id} onClick={() => setVoiceSpeed(s.speed)} style={{
                          flex: 1, padding: "6px 4px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600,
                          border: Math.abs(voiceSpeed - s.speed) < 0.13 ? "1px solid #3b82f6" : "1px solid #1e293b",
                          background: "#0d1117",
                          color: Math.abs(voiceSpeed - s.speed) < 0.13 ? "#3b82f6" : "#64748b",
                        }}>{s.label}</button>
                      ))}
                    </div>
                    <p style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>쇼츠 콘텐츠는 '빠르게' 이상 추천. 프롬프트 기반 제어라 근사치입니다.</p>
                  </div>
                </div>
              )}

              {/* TAB 2: All Voices */}
              {voiceTab === "all" && (
                <div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    {(["male", "female"] as const).map((g) => (
                      <button key={g} onClick={() => setVoiceGender(g)} style={{
                        padding: "6px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                        border: voiceGender === g ? "1px solid #3b82f6" : "1px solid #1e293b",
                        background: voiceGender === g ? "rgba(59,130,246,0.1)" : "#0d1117",
                        color: voiceGender === g ? "#3b82f6" : "#64748b",
                        cursor: "pointer",
                      }}>{g === "male" ? "👨 Male" : "👩 Female"}</button>
                    ))}
                  </div>
                  <div style={{ marginBottom: 12, marginTop: 4 }}>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>말하기 속도 (Gemini)</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {([
                        { id: "slow", label: "느리게", speed: 0.75 },
                        { id: "normal", label: "보통", speed: 1.0 },
                        { id: "fast", label: "빠르게", speed: 1.25 },
                        { id: "faster", label: "더 빠르게", speed: 1.5 },
                        { id: "fastest", label: "아주 빠르게", speed: 1.75 },
                      ]).map((s) => (
                        <button key={s.id} onClick={() => setVoiceSpeed(s.speed)} style={{
                          flex: 1, padding: "6px 4px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600,
                          border: Math.abs(voiceSpeed - s.speed) < 0.13 ? "1px solid #3b82f6" : "1px solid #1e293b",
                          background: "#0d1117",
                          color: Math.abs(voiceSpeed - s.speed) < 0.13 ? "#3b82f6" : "#64748b",
                        }}>{s.label}</button>
                      ))}
                    </div>
                    <p style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>쇼츠 콘텐츠는 '빠르게' 이상 추천. 프롬프트 기반 제어라 근사치입니다.</p>
                  </div>
                  <p style={{ fontSize: 11, color: "#475569", marginBottom: 10 }}>
                    Gemini TTS 전체 — {voiceGender === "male" ? "남성" : "여성"} {ALL_VOICES.filter(v => v.gender === voiceGender).length}개
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {ALL_VOICES.filter((v) => v.gender === voiceGender).map((v) => (
                      <button key={v.name} onClick={() => { setSelectedVoiceName(v.name); }} style={{
                        padding: "10px", borderRadius: 8, border: "1px solid",
                        borderColor: selectedVoiceName === v.name ? "#3b82f6" : "#1e293b",
                        background: selectedVoiceName === v.name ? "rgba(59,130,246,0.08)" : "#0d1117",
                        cursor: "pointer", textAlign: "center",
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: selectedVoiceName === v.name ? "#3b82f6" : "#e2e8f0" }}>{v.name}</div>
                        <div style={{ fontSize: 10, color: "#475569" }}>{v.desc}</div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (previewLoading) return;
                            setPreviewLoading(v.name);
                            fetch("/api/voice-preview", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ voiceName: v.name, language: "ko", speed: voiceSpeed }),
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
                            marginTop: 4, padding: "3px 10px", fontSize: 10,
                            borderRadius: 4, border: "1px solid",
                            borderColor: previewPlaying === v.name ? "#3b82f6" : "#334155",
                            background: previewLoading === v.name ? "#1e3a5f" : previewPlaying === v.name ? "#1e3a5f" : "#1e293b",
                            color: previewLoading === v.name ? "#60a5fa" : previewPlaying === v.name ? "#60a5fa" : "#94a3b8",
                            cursor: previewLoading ? "wait" : "pointer",
                          }}
                        >
                          {previewLoading === v.name ? "⏳ 로딩..." : previewPlaying === v.name ? "🔊 재생 중" : "▶ 미리듣기"}
                        </button>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* ═════ OPENAI ENGINE ═════ */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {voiceEngine === "openai" && (
            <div>
              {/* 성별 필터 */}
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {(["male", "female"] as const).map((g) => (
                  <button key={g} onClick={() => { setVoiceGender(g); setSelectedVoiceName(""); }} style={{
                    padding: "6px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                    border: voiceGender === g ? "1px solid #10b981" : "1px solid #1e293b",
                    background: voiceGender === g ? "rgba(16,185,129,0.1)" : "#0d1117",
                    color: voiceGender === g ? "#10b981" : "#64748b",
                    cursor: "pointer",
                  }}>{g === "male" ? "👨 Male" : "👩 Female"}</button>
                ))}
              </div>
              <p style={{ fontSize: 11, color: "#475569", marginBottom: 10 }}>
                OpenAI TTS — 총 6개 보이스 (남3/여3). {voiceGender === "male" ? "👨 남성" : "👩 여성"} {filteredOpenAIVoices.length}개 표시 중
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {filteredOpenAIVoices.map((v) => (
                  <button key={v.id} onClick={() => setSelectedVoiceName(v.id)} style={{
                    padding: "14px 10px", borderRadius: 8, border: "1px solid",
                    borderColor: selectedVoiceName === v.id ? "#10b981" : "#1e293b",
                    background: selectedVoiceName === v.id ? "rgba(16,185,129,0.08)" : "#0d1117",
                    cursor: "pointer", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 13, marginBottom: 2 }}>{v.gender === "male" ? "👨" : "👩"}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: selectedVoiceName === v.id ? "#10b981" : "#e2e8f0" }}>
                      {v.label}
                    </div>
                    <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>{v.desc}</div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (previewLoading) return;
                        setPreviewLoading(v.id);
                        fetch("/api/voice-preview", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ voiceName: v.id, language: "ko", engine: "openai", speed: voiceSpeed }),
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
                        border: "1px solid #334155", background: "#1e293b", color: "#94a3b8", cursor: "pointer",
                      }}
                    >
                      {previewLoading === v.id ? "⏳ 로딩..." : previewPlaying === v.id ? "🔊 재생 중" : "▶ 미리듣기"}
                    </button>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* ═════ CLONE ENGINE ═════ */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {voiceEngine === "clone" && (
            <div>
              <div style={{ background: "#1a1a2e", border: "1px solid #f59e0b30", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#f59e0b", marginBottom: 8 }}>🎙️ Voice Clone</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
                  내 목소리 모델로 생성 — 씬별 감정 태그 자동 주입
                </div>
                <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.6 }}>
                  Model ID: <span style={{ color: "#e2e8f0", fontFamily: "monospace" }}>
                    {process.env.NEXT_PUBLIC_FISH_VOICE_ID
                      ? `${process.env.NEXT_PUBLIC_FISH_VOICE_ID.slice(0, 8)}...`
                      : "미설정 — Settings에서 Fish API Key 등록 필요"}
                  </span>
                </div>
                <button
                  onClick={() => {
                    const _s = JSON.parse(localStorage.getItem("reelzfactory_settings") || "{}");
                    const fishKey = _s.apiKeys?.fishaudio || "";
                    const fishModel = _s.apiKeys?.fishModelId || "";
                    if (!fishKey || !fishModel) { alert("Settings에서 Fish API Key와 Model ID를 등록하세요"); return; }
                    setPreviewLoading("clone");
                    fetch("/api/voice-preview", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ voiceName: "clone", engine: "clone", language: "ko", fishApiKey: fishKey, fishModelId: fishModel, speed: voiceSpeed }),
                    })
                      .then(res => res.blob())
                      .then(blob => {
                        setPreviewLoading(null);
                        setPreviewPlaying("clone");
                        const audio = new Audio(URL.createObjectURL(blob));
                        audio.onended = () => setPreviewPlaying(null);
                        audio.play();
                      })
                      .catch(() => { setPreviewLoading(null); alert("Clone 미리듣기 실패"); });
                  }}
                  style={{ marginTop: 12, padding: "8px 16px", fontSize: 12, borderRadius: 6, border: "1px solid #f59e0b", background: "#1a1a2e", color: "#f59e0b", cursor: "pointer" }}
                >
                  {previewLoading === "clone" ? "⏳ 로딩..." : previewPlaying === "clone" ? "🔊 재생 중" : "▶ 내 목소리 미리듣기"}
                </button>
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                  Speed: <span style={{ color: "#f59e0b", fontWeight: 600 }}>{voiceSpeed.toFixed(2)}x</span>
                </label>
                <input
                  type="range" min={0.5} max={2.0} step={0.05} value={voiceSpeed}
                  onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "#f59e0b" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#475569" }}>
                  <span>0.5x 느림</span><span>1.0x 보통</span><span>2.0x 빠름</span>
                </div>
                <p style={{ fontSize: 10, color: "#475569", marginTop: 6 }}>성별은 모델 원본이 적용됩니다.</p>
              </div>
            </div>
          )}

          {/* ━━━ Gender — Google Style 탭 전용 ━━━ */}
          {voiceEngine === "google" && voiceTab === "style" && (
            <div style={{ borderTop: "1px solid #1e293b", paddingTop: 20, marginTop: 20 }}>
              <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 8 }}>Gender</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[{ id: "male", label: "Male", icon: "👨" }, { id: "female", label: "Female", icon: "👩" }].map((g) => (
                  <button key={g.id} onClick={() => setVoiceGender(g.id)} style={{
                    flex: 1, padding: "10px", borderRadius: 8, border: "1px solid",
                    borderColor: voiceGender === g.id ? "#3b82f6" : "#1e293b",
                    background: voiceGender === g.id ? "rgba(59,130,246,0.1)" : "#0d1117",
                    cursor: "pointer", fontSize: 13, color: voiceGender === g.id ? "#3b82f6" : "#94a3b8",
                  }}>{g.icon} {g.label}</button>
                ))}
              </div>
            </div>
          )}

          {/* ━━━ Speed — OpenAI 전용 ━━━ */}
          {voiceEngine === "openai" && (
            <div style={{ borderTop: "1px solid #1e293b", paddingTop: 20, marginTop: 20 }}>
              <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                Speed: <span style={{ color: "#10b981", fontWeight: 600 }}>{voiceSpeed.toFixed(2)}x</span>
              </label>
              <input
                type="range" min={0.5} max={2.0} step={0.05} value={voiceSpeed}
                onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "#10b981" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#334155" }}>
                <span>0.5x 느림</span><span style={{ color: "#475569" }}>1.0x 보통</span><span>2.0x 빠름</span>
              </div>
            </div>
          )}
        </div>

        {/* ━━━ Footer ━━━ */}
        <div style={{
          display: "flex", gap: 12, padding: "16px 24px",
          borderTop: "1px solid #1e293b", background: "#111827",
          position: "sticky", bottom: 0,
        }}>
          <button onClick={() => setShowVoiceModal(false)} style={{
            flex: 1, padding: "12px", borderRadius: 10, border: "1px solid #1e293b",
            background: "transparent", color: "#64748b", cursor: "pointer", fontSize: 14,
          }}>Cancel</button>
          <button onClick={onGenerate} style={{
            flex: 2, padding: "12px", borderRadius: 10, border: "none",
            background: voiceEngine === "google"
              ? "linear-gradient(135deg, #3b82f6, #2563eb)"
              : voiceEngine === "openai"
                ? "linear-gradient(135deg, #10b981, #059669)"
                : "linear-gradient(135deg, #f59e0b, #d97706)",
            color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 14,
          }}>
            🎤 Generate
            {voiceEngine !== "clone" && ` · ${voiceEngine === "openai" ? (selectedVoiceName || "보이스 선택") : (selectedVoiceName || activeVoiceName || "보이스 선택")}`}
            {voiceEngine === "openai" && ` · ${voiceSpeed.toFixed(2)}x`}
          </button>
        </div>
      </div>
    </div>
  );
}
