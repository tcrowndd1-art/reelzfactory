import OpenAI from 'openai';

// ============================================================
// YouTube 트렌드 검색 + AI 키워드 추출 + 토픽 생성
// ============================================================

const CATEGORY_SEARCH_QUERIES: Record<string, string[]> = {
  invest: ['투자 shorts', '재테크 shorts', 'investing shorts korean', '주식 shorts'],
  trading: ['트레이딩 shorts', '주식매매 shorts', 'stock trading shorts', '차트분석'],
  psychology: ['심리학 shorts', '자기계발 shorts', 'psychology shorts', '동기부여'],
  health: ['건강 shorts', '건강상식 shorts', 'health tips shorts', '다이어트'],
  economy: ['경제 shorts', '경제뉴스 shorts', 'economy news shorts', '금리'],
  ai_trend: ['AI shorts', '인공지능 shorts', 'AI news shorts', 'ChatGPT'],
  travel: ['여행 shorts', '문화 shorts', 'travel shorts korean', '맛집'],
  quotes: ['명언 shorts', '동기부여 shorts', 'motivation shorts korean', '인생명언'],
  old_tales: ['야담 shorts', '옛날이야기', '한국 역사 shorts', '조선시대 이야기'],
};

export interface TrendVideo {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
  viewCount?: string;
}

export interface TrendAnalysis {
  category: string;
  topVideos: TrendVideo[];
  extractedKeywords: string[];
  suggestedTopics: string[];
}

// ============================================================
// YouTube Data API로 인기 Shorts 검색
// ============================================================
export async function searchTrendingShorts(
  category: string,
  maxResults: number = 10
): Promise<TrendVideo[]> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_TTS_API_KEY가 없습니다');

  const queries = CATEGORY_SEARCH_QUERIES[category] || CATEGORY_SEARCH_QUERIES.invest;
  const allVideos: TrendVideo[] = [];

  for (const query of queries) {
    try {
      const url = new URL('https://www.googleapis.com/youtube/v3/search');
      url.searchParams.set('part', 'snippet');
      url.searchParams.set('q', query);
      url.searchParams.set('type', 'video');
      url.searchParams.set('order', 'viewCount');
      url.searchParams.set('videoDuration', 'short');
      url.searchParams.set('publishedAfter', getDateWeeksAgo(2));
      url.searchParams.set('maxResults', String(Math.ceil(maxResults / queries.length)));
      url.searchParams.set('key', apiKey);

      const response = await fetch(url.toString());
      if (!response.ok) continue;

      const data = await response.json();

      for (const item of data.items || []) {
        allVideos.push({
          videoId: item.id.videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          channelTitle: item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt,
          thumbnailUrl: item.snippet.thumbnails?.high?.url || '',
        });
      }
    } catch (err) {
      console.error(`트렌드 검색 실패 [${query}]:`, err);
    }
  }

  // 중복 제거
  const unique = allVideos.filter(
    (v, i, arr) => arr.findIndex((x) => x.videoId === v.videoId) === i
  );

  console.log(`📊 트렌드 검색 완료 [${category}]: ${unique.length}개 영상`);
  return unique.slice(0, maxResults);
}

// ============================================================
// AI로 키워드 추출 + 토픽 생성
// ============================================================
export async function analyzeAndSuggestTopics(
  category: string,
  videos: TrendVideo[],
  lang: string = 'ko'
): Promise<{ keywords: string[]; topics: string[] }> {
  const langMap: Record<string, string> = { ko: '한국어', pt: 'português brasileiro', es: 'español', ja: '日本語', en: 'English' };
  const langLabel = langMap[lang] || '한국어';
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY 필요');

  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
  });

  const videoSummary = videos
    .map((v, i) => `${i + 1}. "${v.title}" - ${v.channelTitle}`)
    .join('\n');

  const response = await client.chat.completions.create({
    model: 'openai/gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `당신은 유튜브 쇼츠 트렌드 분석가입니다. 주어진 인기 영상 목록에서 키워드를 추출하고, 새로운 콘텐츠 주제를 제안합니다.
반드시 JSON만 응답하세요:
{
  "keywords": ["키워드1", "키워드2", ...최대 10개],
  "topics": ["구체적 토픽1", "구체적 토픽2", ...5개]
}
topics는 반드시 ${langLabel}로 작성하세요. 영어 제목이 있더라도 ${langLabel}로 번역하여 제안합니다. 바로 영상 제작에 사용할 수 있을 정도로 구체적이어야 합니다.`,
      },
      {
        role: 'user',
        content: `카테고리: ${category}\n\n최근 인기 쇼츠 영상 목록:\n${videoSummary}\n\n이 트렌드를 분석해서 키워드와 새 토픽을 제안해주세요.`,
      },
    ],
    max_tokens: 1024,
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content || '{}';
  const jsonString = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const result = JSON.parse(jsonString);
    console.log(`🔍 키워드 ${result.keywords?.length || 0}개, 토픽 ${result.topics?.length || 0}개 추출`);
    return {
      keywords: result.keywords || [],
      topics: result.topics || [],
    };
  } catch {
    return { keywords: [], topics: [] };
  }
}

// ============================================================
// 전체 트렌드 분석 파이프라인
// ============================================================
export async function runTrendAnalysis(category: string, lang: string = 'ko'): Promise<TrendAnalysis> {
  console.log(`\n📊 트렌드 분석 시작: ${category}`);
  const langMap: Record<string, string> = { ko: '한국어', pt: 'português brasileiro', es: 'español', ja: '日本語', en: 'English' };
  const langLabel = langMap[lang] || '한국어';

  const topVideos = await searchTrendingShorts(category, 10);


  if (topVideos.length === 0) {
    return {
      category,
      topVideos: [],
      extractedKeywords: [],
      suggestedTopics: [],
    };
  }

  const { keywords, topics } = await analyzeAndSuggestTopics(category, topVideos, lang);

  console.log(`✅ 트렌드 분석 완료: ${keywords.length}개 키워드, ${topics.length}개 토픽\n`);

  return {
    category,
    topVideos,
    extractedKeywords: keywords,
    suggestedTopics: topics,
  };
}

// ============================================================
// 헬퍼
// ============================================================
function getDateWeeksAgo(weeks: number): string {
  const date = new Date();
  date.setDate(date.getDate() - weeks * 7);
  return date.toISOString();
}