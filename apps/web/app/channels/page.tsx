"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getChannels, saveChannel, deleteChannel, ChannelProfile } from "@/lib/store";
import { DEFAULT_SUBTITLE_PRESET, DEFAULT_IMAGE_PRESET, DEFAULT_VOICE_PRESET, DEFAULT_RENDER_PRESET } from "@/constants/presets";

const NICHE_OPTIONS = [
  { value: "health", label: "🏥 Health", color: "#10b981" },
  { value: "finance", label: "💰 Finance", color: "#f59e0b" },
  { value: "tech", label: "🤖 Tech", color: "#3b82f6" },
  { value: "psychology", label: "🧠 Psychology", color: "#a855f7" },
  { value: "lifestyle", label: "🌿 Lifestyle", color: "#ec4899" },
  { value: "education", label: "📚 Education", color: "#06b6d4" },
  { value: "food", label: "🍳 Food", color: "#ef4444" },
  { value: "beauty", label: "💄 Beauty", color: "#f472b6" },
  { value: "travel", label: "✈️ Travel", color: "#14b8a6" },
  { value: "gaming", label: "🎮 Gaming", color: "#8b5cf6" },
  { value: "other", label: "📦 Other", color: "#64748b" },
];

const LANG_OPTIONS = [
  { value: "ko", label: "🇰🇷 한국어" },
  { value: "en", label: "🇺🇸 English" },
  { value: "ja", label: "🇯🇵 日本語" },
  { value: "pt", label: "🇧🇷 Português" },
  { value: "es", label: "🇪🇸 Español" },
];

export default function ChannelsPage() {
  const router = useRouter();
  const [channels, setChannels] = useState<ChannelProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNiche, setNewNiche] = useState("health");
  const [newLang, setNewLang] = useState("ko");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    getChannels().then((c) => { setChannels(c); setLoading(false); });
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const channel = await saveChannel({
      name: newName.trim(),
      niche: newNiche,
      language: newLang,
      platform: "youtube",
      category: newNiche,
      voice_preset: DEFAULT_VOICE_PRESET,
      image_preset: DEFAULT_IMAGE_PRESET,
      subtitle_preset: DEFAULT_SUBTITLE_PRESET,
      render_preset: DEFAULT_RENDER_PRESET,
    });
    if (channel) {
      setChannels((prev) => [channel, ...prev]);
      setNewName("");
      setShowCreate(false);
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 채널을 삭제하시겠습니까?")) return;
    const ok = await deleteChannel(id);
    if (ok) setChannels((prev) => prev.filter((c) => c.id !== id));
  };

  const getNiche = (niche: string) => NICHE_OPTIONS.find((n) => n.value === niche) || NICHE_OPTIONS[10];
  const getLang = (lang: string) => LANG_OPTIONS.find((l) => l.value === lang) || LANG_OPTIONS[0];

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", color: "#64748b" }}>
      Loading channels...
    </div>
  );

  return (
    <div style={{ padding: 32, maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: 0 }}>📺 Channels</h1>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>채널별 보이스, 이미지, 자막, 렌더링 프리셋 관리</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            padding: "10px 20px", background: showCreate ? "#374151" : "#2563eb",
            color: "#fff", border: "none", borderRadius: 8, cursor: "pointer",
            fontSize: 14, fontWeight: 600,
          }}
        >
          {showCreate ? "취소" : "+ 새 채널"}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div style={{
          background: "#111827", border: "1px solid #1e293b", borderRadius: 12,
          padding: 24, marginBottom: 24, display: "flex", flexDirection: "column", gap: 16,
        }}>
          <div style={{ display: "flex", gap: 12 }}>
            <input
              value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder="채널 이름 (예: 건강의 비밀)"
              style={{
                flex: 1, padding: "10px 14px", background: "#0a0a0a", border: "1px solid #1e293b",
                borderRadius: 8, color: "#fff", fontSize: 14, outline: "none",
              }}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <select
              value={newNiche} onChange={(e) => setNewNiche(e.target.value)}
              style={{
                padding: "10px 14px", background: "#0a0a0a", border: "1px solid #1e293b",
                borderRadius: 8, color: "#fff", fontSize: 14,
              }}
            >
              {NICHE_OPTIONS.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
            </select>
            <select
              value={newLang} onChange={(e) => setNewLang(e.target.value)}
              style={{
                padding: "10px 14px", background: "#0a0a0a", border: "1px solid #1e293b",
                borderRadius: 8, color: "#fff", fontSize: 14,
              }}
            >
              {LANG_OPTIONS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <button
            onClick={handleCreate} disabled={creating || !newName.trim()}
            style={{
              padding: "10px 20px", background: creating ? "#374151" : "#10b981",
              color: "#fff", border: "none", borderRadius: 8, cursor: "pointer",
              fontSize: 14, fontWeight: 600, alignSelf: "flex-end", opacity: !newName.trim() ? 0.5 : 1,
            }}
          >
            {creating ? "생성 중..." : "✓ 채널 생성"}
          </button>
        </div>
      )}

      {/* Channel List */}
      {channels.length === 0 ? (
        <div style={{
          textAlign: "center", padding: 60, color: "#64748b",
          background: "#111827", borderRadius: 12, border: "1px solid #1e293b",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📺</div>
          <p style={{ fontSize: 16, marginBottom: 8 }}>채널이 없습니다</p>
          <p style={{ fontSize: 13 }}>위의 &quot;+ 새 채널&quot; 버튼으로 첫 채널을 만들어보세요</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {channels.map((ch) => {
            const niche = getNiche(ch.niche || "");
            const lang = getLang(ch.language || "ko");
            return (
              <div
                key={ch.id}
                style={{
                  background: "#111827", border: "1px solid #1e293b", borderRadius: 12,
                  padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center",
                  cursor: "pointer", transition: "border-color 0.2s",
                }}
                onClick={() => router.push(`/channels/${ch.id}`)}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1e293b")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: `${niche.color}20`, display: "flex",
                    alignItems: "center", justifyContent: "center", fontSize: 24,
                  }}>
                    {niche.label.split(" ")[0]}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: "#fff", margin: 0 }}>{ch.name}</h3>
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 12,
                        background: `${niche.color}20`, color: niche.color,
                      }}>
                        {niche.label}
                      </span>
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 12,
                        background: "#1e293b", color: "#94a3b8",
                      }}>
                        {lang.label}
                      </span>
                      {ch.youtube_channel_id && (
                        <span style={{
                          fontSize: 11, padding: "2px 8px", borderRadius: 12,
                          background: "#dc262620", color: "#ef4444",
                        }}>
                          ▶ YouTube 연결됨
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(ch.id!); }}
                    style={{
                      padding: "6px 12px", background: "transparent", border: "1px solid #374151",
                      borderRadius: 6, color: "#64748b", cursor: "pointer", fontSize: 12,
                    }}
                  >
                    삭제
                  </button>
                  <span style={{ color: "#374151", fontSize: 20 }}>→</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
