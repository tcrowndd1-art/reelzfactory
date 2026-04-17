import { Context, Markup } from 'telegraf';
import { getOrCreateUser, getUserChannels, getUserApiKeys, trackFeature } from '../../../../packages/shared/supabase';

// 설정 메인 메뉴
export async function showSettingsMenu(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = await getOrCreateUser(telegramId);

  const planInfo: Record<string, { name: string; emoji: string; limit: number; price: string }> = {
    free: { name: 'Free', emoji: '🆓', limit: 5, price: '$0' },
    starter: { name: 'Starter', emoji: '⭐', limit: 30, price: '$29/mo' },
    pro: { name: 'Pro', emoji: '💎', limit: 100, price: '$79/mo' },
    agency: { name: 'Agency', emoji: '🏢', limit: 9999, price: '$199/mo' },
  };

  const currentPlan = planInfo[user.plan] || planInfo.free;

  const text =
    `⚙️ *설정*\n\n` +
    `👤 *계정 정보*\n` +
    `  이름: ${user.display_name || '미설정'}\n` +
    `  텔레그램: @${user.telegram_username || '없음'}\n` +
    `  이메일: ${user.email || '미설정'}\n\n` +
    `💳 *구독 플랜*\n` +
    `  ${currentPlan.emoji} ${currentPlan.name} (${currentPlan.price})\n` +
    `  영상 한도: ${user.monthly_video_count}/${currentPlan.limit}개/월\n` +
    `  ${user.plan_expires_at ? `만료: ${new Date(user.plan_expires_at).toLocaleDateString('ko-KR')}` : ''}`;

  const buttons = [
    [Markup.button.callback('💳 플랜 업그레이드', 'settings_plan')],
    [Markup.button.callback('🔔 알림 설정', 'settings_notification')],
    [Markup.button.callback('🌐 기본 언어', 'settings_language')],
    [Markup.button.callback('🔑 API 키 관리', 'ch_apikeys')],
    [Markup.button.callback('📱 내 정보', 'settings_info')],
    [Markup.button.callback('🆘 도움말', 'settings_help')],
    [Markup.button.callback('🔙 메인 메뉴', 'menu_main')],
  ];

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons),
  });
}

// 플랜 업그레이드
export async function showPlanMenu(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = await getOrCreateUser(telegramId);

  const text =
    `💳 *플랜 선택*\n\n` +
    `현재: ${user.plan.toUpperCase()}\n\n` +
    `🆓 *Free* — $0\n` +
    `  • 영상 5개/월\n` +
    `  • 채널 1개\n` +
    `  • 기본 기능\n\n` +
    `⭐ *Starter* — $29/월\n` +
    `  • 영상 30개/월\n` +
    `  • 채널 3개\n` +
    `  • 카테고리 선택\n` +
    `  • 예약 발행\n\n` +
    `💎 *Pro* — $79/월\n` +
    `  • 영상 100개/월\n` +
    `  • 채널 5개\n` +
    `  • 시리즈/스케줄\n` +
    `  • 경쟁 분석\n` +
    `  • 우선 생성\n\n` +
    `🏢 *Agency* — $199/월\n` +
    `  • 영상 무제한\n` +
    `  • 채널 20개\n` +
    `  • 모든 기능\n` +
    `  • 전담 지원\n` +
    `  • API 접근`;

  const buttons = [
    [Markup.button.callback('⭐ Starter $29', 'plan_starter')],
    [Markup.button.callback('💎 Pro $79', 'plan_pro')],
    [Markup.button.callback('🏢 Agency $199', 'plan_agency')],
    [Markup.button.callback('🔙 설정', 'menu_settings')],
  ];

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons),
  });
}

// 플랜 선택 처리
export async function handlePlanSelect(ctx: Context, planId: string) {
  // TODO: Lemon Squeezy 결제 연동
  const planNames: Record<string, string> = {
    starter: '⭐ Starter ($29/월)',
    pro: '💎 Pro ($79/월)',
    agency: '🏢 Agency ($199/월)',
  };

  await ctx.editMessageText(
    `💳 *${planNames[planId]} 결제*\n\n` +
    `결제 시스템 준비 중입니다.\n` +
    `곧 업데이트됩니다!\n\n` +
    `결제가 연동되면:\n` +
    `• 카드 결제 (Stripe/Lemon Squeezy)\n` +
    `• 자동 플랜 활성화\n` +
    `• 월 자동 갱신`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔙 플랜 보기', 'settings_plan')],
        [Markup.button.callback('🔙 설정', 'menu_settings')],
      ]),
    }
  );
}

