import { NextRequest, NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";

// Shorts URL → Video URL 변환 + videoId 추출
function extractVideoId(url: string): string {
  let videoId = "";

  // youtube.com/shorts/ABC
  const shortsMatch = url.match(/shorts\/([a-zA-Z0-9_-]+)/);
  if (shortsMatch) return shortsMatch[1];

  // youtube.com/watch?v=ABC
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (watchMatch) return watchMatch[1];

  // youtu.be/ABC
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) return shortMatch[1];

  return videoId;
}

// YouTube 자막 추출
async function getTranscript(videoId: string): Promise<string> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    return transcript.map((t) => t.text).join(" ");
  } catch (err: any) {
    console.log(`[Benchmark] Transcript fetch failed: ${err.message}`);
    return "";
  }
}

// Gemini로 영상 구조 분석
async function analyzeWithGemini(
  transcript: string,
  videoUrl: string,
  geminiKey: string
): Promise<string> {
  const prompt = `당신은 바이럴 YouTube 영상 구조 분석 전문가입니다.

아래 YouTube 영상의 자막을 분석하여 다음을 추출하세요:

[분석 대상 영상]
URL: ${videoUrl}

[자막 내용]
${transcript.substring(0, 8000)}

[추출 항목]
1. **훅 (0-3초)**: 첫 문장의 훅 유형 (금지/위협, 숫자/구체성, 의외성, 콜드오픈, 권위 중 어느 것?)
2. **전체 구조**: 씬별 분석 (각 씬의 역할: 훅/상황/약속/핵심/반전/CTA)
3. **톤 & 스타일**: 화자의 말투, 속도감, 감정 곡선
4. **CTA 유형**: 마지막에 어떤 행동 유도를 하는지 (미완성 루프/손실 적화/정체성 도발/양자택일)
5. **바이럴 요소**: 왜 이 영상이 잘 되었는지 핵심 요인 3가지
6. **복제 가이드**: 이 구조를 다른 주제에 적용할 때의 템플릿
7. **영상 스타일 분석**:
   - 이미지 톤: (예: cinematic dark, bright clean, cartoon, realistic 등)
   - 주요 색감: (예: 따뜻한 오렌지, 차가운 블루, 네온 등)
   - 편집 리듬: (빠른 컷/느린 컷/혼합, 평균 컷 길이 추정)
   - 자막 스타일: (상단/중앙/하단, 색상, 크기감, 강조 방식)
   - 화면 구성: (실사/일러스트/혼합, 인물 중심/텍스트 중심/데이터 중심)
   - 전환 효과: (하드컷/디졸브/줌/슬라이드 등)

JSON 형식으로 출력:
{
  "hookType": "string",
  "hookText": "원본 훅 문장",
  "structure": [
    { "scene": 1, "role": "hook", "content": "요약", "duration": "0-3초" }
  ],
  "tone": "string",
  "ctaType": "string",
  "viralFactors": ["요인1", "요인2", "요인3"],
  "replicationTemplate": "이 구조를 복제하려면...",
  "visualStyle": {
    "imageTone": "string",
    "colorPalette": ["#hex1", "#hex2", "#hex3"],
    "editingRhythm": "string",
    "avgCutDuration": "string",
    "subtitleStyle": "string",
    "composition": "string",
    "transitions": "string"
  }
}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4000 },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini error ${res.status}: ${errText.substring(0, 200)}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, geminiKey } = body;

    if (!url) {
      return NextResponse.json({ error: "YouTube URL is required" }, { status: 400 });
    }

    const apiKey = geminiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is required" }, { status: 400 });
    }

    // 1. Video ID 추출
    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`[Benchmark] Analyzing: ${videoUrl} (ID: ${videoId})`);

    // 2. 자막 추출
    console.log(`[Benchmark] Fetching transcript...`);
    const transcript = await getTranscript(videoId);

    if (!transcript) {
      return NextResponse.json({
        error: "자막을 가져올 수 없습니다. 자막이 없는 영상이거나 비공개 영상일 수 있습니다.",
        videoId,
        videoUrl,
      }, { status: 400 });
    }

    console.log(`[Benchmark] Transcript: ${transcript.length} chars`);

    // 3. Gemini 분석
    console.log(`[Benchmark] Analyzing with Gemini...`);
    const analysis = await analyzeWithGemini(transcript, videoUrl, apiKey);
    console.log(`[Benchmark] Analysis complete: ${analysis.length} chars`);

    // 4. JSON 파싱 시도
    let parsedAnalysis = null;
    try {
      const jsonMatch = analysis.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedAnalysis = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.log(`[Benchmark] JSON parse failed, returning raw text`);
    }

    return NextResponse.json({
      success: true,
      videoId,
      videoUrl,
      transcript: transcript.substring(0, 2000),
      analysis: parsedAnalysis || analysis,
      rawAnalysis: analysis,
    });
  } catch (err: any) {
    console.error("[Benchmark] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}