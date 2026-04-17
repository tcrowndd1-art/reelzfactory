import { Context, Markup } from 'telegraf';
import { getOrCreateUser, getUserProductions, getMonthlyCost, getTodayProductions, trackFeature } from '../../../../packages/shared/supabase';

// 대시보드 메인 메뉴
export async function showDashboardMenu(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const buttons = [
    [Markup.button.callback('📈 오늘 성과', 'dash_today')],
    [Markup.button.callback('🏆 TOP 영상 (7일)', 'dash_top7'), Markup.button.callback('🏆 TOP (30일)', 'dash_top30')],
    [Markup.button.callback('💬 최신 댓글', 'dash_comments')],
    [Markup.button.callback('💰 비용 리포트', 'dash_cost')],
    [Markup.button.callback('🕵️ 경쟁 분석', 'dash_spy')],
    [Markup.button.callback('🔙 메인 메뉴', 'menu_main')],
  ];

  await ctx.editMessageText(
    '📊 *대시보드*\n\n무엇을 확인할까요?',
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
  );
}

// 오늘 성과
export async function showTodayStats(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = await getOrCreateUser(telegramId);
  const todayVideos = await getTodayProductions(user.id);

  const published = todayVideos.filter(v => v.status === 'published');
  const review = todayVideos.filter(v => v.status === 'review');
  const failed = todayVideos.filter(v => v.status === 'failed');

  const totalViews = todayVideos.reduce((sum, v) => sum + (v.view_count || 0), 0);
  const totalLikes = todayVideos.reduce((sum, v) => sum + (v.like_count || 0), 0);
  const totalComments = todayVideos.reduce((sum, v) => sum + (v.comment_count || 0), 0);
  const totalCost = todayVideos.reduce((sum, v) => sum + (v.cost_total || 0), 0);

  const text =
    `📈 *오늘 성과*\n` +
    `📅 ${new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}\n\n` +
    `🎬 *제작 현황*\n` +
    `  총 제작: ${todayVideos.length}개\n` +
    `  ✅ 발행됨: ${published.length}개\n` +
    `  📝 대기중: ${review.length}개\n` +
    `  ❌ 실패: ${failed.length}개\n\n` +
    `📊 *성과 지표*\n` +
    `  👁️ 총 조회수: ${totalViews.toLocaleString()}\n` +
    `  👍 총 좋아요: ${totalLikes.toLocaleString()}\n` +
    `  💬 총 댓글: ${totalComments.toLocaleString()}\n\n` +
    `💰 *비용*\n` +
    `  오늘 사용: $${totalCost.toFixed(3)}`;

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🔄 새로고침', 'dash_today')],
      [Markup.button.callback('🔙 대시보드', 'menu_dashboard')],
    ]),
  });
}

// TOP 영상 (7일)
export async function showTopVideos(ctx: Context, days: number) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = await getOrCreateUser(telegramId);
  const allVideos = await getUserProductions(user.id, undefined, 50);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const recentVideos = allVideos
    .filter(v => new Date(v.created_at) >= cutoff && v.status === 'published')
    .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
    .slice(0, 10);

  if (recentVideos.length === 0) {
    await ctx.editMessageText(
      `🏆 *TOP 영상 (${days}일)*\n\n발행된 영상이 없습니다.`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🎬 영상 만들기', 'menu_make')],
          [Markup.button.callback('🔙 대시보드', 'menu_dashboard')],
        ]),
      }
    );
    return;
  }

  let text = `🏆 *TOP 영상 (${days}일)*\n\n`;
  const buttons: any[][] = [];

  recentVideos.forEach((v, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    text += `${medal} ${v.topic}\n`;
    text += `   👁️ ${(v.view_count || 0).toLocaleString()} | 👍 ${v.like_count || 0} | 💬 ${v.comment_count || 0}\n\n`;

    if (i < 5) {
      buttons.push([
        Markup.button.callback(`${medal} ${v.topic.substring(0, 25)}`, `pub_detail_${v.id}`),
      ]);
    }
  });

  buttons.push([Markup.button.callback('🔙 대시보드', 'menu_dashboard')]);

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons),
  });
}

// 최신 댓글
export async function showLatestComments(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  // TODO: YouTube API로 댓글 가져오기
  await ctx.editMessageText(
    '💬 *최신 댓글*\n\n' +
    '준비 중입니다. YouTube Analytics API 연동 후 사용 가능합니다.\n\n' +
    '연동되면 이 기능으로 할 수 있는 것:\n' +
    '• 모든 채널의 최신 댓글 확인\n' +
    '• 텔레그램에서 바로 답변 작성\n' +
    '• AI 자동 답변 추천\n' +
    '• 악성 댓글 필터링',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔙 대시보드', 'menu_dashboard')],
      ]),
    }
  );
}

// 비용 리포트
export async function showCostReport(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = await getOrCreateUser(telegramId);
  const monthlyCost = await getMonthlyCost(user.id);
  const todayVideos = await getTodayProductions(user.id);
  const todayCost = todayVideos.reduce((sum, v) => sum + (v.cost_total || 0), 0);

  const text =
    `💰 *비용 리포트*\n\n` +
    `📅 *오늘*\n` +
    `  총 비용: $${todayCost.toFixed(3)}\n` +
    `  영상 수: ${todayVideos.length}개\n` +
    `  영상당 평균: $${todayVideos.length > 0 ? (todayCost / todayVideos.length).toFixed(3) : '0.000'}\n\n` +
    `📅 *이번 달*\n` +
    `  총 비용: $${monthlyCost.total.toFixed(3)}\n\n` +
    `📊 *API별 상세*\n` +
    `  🤖 OpenRouter (대본): $${(monthlyCost.byProvider['openrouter'] || 0).toFixed(3)}\n` +
    `  🎨 Replicate (이미지): $${(monthlyCost.byProvider['replicate'] || 0).toFixed(3)}\n` +
    `  🔊 Google TTS (음성): $${(monthlyCost.byProvider['google_tts'] || 0).toFixed(3)}\n\n` +
    `💡 *절약 팁*\n` +
    `  Google TTS는 월 100만자 무료!\n` +
    `  이미지당 ~$0.04, 대본당 ~$0.01`;

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🔄 새로고침', 'dash_cost')],
      [Markup.button.callback('🔙 대시보드', 'menu_dashboard')],
    ]),
  });
}

// 경쟁 분석 메뉴
export async function showSpyMenu(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  await ctx.editMessageText(
    '🕵️ *경쟁 채널 분석*\n\n' +
    '준비 중입니다. 곧 업데이트됩니다!\n\n' +
    '연동되면 이 기능으로 할 수 있는 것:\n' +
    '• 경쟁 채널 URL 등록\n' +
    '• 인기 영상 제목/태그 분석\n' +
    '• 조회수 터진 주제 추출\n' +
    '• 분석 기반 주제 자동 추천',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('➕ 채널 등록 (준비중)', 'spy_add')],
        [Markup.button.callback('🔙 대시보드', 'menu_dashboard')],
      ]),
    }
  );
}
