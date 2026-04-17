import { Context, Markup } from 'telegraf';
import { isAdmin, getAdminStats, supabase } from '../../../../packages/shared/supabase';

// 관리자 권한 체크
async function checkAdmin(ctx: Context): Promise<boolean> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return false;

  const admin = await isAdmin(telegramId);
  if (!admin) {
    await ctx.editMessageText('🔒 관리자 권한이 없습니다.');
    return false;
  }
  return true;
}

// 관리자 메인 메뉴
export async function showAdminMenu(ctx: Context) {
  if (!(await checkAdmin(ctx))) return;

  const stats = await getAdminStats();

  const text =
    `🔐 *관리자 대시보드*\n\n` +
    `📊 *실시간 통계*\n` +
    `  👥 총 유저: ${stats.totalUsers}명\n` +
    `  🆕 오늘 가입: ${stats.todayNewUsers}명\n` +
    `  🎬 총 영상: ${stats.totalProductions}개\n` +
    `  📹 오늘 영상: ${stats.todayProductions}개\n\n` +
    `⏰ ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`;

  const buttons = [
    [Markup.button.callback('👥 유저 관리', 'admin_users')],
    [Markup.button.callback('📊 상세 통계', 'admin_stats')],
    [Markup.button.callback('🎬 영상 모니터링', 'admin_productions')],
    [Markup.button.callback('💰 수익 현황', 'admin_revenue')],
    [Markup.button.callback('🔥 인기 카테고리', 'admin_categories')],
    [Markup.button.callback('🔍 인기 주제', 'admin_topics')],
    [Markup.button.callback('⚠️ 에러 로그', 'admin_errors')],
    [Markup.button.callback('🔧 시스템 설정', 'admin_system')],
    [Markup.button.callback('🔙 메인 메뉴', 'menu_main')],
  ];

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons),
  });
}

// 유저 관리
export async function showAdminUsers(ctx: Context) {
  if (!(await checkAdmin(ctx))) return;

  const { data: users } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  let text = '👥 *유저 목록 (최근 20명)*\n\n';

  const planEmoji: Record<string, string> = {
    free: '🆓', starter: '⭐', pro: '💎', agency: '🏢',
  };

  (users || []).forEach((u, i) => {
    const date = new Date(u.created_at).toLocaleDateString('ko-KR');
    text += `${i + 1}. ${planEmoji[u.plan] || '🆓'} ${u.display_name || '이름없음'}\n`;
    text += `   @${u.telegram_username || '없음'} | 영상 ${u.monthly_video_count}개 | ${date}\n\n`;
  });

  // 플랜별 분포
  const { data: planCounts } = await supabase
    .from('users')
    .select('plan');

  const distribution: Record<string, number> = {};
  (planCounts || []).forEach(u => {
    distribution[u.plan] = (distribution[u.plan] || 0) + 1;
  });

  text += `\n📊 *플랜 분포*\n`;
  Object.entries(distribution).forEach(([plan, count]) => {
    text += `  ${planEmoji[plan] || '❓'} ${plan}: ${count}명\n`;
  });

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🔄 새로고침', 'admin_users')],
      [Markup.button.callback('🔙 관리자', 'menu_admin')],
    ]),
  });
}

