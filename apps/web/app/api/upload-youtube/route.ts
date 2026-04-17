import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";

function getOAuth2Client() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("YouTube OAuth credentials not found in .env");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      projectId,
      title,
      description,
      tags = [],
      categoryId = "22", // People & Blogs
      privacyStatus = "private", // private로 먼저 업로드 (안전)
      madeForKids = false,
      shorts = true,
    } = body;

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    // MP4 파일 확인
    const videoPath = path.join(process.cwd(), "public", "output", `${projectId}.mp4`);
    if (!fs.existsSync(videoPath)) {
      return NextResponse.json(
        { error: "Video file not found. Render first.", path: videoPath },
        { status: 404 }
      );
    }

    const fileSize = fs.statSync(videoPath).size;
    console.log(`[YouTube] Uploading: ${videoPath} (${(fileSize / 1024 / 1024).toFixed(1)}MB)`);

    // OAuth2 클라이언트
    const auth = getOAuth2Client();
    const youtube = google.youtube({ version: "v3", auth });

    // Shorts는 제목에 #Shorts 추가
    const finalTitle = shorts && !title.includes("#Shorts")
      ? `${title} #Shorts`
      : title;

    // 업로드
    console.log(`[YouTube] Title: ${finalTitle}`);
    console.log(`[YouTube] Privacy: ${privacyStatus}`);
    console.log(`[YouTube] Tags: ${tags.join(", ")}`);

    const res = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: finalTitle.substring(0, 100), // YouTube 제목 100자 제한
          description: description || "",
          tags: tags.slice(0, 30), // 최대 30개 태그
          categoryId,
          defaultLanguage: "ko",
        },
        status: {
          privacyStatus, // "private" | "unlisted" | "public"
          selfDeclaredMadeForKids: madeForKids,
        },
      },
      media: {
        body: fs.createReadStream(videoPath),
      },
    });

    const videoId = res.data.id;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    console.log(`[YouTube] Upload success! ${videoUrl}`);

    return NextResponse.json({
      success: true,
      videoId,
      videoUrl,
      title: finalTitle,
      privacyStatus,
    });
  } catch (err: any) {
    console.error("[YouTube] Upload error:", err.message);

    // OAuth 토큰 만료 에러 처리
    if (err.message?.includes("invalid_grant") || err.message?.includes("Token has been expired")) {
      return NextResponse.json(
        { error: "YouTube refresh token expired. Re-authenticate in Google Cloud Console." },
        { status: 401 }
      );
    }

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
