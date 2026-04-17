import { Context, Markup } from 'telegraf';
import { getOrCreateUser, getUserChannels, createProduction, trackFeature } from '../../../../packages/shared/supabase';
import { runFullPipeline } from '../../../../packages/pipeline/src/fullPipeline';
import { uploadToYoutube } from '../../../../packages/pipeline/src/upload/uploadYoutube';

const CATEGORIES = [
  { id: 'invest', emoji: '💰', name: '투자' },
  { id: 'trading', emoji: '📈', name: '트레이딩' },
  { id: 'psychology', emoji: '🧠', name: '심리' },
  { id: 'health', emoji: '💪', name: '건강' },
  { id: 'economy', emoji: '📊', name: '경제' },
  { id: 'ai_trend', emoji: '🤖', name: 'AI트렌드' },
  { id: 'travel', emoji: '✈️', name: '문화/여행' },
  { id: 'quotes', emoji: '💡', name: '명언' },
  { id: 'old_tales', emoji: '📖', name: '야담' },
];

export async function showMakeMenu(ctx: Context) {
  const buttons = [
    [Markup.button.callback('✏️ 주제 직접 입력', 'make_custom')],
    [Markup.button.callback('📂 카테고리에서 선택', 'make_category')],
    [Markup.button.callback('📺 시리즈 생성', 'make_series')],
    [Markup.button.callback('📊 트렌드 분석', 'make_trend')],
    [Markup.button.callback('⏰ 자동 스케줄', 'make_schedule')],
    [Markup.button.callback('🔙 메인 메뉴', 'menu_main')],
  ];
  await ctx.editMessageText(
    '🎬 *영상 제작*\n\n어떤 방식으로 영상을 만들까요?',
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
  );
}

export async function showCategoryMenu(ctx: Context) {
  const rows = [];
  for (let i = 0; i < CATEGORIES.length; i += 2) {
    const row = [
      Markup.button.callback(
        `${CATEGORIES[i].emoji} ${CATEGORIES[i].name}`,
        `cat_${CATEGORIES[i].id}`
      ),
    ];
    if (CATEGORIES[i + 1]) {
      row.push(
        Markup.button.callback(
          `${CATEGORIES[i + 1].emoji} ${CATEGORIES[i + 1].name}`,
          `cat_${CATEGORIES[i + 1].id}`
        )
      );
    }
    rows.push(row);
  }
  rows.push([Markup.button.callback('🔙 영상 제작', 'menu_make')]);
  await ctx.editMessageText(
    '📂 *카테고리 선택*\n\n어떤 주제의 영상을 만들까요?',
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard(rows) }
  );
}

export async function handleCategorySelect(ctx: Context, categoryId: string) {
  const category = CATEGORIES.find(c => c.id === categoryId);
  if (!category) return;
  const buttons = [
    [Markup.button.callback('🎲 AI 주제 추천', `cat_auto_${categoryId}`)],
    [Markup.button.callback('✏️ 직접 입력', `cat_manual_${categoryId}`)],
    [Markup.button.callback('🔙 카테고리', 'make_category')],
  ];
  await ctx.editMessageText(
    `${category.emoji} *${category.name}* 카테고리\n\nAI가 주제를 추천할까요, 직접 입력할까요?`,
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
  );
}

const waitingForTopic = new Map<number, { category?: string; channelId?: string }>();
const suggestedTopicCache = new Map<number, string[]>();

export function setWaitingForTopic(userId: number, data: { category?: string; channelId?: string }) {
  waitingForTopic.set(userId, data);
}

export function getWaitingForTopic(userId: number) {
  return waitingForTopic.get(userId);
}

export function clearWaitingForTopic(userId: number) {
  waitingForTopic.delete(userId);
}

