// ============================================================
// C:\Dev\reelzfactory\apps\web\hooks\pipeline\useYoutubeUpload.ts
// YouTube 업로드 + 토큰 만료 감지
// ============================================================

import { useState, useCallback } from "react";
import type { Project, GeneratedScript } from "@/types/pipeline";

type ActionStatus = "idle" | "loading" | "done" | "error";

interface UseYoutubeUploadReturn {
  uploadStatus: ActionStatus;
  uploadedUrl: string;
  uploadToYoutube: (privacyStatus?: string) => Promise<void>;
}

interface UseYoutubeUploadParams {
  project: Project | null;
  script: GeneratedScript | null;
}

export function useYoutubeUpload({
  project,
  script,
}: UseYoutubeUploadParams): UseYoutubeUploadReturn {
  const [uploadStatus, setUploadStatus] = useState<ActionStatus>("idle");
  const [uploadedUrl, setUploadedUrl] = useState("");

  const uploadToYoutube = useCallback(async (privacyStatus: string = "private") => {
    if (!project || !script) return;

    setUploadStatus("loading");

    try {
      const res = await fetch("/api/upload-youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          title: script.metadata?.title || script.title || "Untitled",
          description: script.metadata?.description || script.description || "",
          tags: script.metadata?.tags || script.tags || [],
          privacyStatus,
          shorts: project.mode === "shorts",
        }),
      });

      const data = await res.json();

      if (data.success) {
        setUploadStatus("done");
        setUploadedUrl(data.videoUrl);
        window.open(data.videoUrl, "_blank");
      } else {
        setUploadStatus("error");

        // 토큰 만료 감지
        if (data.error?.includes("invalid_grant") || data.error?.includes("Token has been expired")) {
          alert("YouTube 토큰 만료. Google Cloud Console에서 Refresh Token 재발급 필요.");
        } else {
          alert("업로드 실패: " + (data.error || "Unknown error"));
        }
      }
    } catch (e: any) {
      setUploadStatus("error");
      alert("업로드 오류: " + e.message);
    }
  }, [project, script]);

  return {
    uploadStatus,
    uploadedUrl,
    uploadToYoutube,
  };
}