// 알림 설정
export async function showNotificationSettings(ctx: Context) {
  await ctx.editMessageText(
    `🔔 *알림 설정*\n\n` +
    `알림을 받을 항목을 선택하세요:\n\n` +
    `✅ 영상 제작 완료\n` +
    `✅ 발행 완료\n` +
    `✅ 에러 발생\n` +
    `✅ 새 댓글\n` +
    `✅ 일일 리포트\n\n` +
    `현재 모든 알림이 활성화되어 있습니다.`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔔 제작 완료: ON', 'notif_toggle_complete')],
        [Markup.button.callback('🔔 발행 완료: ON', 'notif_toggle_publish')],
        [Markup.button.callback('🔔 에러: ON', 'notif_toggle_error')],
        [Markup.button.callback('🔔 댓글: ON', 'notif_toggle_comment')],
        [Markup.button.callback('🔔 일일 리포트: ON', 'notif_toggle_daily')],
        [Markup.button.callback('🔙 설정', 'menu_settings')],
      ]),
    }
  );
}

// 기본 언어 설정
export async function showDefaultLanguage(ctx: Context) {
  const { LANGUAGES } = await import('./channelMenu');

  const buttons = LANGUAGES.map(l => [
    Markup.button.callback(`${l.flag} ${l.name}`, `set_default_lang_${l.id}`),
  ]);
  buttons.push([Markup.button.callback('🔙 설정', 'menu_settings')]);

  await ctx.editMessageText(
    '🌐 *기본 언어 설정*\n\n새 채널 생성 시 기본으로 적용될 언어입니다:',
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
  );
}

// 내 정보
export async function showMyInfo(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = await getOrCreateUser(telegramId);
  const channels = await getUserChannels(user.id);
  const apiKeys = await getUserApiKeys(user.id);

  const hasOpenRouter = apiKeys.find(k => k.provider === 'openrouter');
  const hasReplicate = apiKeys.find(k => k.provider === 'replicate');
  const hasGoogleTts = apiKeys.find(k => k.provider === 'google_tts');

  const text =
    `📱 *내 정보*\n\n` +
    `👤 *계정*\n` +
    `  이름: ${user.display_name || '미설정'}\n` +
    `  텔레그램: @${user.telegram_username || '없음'}\n` +
    `  ID: ${user.telegram_id}\n` +
    `  가입일: ${new Date(user.created_at).toLocaleDateString('ko-KR')}\n\n` +
    `💳 *플랜*\n` +
    `  ${user.plan.toUpperCase()}\n` +
    `  영상: ${user.monthly_video_count}/${user.monthly_video_limit}개/월\n\n` +
    `📡 *채널*\n` +
    `  등록된 채널: ${channels.length}개\n\n` +
    `🔑 *API 연동*\n` +
    `  ${hasOpenRouter ? '✅' : '❌'} OpenRouter\n` +
    `  ${hasReplicate ? '✅' : '❌'} Replicate\n` +
    `  ${hasGoogleTts ? '✅' : '❌'} Google TTS`;

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🔙 설정', 'menu_settings')],
    ]),
  });
}

// 도움말
export async function showHelp(ctx: Context) {
  const text =
    `🆘 *도움말*\n\n` +
    `*기본 명령어*\n` +
    `/start — 메인 메뉴\n` +
    `/make [주제] — 빠른 영상 생성\n` +
    `/status — 시스템 상태\n\n` +
    `*영상 제작 흐름*\n` +
    `1️⃣ 메인 메뉴 → 영상 제작\n` +
    `2️⃣ 카테고리 또는 주제 입력\n` +
    `3️⃣ AI가 대본/이미지/음성/영상 생성\n` +
    `4️⃣ YouTube에 비공개 업로드\n` +
    `5️⃣ 미리보기 후 공개 발행\n\n` +
    `*채널 설정*\n` +
    `채널 관리에서 목소리, 언어,\n` +
    `이미지 스타일 등을 설정하면\n` +
    `해당 채널의 영상에 자동 적용됩니다.\n\n` +
    `*참고자료*\n` +
    `대본 예시, 제목 레퍼런스,\n` +
    `캐릭터 이미지 등을 등록하면\n` +
    `AI가 참고해서 품질이 올라갑니다.\n\n` +
    `*문의*\n` +
    `문제가 있으면 @ReelzFactorySupport 로\n` +
    `메시지를 보내주세요.`;

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.url('📖 가이드 문서', 'https://reelzfactory.app/docs')],
      [Markup.button.url('💬 지원 채널', 'https://t.me/ReelzFactorySupport')],
      [Markup.button.callback('🔙 설정', 'menu_settings')],
    ]),
  });
}