export async function handleManualTopic(ctx: Context, categoryId: string) {
  const userId = ctx.from?.id;
  if (!userId) return;
  const category = CATEGORIES.find(c => c.id === categoryId);
  setWaitingForTopic(userId, { category: categoryId });
  await ctx.editMessageText(
    `✏️ *주제를 입력해주세요*\n\n` +
    `카테고리: ${category?.emoji} ${category?.name}\n\n` +
    `예시:\n` +
    `• "비트코인 2026 하반기 전망"\n` +
    `• "AI가 바꾸는 미래 직업 TOP 5"\n` +
    `• "매일 아침 5분 루틴으로 인생 바꾸기"\n\n` +
    `💬 아래에 주제를 입력하세요:`,
    { parse_mode: 'Markdown' }
  );
}

export async function handleAutoTopic(ctx: Context, categoryId: string) {
  const category = CATEGORIES.find(c => c.id === categoryId);
  await ctx.editMessageText(`🎲 ${category?.emoji} ${category?.name} 트렌드 주제 검색 중...\n\n⏳ YouTube 인기 영상 분석 + AI 추천 (10~15초)`);
  const user = await getOrCreateUser(ctx.from!.id);
  const userLang = user.default_language || 'ko';
  let suggestedTopics: string[];
  try {
    const { runTrendAnalysis } = await import('../services/trendSearch');
    const analysis = await runTrendAnalysis(categoryId, userLang);
    suggestedTopics = analysis.suggestedTopics.slice(0, 3);
    if (suggestedTopics.length === 0) {
      suggestedTopics = getSampleTopics(categoryId);
    }
  } catch (e) {
    console.error('트렌드 검색 실패, 샘플 주제 사용:', e);
    suggestedTopics = getSampleTopics(categoryId);
  }
  suggestedTopicCache.set(ctx.from!.id, suggestedTopics);
  const buttons = suggestedTopics.map((topic, i) =>
    [Markup.button.callback(`${i + 1}️⃣ ${topic}`, `stopic_${categoryId}_${i}`)]
  );
  buttons.push([Markup.button.callback('🎲 다시 추천', `cat_auto_${categoryId}`)]);
  buttons.push([Markup.button.callback('✏️ 직접 입력', `cat_manual_${categoryId}`)]);
  buttons.push([Markup.button.callback('🔙 카테고리', 'make_category')]);
  await ctx.editMessageText(
    `🎲 *${category?.emoji} ${category?.name} 추천 주제*\n\n선택하세요:`,
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
  );
}



function getSampleTopics(categoryId: string): string[] {
  const topics: Record<string, string[]> = {
    invest: ['비트코인 2026 하반기 폭등 시나리오', '워렌 버핏이 지금 사는 주식 3가지', '20대에 1억 모으는 현실적 방법'],
    trading: ['이 패턴 나오면 무조건 매수하세요', '손절 못하는 사람의 공통점 3가지', '스캘핑으로 일 50만원 버는 루틴'],
    psychology: ['성공하는 사람의 아침 루틴 비밀', '불안을 이기는 5초 법칙', '부자들의 사고방식 vs 가난한 사고방식'],
    health: ['매일 이것만 하면 10살 젊어진다', '의사들이 절대 안 먹는 음식 5가지', '잠 못 자는 사람이 꼭 해야 할 것'],
    economy: ['2026년 부동산 대폭락 온다?', '금리 인하가 당신 통장에 미치는 영향', '한국 경제 위기설의 진실'],
    ai_trend: ['ChatGPT 대체할 AI 등장했다', 'AI로 월 500만원 버는 현실적 방법', '2026년 사라질 직업 vs 뜨는 직업'],
    travel: ['인생샷 보장 국내 여행지 TOP 3', '10만원으로 떠나는 동남아 여행', '현지인만 아는 일본 숨은 맛집'],
    quotes: ['실패할 때 꼭 들어야 할 명언', '돈에 대한 부자들의 한마디', '인생을 바꾸는 한 문장'],
    old_tales: ['조선시대 가장 무서운 복수극', '왕을 속인 천재 사기꾼 이야기', '조선 최고의 미스터리 사건'],
  };
  return topics[categoryId] || ['AI 트렌드 최신 분석', '돈 되는 정보 모음', '알아두면 쓸모있는 지식'];
}

