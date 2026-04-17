import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  
  if (!code) {
    return NextResponse.json({ error: "No code received" }, { status: 400 });
  }

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: process.env.YOUTUBE_CLIENT_ID,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET,
        redirect_uri: "http://localhost:3000/api/auth/youtube/callback",
        grant_type: "authorization_code",
      }),
    });

    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ error: data.error, detail: data.error_description }, { status: 400 });
    }

    return new NextResponse(`
      <html>
        <body style="background:#0a0a0a;color:#fff;font-family:monospace;padding:40px;">
          <h1>YouTube OAuth Success!</h1>
          <h2>Refresh Token:</h2>
          <textarea style="width:100%;height:100px;background:#1e293b;color:#10b981;border:1px solid #334155;padding:12px;font-size:14px;" readonly>${data.refresh_token || "No refresh token (already issued)"}</textarea>
          <p style="color:#94a3b8;margin-top:16px;">이 토큰을 .env 파일의 YOUTUBE_REFRESH_TOKEN에 넣으세요.</p>
          <p style="color:#64748b;">Access Token: ${data.access_token?.substring(0, 20)}...</p>
        </body>
      </html>
    `, { headers: { "Content-Type": "text/html" } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
