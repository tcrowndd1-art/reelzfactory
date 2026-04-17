// ============================================================
// C:\Dev\reelzfactory\apps\web\components\pipeline\UploadStep.tsx
// YouTube 업로드 — 제목/설명/태그 편집 + 공개설정 + 업로드
// ============================================================

"use client";

import { useState } from "react";
import type { GeneratedScript } from "@/types/pipeline";

type ActionStatus = "idle" | "loading" | "done" | "error";

interface UploadStepProps {
  script: GeneratedScript;
  uploadStatus: ActionStatus;
  uploadedUrl: string;
  onUpload: (privacyStatus: string) => void;
}

export function UploadStep({ script, uploadStatus, uploadedUrl, onUpload }: UploadStepProps) {
  const [privacyStatus, setPrivacyStatus] = useState("private");
  const [title, setTitle] = useState(script.metadata?.title || script.title || "");
  const [description, setDescription] = useState(script.metadata?.description || script.description || "");
  const [tags, setTags] = useState((script.metadata?.tags || script.tags || []).join(", "));

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", background: "#0d1117",
    border: "1px solid #1e293b", borderRadius: 8, color: "#fff",
    fontSize: 13, outline: "none",
  };

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 24 }}>5. Upload to YouTube</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Left: Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5}
              style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>Tags (comma separated)</label>
            <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>Privacy</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { id: "private", label: "비공개", icon: "🔒" },
                { id: "unlisted", label: "일부공개", icon: "🔗" },
                { id: "public", label: "공개", icon: "🌍" },
              ].map((p) => (
                <button key={p.id} onClick={() => setPrivacyStatus(p.id)} style={{
                  flex: 1, padding: "10px", borderRadius: 8, border: "1px solid",
                  borderColor: privacyStatus === p.id ? "#2563eb" : "#1e293b",
                  background: privacyStatus === p.id ? "rgba(37,99,235,0.1)" : "#0d1117",
                  color: privacyStatus === p.id ? "#60a5fa" : "#64748b",
                  cursor: "pointer", fontSize: 12,
                }}>{p.icon} {p.label}</button>
              ))}
            </div>
          </div>

          <button onClick={() => onUpload(privacyStatus)} disabled={uploadStatus === "loading"} style={{
            padding: "16px", borderRadius: 12, fontSize: 16, fontWeight: 700, border: "none",
            cursor: uploadStatus === "loading" ? "not-allowed" : "pointer",
            background: uploadStatus === "loading" ? "#1e293b"
              : uploadStatus === "done" ? "linear-gradient(135deg, #10b981, #059669)"
              : "linear-gradient(135deg, #dc2626, #9333ea)",
            color: "#fff", transition: "all 0.3s ease",
            marginTop: 8,
          }}>
            {uploadStatus === "loading" ? "📤 업로드 중..."
              : uploadStatus === "done" ? "✅ 업로드 완료!"
              : uploadStatus === "error" ? "⚠️ 실패 — 재시도"
              : "📤 YouTube 업로드"}
          </button>

          {uploadedUrl && (
            <div style={{ padding: "12px 16px", background: "#0f172a", borderRadius: 8, border: "1px solid #1e293b", textAlign: "center" }}>
              <a href={uploadedUrl} target="_blank" rel="noopener noreferrer" style={{
                color: "#60a5fa", fontSize: 13, textDecoration: "underline",
              }}>{uploadedUrl}</a>
            </div>
          )}
        </div>

        {/* Right: Preview */}
        <div style={{
          background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 24,
          display: "flex", flexDirection: "column", gap: 16,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8", margin: 0 }}>Preview</h3>

          <div style={{ background: "#1e293b", borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 8 }}>{title || "Untitled"}</div>
            <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {description?.substring(0, 300) || "No description"}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>Tags</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {tags.split(",").map((t, i) => t.trim()).filter(Boolean).map((t, i) => (
                <span key={i} style={{
                  padding: "2px 8px", background: "#1e293b", borderRadius: 12,
                  fontSize: 11, color: "#94a3b8",
                }}>{t}</span>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 12, color: "#64748b" }}>
            Scenes: {script.scenes.length} · Mode: {script.metadata?.hashtags ? "Shorts" : "Standard"}
          </div>
        </div>
      </div>
    </div>
  );
}