export async function executeVideoGeneration(ctx: Context, topic: string, category?: string) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;
  try {
    const user = await getOrCreateUser(telegramId);
    if (user.monthly_video_count >= user.monthly_video_limit) {
      await ctx.reply(
        `⚠️ 이번 달 영상 제작 한도에 도달했습니다.\n\n` +
        `📊 ${user.monthly_video_count}/${user.monthly_video_limit}개 사용\n` +
        `💎 플랜 업그레이드로 더 많은 영상을 만들어보세요!`,
        Markup.inlineKeyboard([
          [Markup.button.callback('💎 플랜 업그레이드', 'settings_plan')],
          [Markup.button.callback('🔙 메인 메뉴', 'menu_main')],
        ])
      );
      return;
    }
    const production = await createProduction({
      user_id: user.id,
      topic,
      category: category || 'general',
      status: 'scripting',
    });
    await trackFeature(user.id, 'make_video', { topic, category });
    const statusMsg = await ctx.reply(
      `🎬 *영상 제작 시작!*\n\n` +
      `📌 주제: ${topic}\n` +
      `📂 카테고리: ${category || '일반'}\n` +
      `⏱️ 예상 소요: 3-5분\n\n` +
      `📝 1/5 대본 생성 중...`,
      { parse_mode: 'Markdown' }
    );
    const result = await runFullPipeline({
      topic,
      category: category || 'default',
      userId: String(ctx.from?.id || ''),
      stylePresetName: 'whiteboard',
    });
    await ctx.telegram.editMessageText(
      ctx.chat!.id, statusMsg.message_id, undefined,
      `🎬 *영상 제작 중*\n\n📌 ${topic}\n\n` +
      `✅ 1/5 대본 생성 완료\n` +
      `✅ 2/5 이미지 생성 완료\n` +
      `✅ 3/5 음성 생성 완료\n` +
      `✅ 4/5 렌더링 완료\n` +
      `📤 5/5 YouTube 업로드 중...`,
      { parse_mode: 'Markdown' }
    );
    const metadata = result.metadata;
    const ytCategoryId = (await import('../../../../packages/pipeline/src/upload/uploadYoutube')).getYoutubeCategoryId(category || 'general');
    const optimizedTitle = metadata?.title || topic;
    const optimizedDescription = [
      metadata?.description || `${topic}에 대한 영상입니다.`,
      '',
      metadata?.hashtags?.join(' ') || '',
      '',
      '🔔 구독과 좋아요 부탁드려요!',
    ].join('\n');
    const optimizedTags = [
      ...(metadata?.tags || []),
      ...(metadata?.hashtags?.map((h: string) => h.replace('#', '')) || []),
      topic,
    ].slice(0, 30);
    const uploadResult = await uploadToYoutube({
      videoPath: result.videoPath,
      title: optimizedTitle.substring(0, 100),
      description: optimizedDescription,
      tags: optimizedTags,
      privacyStatus: 'unlisted',
      categoryId: ytCategoryId,
    });
    if (uploadResult.success) {
      const { updateProduction } = await import('../../../../packages/shared/supabase');
      await updateProduction(production.id, {
        status: 'review',
        youtube_video_id: uploadResult.videoId,
        youtube_url: uploadResult.videoUrl,
        video_path: result.videoPath,
      });
      await ctx.telegram.editMessageText(
        ctx.chat!.id, statusMsg.message_id, undefined,
        `✅ *영상 제작 완료!*\n\n` +
        `📌 주제: ${topic}\n` +
        `🔗 미리보기: ${uploadResult.videoUrl}\n` +
        `🔒 상태: 비공개(Unlisted)\n\n` +
        `확인 후 공개 발행하세요 👇`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.url('▶️ 미리보기', uploadResult.videoUrl!)],
            [Markup.button.callback('✅ 공개 발행', `publish_now_${production.id}`)],
            [Markup.button.callback('⏰ 예약 발행', `publish_schedule_${production.id}`)],
            [Markup.button.callback('🔄 리메이크', `remake_${production.id}`)],
            [Markup.button.callback('🗑️ 삭제', `delete_${production.id}`)],
          ]),
        }
      );
    } else {
      const { updateProduction } = await import('../../../../packages/shared/supabase');
      await updateProduction(production.id, {
        status: 'failed',
        error_message: uploadResult.error,
      });
      await ctx.telegram.editMessageText(
        ctx.chat!.id, statusMsg.message_id, undefined,
        `⚠️ 영상 생성은 완료했지만 업로드 실패\n\n오류: ${uploadResult.error}`,
        {
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🔄 다시 시도', `retry_upload_${production.id}`)],
            [Markup.button.callback('🔙 메인 메뉴', 'menu_main')],
          ]),
        }
      );
    }
  } catch (error: any) {
    console.error('Video generation error:', error);
    await ctx.reply(
      `❌ 영상 생성 실패: ${error.message}`,
      Markup.inlineKeyboard([
        [Markup.button.callback('🔄 다시 시도', 'menu_make')],
        [Markup.button.callback('🔙 메인 메뉴', 'menu_main')],
      ])
    );
  }
}