// 상세 통계
export async function showAdminStats(ctx: Context) {
  if (!(await checkAdmin(ctx))) return;

  const stats = await getAdminStats();

  // 7일간 영상 수
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { count: weekProductions } = await supabase
    .from('productions')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekAgo.toISOString());

  const { count: weekUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekAgo.toISOString());

  // 성공률
  const { count: totalSuccess } = await supabase
    .from('productions')
    .select('*', { count: 'exact', head: true })
    .in('status', ['review', 'published', 'scheduled']);

  const { count: totalFailed } = await supabase
    .from('productions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'failed');

  const total = (totalSuccess || 0) + (totalFailed || 0);
  const successRate = total > 0 ? ((totalSuccess || 0) / total * 100).toFixed(1) : '0';

  // 총 비용
  const { data: costData } = await supabase
    .from('cost_logs')
    .select('cost');
  const totalCost = (costData || []).reduce((sum, c) => sum + c.cost, 0);

  const text =
    `📊 *상세 통계*\n\n` +
    `👥 *유저*\n` +
    `  총 유저: ${stats.totalUsers}명\n` +
    `  이번 주 가입: ${weekUsers || 0}명\n` +
    `  오늘 가입: ${stats.todayNewUsers}명\n\n` +
    `🎬 *영상*\n` +
    `  총 영상: ${stats.totalProductions}개\n` +
    `  이번 주: ${weekProductions || 0}개\n` +
    `  오늘: ${stats.todayProductions}개\n` +
    `  성공률: ${successRate}%\n\n` +
    `💰 *비용*\n` +
    `  총 API 비용: $${totalCost.toFixed(2)}\n` +
    `  영상당 평균: $${stats.totalProductions > 0 ? (totalCost / stats.totalProductions).toFixed(3) : '0.000'}\n\n` +
    `📈 *일 평균*\n` +
    `  영상/일: ${((weekProductions || 0) / 7).toFixed(1)}개\n` +
    `  가입/일: ${((weekUsers || 0) / 7).toFixed(1)}명`;

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🔄 새로고침', 'admin_stats')],
      [Markup.button.callback('🔙 관리자', 'menu_admin')],
    ]),
  });
}

// 영상 모니터링
export async function showAdminProductions(ctx: Context) {
  if (!(await checkAdmin(ctx))) return;

  const { data: recent } = await supabase
    .from('productions')
    .select('*, users(display_name, telegram_username)')
    .order('created_at', { ascending: false })
    .limit(15);

  let text = '🎬 *영상 모니터링 (최근 15개)*\n\n';

  const statusEmoji: Record<string, string> = {
    queued: '⏳', scripting: '📝', imaging: '🎨', voicing: '🔊',
    captioning: '💬', rendering: '🎥', uploading: '📤',
    review: '📋', scheduled: '⏰', published: '✅', failed: '❌',
  };

  (recent || []).forEach((p, i) => {
    const date = new Date(p.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    const userName = (p as any).users?.display_name || (p as any).users?.telegram_username || '알 수 없음';
    text += `${statusEmoji[p.status] || '❓'} ${p.topic?.substring(0, 25)}\n`;
    text += `   👤 ${userName} | ${date}\n`;
    if (p.status === 'failed' && p.error_message) {
      text += `   ⚠️ ${p.error_message.substring(0, 40)}\n`;
    }
    text += '\n';
  });

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🔄 새로고침', 'admin_productions')],
      [Markup.button.callback('🔙 관리자', 'menu_admin')],
    ]),
  });
}

// 수익 현황
export async function showAdminRevenue(ctx: Context) {
  if (!(await checkAdmin(ctx))) return;

  const { data: users } = await supabase
    .from('users')
    .select('plan');

  const planPrices: Record<string, number> = {
    free: 0, starter: 29, pro: 79, agency: 199,
  };

  let mrr = 0;
  const planCounts: Record<string, number> = {};
  (users || []).forEach(u => {
    mrr += planPrices[u.plan] || 0;
    planCounts[u.plan] = (planCounts[u.plan] || 0) + 1;
  });

  const { data: costData } = await supabase
    .from('cost_logs')
    .select('cost');
  const totalCost = (costData || []).reduce((sum, c) => sum + c.cost, 0);

  const text =
    `💰 *수익 현황*\n\n` +
    `📈 *MRR (월 반복 수익)*\n` +
    `  💵 $${mrr}/월\n\n` +
    `📊 *플랜별 매출*\n` +
    `  🆓 Free: ${planCounts['free'] || 0}명 × $0 = $0\n` +
    `  ⭐ Starter: ${planCounts['starter'] || 0}명 × $29 = $${(planCounts['starter'] || 0) * 29}\n` +
    `  💎 Pro: ${planCounts['pro'] || 0}명 × $79 = $${(planCounts['pro'] || 0) * 79}\n` +
    `  🏢 Agency: ${planCounts['agency'] || 0}명 × $199 = $${(planCounts['agency'] || 0) * 199}\n\n` +
    `💸 *비용*\n` +
    `  총 API 비용: $${totalCost.toFixed(2)}\n\n` +
    `📊 *순이익*\n` +
    `  월 순이익: $${(mrr - totalCost).toFixed(2)}\n` +
    `  마진: ${mrr > 0 ? ((1 - totalCost / mrr) * 100).toFixed(1) : '0'}%`;

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🔄 새로고침', 'admin_revenue')],
      [Markup.button.callback('🔙 관리자', 'menu_admin')],
    ]),
  });
}

