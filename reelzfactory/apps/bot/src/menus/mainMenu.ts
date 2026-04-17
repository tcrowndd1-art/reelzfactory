import { Context, Markup } from 'telegraf';
import { getOrCreateUser, isAdmin } from '../../../../packages/shared/supabase';

export async function showMainMenu(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  // 유저 등록 또는 조회
  const user = await getOrCreateUser(
    telegramId,
    ctx.from?.username,
    `${ctx.from?.first_name || ''} ${ctx.from?.last_name || ''}`.trim()
  );

  const adminCheck = await isAdmin(telegramId);

  const buttons = [
    [Markup.button.callback('🎬 영상 제작', 'menu_make')],
    [Markup.button.callback('📡 채널 관리', 'menu_channel'), Markup.button.callback('🛒 쇼핑 쇼츠', 'menu_shopping')],
    [Markup.button.callback('📊 대시보드', 'menu_dashboard'), Markup.button.callback('🎯 벤치마킹', 'menu_benchmark')],
    [Markup.button.callback('📚 참고자료', 'menu_reference'), Markup.button.callback('⚙️ 설정', 'menu_settings')],
  ];

  // 관리자만 보이는 버튼
  if (adminCheck) {
    buttons.push([Markup.button.callback('🔐 관리자', 'menu_admin')]);
  }

  const planEmoji: Record<string, string> = {
    free: '🆓', starter: '⭐', pro: '💎', agency: '🏢'
  };

  const welcomeText =
    `🏠 *ReelzFactory 메인 메뉴*\n\n` +
    `👤 ${user.display_name || '유저'}\n` +
    `📋 플랜: ${planEmoji[user.plan] || '🆓'} ${user.plan.toUpperCase()}\n` +
    `🎥 이번 달 영상: ${user.monthly_video_count}/${user.monthly_video_limit}개\n\n` +
    `원하는 메뉴를 선택하세요 👇`;

  if (ctx.callbackQuery) {
    await ctx.editMessageText(welcomeText, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons),
    });
  } else {
    await ctx.reply(welcomeText, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons),
    });
  }
}