export async function showTrendMenu(ctx: Context) {
  const buttons = CATEGORIES.map((cat) => [
    Markup.button.callback(`${cat.emoji} ${cat.name}`, `trend_${cat.id}`),
  ]);
  buttons.push([Markup.button.callback('🔙 돌아가기', 'menu_make')]);
  await ctx.editMessageText(
    '📊 *트렌드 분석*\n\n어떤 카테고리의 트렌드를 분석할까요?',
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
  );
}

export async function handleTrendAnalysis(ctx: Context, category: string) {
  const { runTrendAnalysis } = await import('../services/trendSearch');
  const catInfo = CATEGORIES.find((c) => c.id === category);
  const catName = catInfo ? `${catInfo.emoji} ${catInfo.name}` : category;
  await ctx.editMessageText(
    `📊 *${catName} 트렌드 분석 중...*\n\n⏳ 인기 영상 검색 + AI 키워드 추출 중\n약 10-15초 소요`,
    { parse_mode: 'Markdown' }
  );
  try {
    const analysis = await runTrendAnalysis(category);
    if (analysis.suggestedTopics.length === 0) {
      await ctx.editMessageText(
        `📊 *${catName} 트렌드 분석 결과*\n\n😅 트렌드 데이터가 부족합니다.\n다른 카테고리를 시도해보세요.`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🔙 카테고리 선택', 'make_trend')],
            [Markup.button.callback('🔙 메인 메뉴', 'menu_main')],
          ]),
        }
      );
      return;
    }
    const keywordText = analysis.extractedKeywords.slice(0, 8).join(', ');
    const topVideoText = analysis.topVideos
      .slice(0, 3)
      .map((v: any, i: number) => `${i + 1}. ${v.title}`)
      .join('\n');
    const topicButtons = analysis.suggestedTopics.map((topic: string, i: number) => [
      Markup.button.callback(`${i + 1}. ${topic.substring(0, 40)}`, `trend_topic_${category}_${i}`),
    ]);
    topicButtons.push([Markup.button.callback('🔙 카테고리 선택', 'make_trend')]);
    (ctx as any).session = (ctx as any).session || {};
    (ctx as any).session.trendTopics = analysis.suggestedTopics;
    await ctx.editMessageText(
      `📊 *${catName} 트렌드 분석 완료!*\n\n` +
      `🔥 *인기 영상 TOP 3:*\n${topVideoText}\n\n` +
      `🔑 *추출 키워드:* ${keywordText}\n\n` +
      `💡 *추천 토픽 (선택하면 바로 제작):*`,
      { parse_mode: 'Markdown', ...Markup.inlineKeyboard(topicButtons) }
    );
  } catch (error: any) {
    await ctx.editMessageText(
      `❌ 트렌드 분석 실패: ${error.message}`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 다시 시도', 'make_trend')],
          [Markup.button.callback('🔙 메인 메뉴', 'menu_main')],
        ]),
      }
    );
  }
}

export { CATEGORIES, suggestedTopicCache };