// 인기 카테고리
export async function showAdminCategories(ctx: Context) {
  if (!(await checkAdmin(ctx))) return;

  const { data: productions } = await supabase
    .from('productions')
    .select('category');

  const counts: Record<string, number> = {};
  (productions || []).forEach(p => {
    const cat = p.category || 'general';
    counts[cat] = (counts[cat] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  const categoryEmoji: Record<string, string> = {
    invest: '💰', trading: '📈', psychology: '🧠', health: '💪',
    economy: '📊', ai_trend: '🤖', travel: '✈️', quotes: '💡',
    online_income: '💻', trading_tech: '📉', general: '📌',
  };

  let text = '🔥 *인기 카테고리*\n\n';
  sorted.forEach(([cat, count], i) => {
    const emoji = categoryEmoji[cat] || '📌';
    const bar = '█'.repeat(Math.min(Math.ceil(count / Math.max(...sorted.map(s => s[1])) * 10), 10));
    text += `${i + 1}. ${emoji} ${cat}: ${count}개 ${bar}\n`;
  });

  if (sorted.length === 0) {
    text += '아직 데이터가 없습니다.';
  }

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🔄 새로고침', 'admin_categories')],
      [Markup.button.callback('🔙 관리자', 'menu_admin')],
    ]),
  });
}

// 인기 주제
export async function showAdminTopics(ctx: Context) {
  if (!(await checkAdmin(ctx))) return;

  const { data: productions } = await supabase
    .from('productions')
    .select('topic, view_count, like_count, status')
    .eq('status', 'published')
    .order('view_count', { ascending: false })
    .limit(15);

  let text = '🔍 *인기 주제 TOP 15*\n\n';

  if (!productions || productions.length === 0) {
    text += '아직 발행된 영상이 없습니다.';
  } else {
    productions.forEach((p, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      text += `${medal} ${p.topic}\n`;
      text += `   👁️ ${(p.view_count || 0).toLocaleString()} | 👍 ${p.like_count || 0}\n\n`;
    });
  }

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🔄 새로고침', 'admin_topics')],
      [Markup.button.callback('🔙 관리자', 'menu_admin')],
    ]),
  });
}

// 에러 로그
export async function showAdminErrors(ctx: Context) {
  if (!(await checkAdmin(ctx))) return;

  const { data: errors } = await supabase
    .from('productions')
    .select('topic, error_message, created_at, users(display_name)')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(10);

  let text = '⚠️ *최근 에러 (10개)*\n\n';

  if (!errors || errors.length === 0) {
    text += '에러가 없습니다! 🎉';
  } else {
    errors.forEach((e, i) => {
      const date = new Date(e.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
      const userName = (e as any).users?.display_name || '알 수 없음';
      text += `${i + 1}. ❌ ${e.topic?.substring(0, 25)}\n`;
      text += `   👤 ${userName} | ${date}\n`;
      text += `   💬 ${e.error_message?.substring(0, 50) || '메시지 없음'}\n\n`;
    });
  }

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🔄 새로고침', 'admin_errors')],
      [Markup.button.callback('🔙 관리자', 'menu_admin')],
    ]),
  });
}

// 시스템 설정
export async function showAdminSystem(ctx: Context) {
  if (!(await checkAdmin(ctx))) return;

  const text =
    `🔧 *시스템 설정*\n\n` +
    `🤖 *AI 모델*\n` +
    `  대본: Claude Sonnet 4.6 (OpenRouter)\n` +
    `  이미지: Flux (Replicate)\n` +
    `  음성: Neural2 (Google TTS)\n\n` +
    `⚙️ *파이프라인*\n` +
    `  이미지 딜레이: 10초\n` +
    `  재시도 횟수: 3회\n` +
    `  렌더링: Remotion 4.0\n\n` +
    `🌐 *서버*\n` +
    `  상태: 로컬 실행 중\n` +
    `  배포: 미완료\n\n` +
    `준비 중인 설정:\n` +
    `• AI 모델 변경\n` +
    `• 이미지 생성 설정\n` +
    `• 전역 기본값 변경`;

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🔙 관리자', 'menu_admin')],
    ]),
  });
}
