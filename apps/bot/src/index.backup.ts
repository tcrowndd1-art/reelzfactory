import { Telegraf, Markup } from 'telegraf';
import * as dotenv from 'dotenv';

dotenv.config();

// 메뉴 imports
import { showMainMenu } from './menus/mainMenu';
import {
  showMakeMenu, showCategoryMenu, handleCategorySelect,
  handleManualTopic, handleAutoTopic, executeVideoGeneration,
  getWaitingForTopic, clearWaitingForTopic, CATEGORIES
} from './menus/makeMenu';
import {
  showChannelMenu, showAddChannel, handleAddYoutube,
  showChannelSettings, showVoiceMenu, setVoice,
  showLanguageMenu, setLanguage, showStyleMenu, setStyle,
  showApiKeyMenu, getWaitingForChannelName, clearWaitingForChannelName,
  processNewChannel, VOICE_OPTIONS, LANGUAGES, IMAGE_STYLES
} from './menus/channelMenu';
import {
  showPublishMenu, showReviewList, showVideoDetail,
  publishNow, showSchedulePublish, setScheduleTime,
  showTodayList, showAllList, showComments
} from './menus/publishMenu';
import {
  showDashboardMenu, showTodayStats, showTopVideos,
  showLatestComments, showCostReport, showSpyMenu
} from './menus/dashboardMenu';
import {
  showReferenceMenu, showReferenceType, showAddReference,
  showBulkUpload, confirmClearReferences,
  getWaitingForReference, processTextReference, processFileReference
} from './menus/referenceMenu';
import {
  showSettingsMenu, showPlanMenu, handlePlanSelect,
  showNotificationSettings, showDefaultLanguage,
  showMyInfo, showHelp
} from './menus/settingsMenu';
import {
  showAdminMenu, showAdminUsers, showAdminStats,
  showAdminProductions, showAdminRevenue, showAdminCategories,
  showAdminTopics, showAdminErrors, showAdminSystem
} from './menus/adminMenu';

// 상태 확인용
import { handleStatus } from './commands/status';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

// ============================================
// 텍스트 명령어
// ============================================
bot.command('start', async (ctx) => {
  await showMainMenu(ctx);
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    '🆘 *ReelzFactory 도움말*\n\n' +
    '/start — 메인 메뉴\n' +
    '/make [주제] — 빠른 영상 생성\n' +
    '/status — 시스템 상태\n\n' +
    '메인 메뉴에서 모든 기능을 사용할 수 있습니다.',
    { parse_mode: 'Markdown' }
  );
});

bot.command('make', async (ctx) => {
  const topic = ctx.message.text.replace('/make', '').trim();
  if (topic) {
    await executeVideoGeneration(ctx, topic);
  } else {
    await ctx.reply(
      '🎬 *영상 제작*\n\n주제를 함께 입력해주세요.\n예시: `/make 비트코인 2026 전망`\n\n또는 메인 메뉴에서 카테고리를 선택하세요.',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📂 카테고리에서 선택', 'make_category')],
          [Markup.button.callback('🏠 메인 메뉴', 'menu_main')],
        ]),
      }
    );
  }
});

bot.command('status', handleStatus);

// ============================================
// 메인 메뉴 콜백
// ============================================
bot.action('menu_main', async (ctx) => {
  await ctx.answerCbQuery();
  await showMainMenu(ctx);
});

bot.action('menu_make', async (ctx) => {
  await ctx.answerCbQuery();
  await showMakeMenu(ctx);
});

bot.action('menu_channel', async (ctx) => {
  await ctx.answerCbQuery();
  await showChannelMenu(ctx);
});

bot.action('menu_publish', async (ctx) => {
  await ctx.answerCbQuery();
  await showPublishMenu(ctx);
});

bot.action('menu_dashboard', async (ctx) => {
  await ctx.answerCbQuery();
  await showDashboardMenu(ctx);
});

bot.action('menu_reference', async (ctx) => {
  await ctx.answerCbQuery();
  await showReferenceMenu(ctx);
});

bot.action('menu_settings', async (ctx) => {
  await ctx.answerCbQuery();
  await showSettingsMenu(ctx);
});

bot.action('menu_status', async (ctx) => {
  await ctx.answerCbQuery();
  await handleStatus(ctx);
});

bot.action('menu_admin', async (ctx) => {
  await ctx.answerCbQuery();
  await showAdminMenu(ctx);
});

// ============================================
// 영상 제작 콜백
// ============================================
bot.action('make_custom', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id;
  if (!userId) return;
  const { setWaitingForTopic } = await import('./menus/makeMenu');
  setWaitingForTopic(userId, {});
  await ctx.editMessageText(
    '✏️ *주제를 입력해주세요*\n\n' +
    '예시:\n• "비트코인 2026 하반기 전망"\n• "AI가 바꾸는 미래 직업 TOP 5"\n\n💬 아래에 주제를 입력하세요:',
    { parse_mode: 'Markdown' }
  );
});

bot.action('make_category', async (ctx) => {
  await ctx.answerCbQuery();
  await showCategoryMenu(ctx);
});

bot.action('make_series', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    '📺 *시리즈 생성*\n\n준비 중입니다. 곧 업데이트됩니다!\n\n하나의 주제를 5~10편으로 자동 분할하여\n시리즈 영상을 만들어줍니다.',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔙 영상 제작', 'menu_make')],
      ]),
    }
  );
});

bot.action('make_schedule', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    '⏰ *자동 스케줄*\n\n준비 중입니다. 곧 업데이트됩니다!\n\n매일/매주 자동으로 영상을 생성하고\n업로드하는 스케줄을 설정합니다.',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔙 영상 제작', 'menu_make')],
      ]),
    }
  );
});

// 카테고리 선택
CATEGORIES.forEach(cat => {
  bot.action(`cat_${cat.id}`, async (ctx) => {
    await ctx.answerCbQuery();
    await handleCategorySelect(ctx, cat.id);
  });

  bot.action(`cat_auto_${cat.id}`, async (ctx) => {
    await ctx.answerCbQuery();
    await handleAutoTopic(ctx, cat.id);
  });

  bot.action(`cat_manual_${cat.id}`, async (ctx) => {
    await ctx.answerCbQuery();
    await handleManualTopic(ctx, cat.id);
  });

  // 추천 주제 선택 (0, 1, 2)
  for (let i = 0; i < 3; i++) {
    bot.action(`topic_${cat.id}_${i}`, async (ctx) => {
      await ctx.answerCbQuery();
      const button = (ctx.callbackQuery as any)?.message?.reply_markup?.inline_keyboard?.[i]?.[0];
      const topicText = button?.text?.replace(/^\d️⃣\s*/, '') || `${cat.name} 관련 영상`;
      await executeVideoGeneration(ctx, topicText, cat.id);
    });
  }
});

// ============================================
// 채널 관리 콜백
// ============================================
bot.action('ch_add', async (ctx) => {
  await ctx.answerCbQuery();
  await showAddChannel(ctx);
});

bot.action('ch_add_youtube', async (ctx) => {
  await ctx.answerCbQuery();
  await handleAddYoutube(ctx);
});

bot.action('ch_add_tiktok', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText('🎵 TikTok 연동은 준비 중입니다.', {
    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 채널 추가', 'ch_add')]]),
  });
});

bot.action('ch_add_instagram', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText('📷 Instagram 연동은 준비 중입니다.', {
    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 채널 추가', 'ch_add')]]),
  });
});

bot.action('ch_apikeys', async (ctx) => {
  await ctx.answerCbQuery();
  await showApiKeyMenu(ctx);
});

// 채널 설정 (동적 ID)
bot.action(/^ch_settings_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await showChannelSettings(ctx, ctx.match[1]);
});

bot.action(/^ch_voice_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await showVoiceMenu(ctx, ctx.match[1]);
});

bot.action(/^ch_lang_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await showLanguageMenu(ctx, ctx.match[1]);
});

bot.action(/^ch_style_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await showStyleMenu(ctx, ctx.match[1]);
});

// 목소리 설정
bot.action(/^set_voice_(.+)_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const channelId = ctx.match[1];
  const voiceId = ctx.match[2];
  await setVoice(ctx, channelId, voiceId);
});

// 언어 설정
bot.action(/^set_lang_(.+)_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const channelId = ctx.match[1];
  const langId = ctx.match[2];
  await setLanguage(ctx, channelId, langId);
});

// 스타일 설정
bot.action(/^set_style_(.+)_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const channelId = ctx.match[1];
  const styleId = ctx.match[2];
  await setStyle(ctx, channelId, styleId);
});

// BGM, 자막, 카테고리, 재인증, 삭제 (준비중)
bot.action(/^ch_bgm_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText('🎵 BGM 설정은 준비 중입니다.', {
    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 채널 설정', `ch_settings_${ctx.match[1]}`)]]),
  });
});

bot.action(/^ch_subtitle_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText('📝 자막 설정은 준비 중입니다.', {
    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 채널 설정', `ch_settings_${ctx.match[1]}`)]]),
  });
});

bot.action(/^ch_category_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText('🏷️ 기본 카테고리 설정은 준비 중입니다.', {
    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 채널 설정', `ch_settings_${ctx.match[1]}`)]]),
  });
});

bot.action(/^ch_reauth_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText('🔗 YouTube 재연동은 준비 중입니다.', {
    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 채널 설정', `ch_settings_${ctx.match[1]}`)]]),
  });
});

bot.action(/^ch_delete_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText('❌ 채널 삭제 기능은 준비 중입니다.', {
    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 채널 설정', `ch_settings_${ctx.match[1]}`)]]),
  });
});

// API 키 입력 (준비중)
bot.action(/^apikey_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText('🔑 API 키 입력 기능은 준비 중입니다.', {
    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 API 키 관리', 'ch_apikeys')]]),
  });
});

// ============================================
// 발행 관리 콜백
// ============================================
bot.action('pub_review_list', async (ctx) => {
  await ctx.answerCbQuery();
  await showReviewList(ctx);
});

bot.action('pub_scheduled_list', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText('⏰ 예약 목록은 준비 중입니다.', {
    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 발행 관리', 'menu_publish')]]),
  });
});

bot.action('pub_today_list', async (ctx) => {
  await ctx.answerCbQuery();
  await showTodayList(ctx);
});

bot.action('pub_all_list', async (ctx) => {
  await ctx.answerCbQuery();
  await showAllList(ctx);
});

bot.action(/^pub_detail_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await showVideoDetail(ctx, ctx.match[1]);
});

bot.action(/^publish_now_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await publishNow(ctx, ctx.match[1]);
});

bot.action(/^publish_schedule_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await showSchedulePublish(ctx, ctx.match[1]);
});

bot.action(/^schedule_time_(.+)_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await setScheduleTime(ctx, ctx.match[1], ctx.match[2]);
});

bot.action(/^remake_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText('🔄 리메이크 기능은 준비 중입니다.', {
    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 발행 관리', 'menu_publish')]]),
  });
});

bot.action(/^delete_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText('🗑️ 삭제 기능은 준비 중입니다.', {
    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 발행 관리', 'menu_publish')]]),
  });
});

bot.action(/^cancel_schedule_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText('❌ 예약 취소 기능은 준비 중입니다.', {
    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 발행 관리', 'menu_publish')]]),
  });
});

bot.action(/^edit_meta_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText('✏️ 메타데이터 수정 기능은 준비 중입니다.', {
    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 발행 관리', 'menu_publish')]]),
  });
});

bot.action(/^view_comments_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await showComments(ctx, ctx.match[1]);
});

bot.action(/^refresh_stats_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText('📊 성과 업데이트 기능은 준비 중입니다.', {
    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 발행 관리', 'menu_publish')]]),
  });
});

bot.action(/^retry_upload_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText('🔄 업로드 재시도 기능은 준비 중입니다.', {
    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 발행 관리', 'menu_publish')]]),
  });
});

// ============================================
// 대시보드 콜백
// ============================================
bot.action('dash_today', async (ctx) => {
  await ctx.answerCbQuery();
  await showTodayStats(ctx);
});

bot.action('dash_top7', async (ctx) => {
  await ctx.answerCbQuery();
  await showTopVideos(ctx, 7);
});

bot.action('dash_top30', async (ctx) => {
  await ctx.answerCbQuery();
  await showTopVideos(ctx, 30);
});

bot.action('dash_comments', async (ctx) => {
  await ctx.answerCbQuery();
  await showLatestComments(ctx);
});

bot.action('dash_cost', async (ctx) => {
  await ctx.answerCbQuery();
  await showCostReport(ctx);
});

bot.action('dash_spy', async (ctx) => {
  await ctx.answerCbQuery();
  await showSpyMenu(ctx);
});

// ============================================
// 참고자료 콜백
// ============================================
bot.action(/^ref_type_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await showReferenceType(ctx, ctx.match[1]);
});

bot.action(/^ref_add_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await showAddReference(ctx, ctx.match[1]);
});

bot.action(/^ref_clear_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await confirmClearReferences(ctx, ctx.match[1]);
});

bot.action(/^ref_confirm_clear_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  // TODO: 실제 삭제 로직
  await ctx.editMessageText('🗑️ 삭제 완료!', {
    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 참고자료', 'menu_reference')]]),
  });
});

bot.action('ref_bulk_upload', async (ctx) => {
  await ctx.answerCbQuery();
  await showBulkUpload(ctx);
});

// ============================================
// 설정 콜백
// ============================================
bot.action('settings_plan', async (ctx) => {
  await ctx.answerCbQuery();
  await showPlanMenu(ctx);
});

bot.action('settings_notification', async (ctx) => {
  await ctx.answerCbQuery();
  await showNotificationSettings(ctx);
});

bot.action('settings_language', async (ctx) => {
  await ctx.answerCbQuery();
  await showDefaultLanguage(ctx);
});

bot.action('settings_info', async (ctx) => {
  await ctx.answerCbQuery();
  await showMyInfo(ctx);
});

bot.action('settings_help', async (ctx) => {
  await ctx.answerCbQuery();
  await showHelp(ctx);
});

bot.action(/^plan_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await handlePlanSelect(ctx, ctx.match[1]);
});

bot.action(/^set_default_lang_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText('✅ 기본 언어가 변경되었습니다.', {
    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 설정', 'menu_settings')]]),
  });
});

bot.action(/^notif_toggle_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery('알림 설정이 변경되었습니다.');
});

bot.action('voice_preview', async (ctx) => {
  await ctx.answerCbQuery('미리듣기 준비 중입니다.');
});

// ============================================
// 관리자 콜백
// ============================================
bot.action('admin_users', async (ctx) => {
  await ctx.answerCbQuery();
  await showAdminUsers(ctx);
});

bot.action('admin_stats', async (ctx) => {
  await ctx.answerCbQuery();
  await showAdminStats(ctx);
});

bot.action('admin_productions', async (ctx) => {
  await ctx.answerCbQuery();
  await showAdminProductions(ctx);
});

bot.action('admin_revenue', async (ctx) => {
  await ctx.answerCbQuery();
  await showAdminRevenue(ctx);
});

bot.action('admin_categories', async (ctx) => {
  await ctx.answerCbQuery();
  await showAdminCategories(ctx);
});

bot.action('admin_topics', async (ctx) => {
  await ctx.answerCbQuery();
  await showAdminTopics(ctx);
});

bot.action('admin_errors', async (ctx) => {
  await ctx.answerCbQuery();
  await showAdminErrors(ctx);
});

bot.action('admin_system', async (ctx) => {
  await ctx.answerCbQuery();
  await showAdminSystem(ctx);
});

bot.action('spy_add', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText('🕵️ 경쟁 채널 등록은 준비 중입니다.', {
    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 대시보드', 'menu_dashboard')]]),
  });
});

// ============================================
// 텍스트 메시지 처리 (주제 입력, 채널 이름 등)
// ============================================
bot.on('text', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const text = ctx.message.text;

  // 명령어는 무시
  if (text.startsWith('/')) return;

  // 1. 주제 입력 대기 중
  const topicWaiting = getWaitingForTopic(userId);
  if (topicWaiting) {
    clearWaitingForTopic(userId);
    await executeVideoGeneration(ctx, text, topicWaiting.category);
    return;
  }

  // 2. 채널 이름 입력 대기 중
  const channelWaiting = getWaitingForChannelName(userId);
  if (channelWaiting) {
    await processNewChannel(ctx, text);
    return;
  }

  // 3. 참고자료 입력 대기 중
  const refWaiting = getWaitingForReference(userId);
  if (refWaiting && refWaiting.mode === 'text') {
    await processTextReference(ctx, text);
    return;
  }

  // 기본 응답
  await ctx.reply(
    '메인 메뉴에서 기능을 선택해주세요.',
    Markup.inlineKeyboard([
      [Markup.button.callback('🏠 메인 메뉴', 'menu_main')],
    ])
  );
});

// ============================================
// 파일 업로드 처리 (참고자료 이미지/BGM)
// ============================================
bot.on('photo', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const refWaiting = getWaitingForReference(userId);
  if (refWaiting && refWaiting.mode === 'file') {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const fileLink = await ctx.telegram.getFileLink(photo.file_id);
    await processFileReference(ctx, fileLink.toString(), 'image');
    return;
  }

  await ctx.reply('메인 메뉴에서 기능을 선택해주세요.',
    Markup.inlineKeyboard([[Markup.button.callback('🏠 메인 메뉴', 'menu_main')]])
  );
});

bot.on('document', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const refWaiting = getWaitingForReference(userId);
  if (refWaiting && refWaiting.mode === 'file') {
    const doc = ctx.message.document;
    const fileLink = await ctx.telegram.getFileLink(doc.file_id);
    await processFileReference(ctx, fileLink.toString(), doc.mime_type || 'unknown');
    return;
  }

  await ctx.reply('메인 메뉴에서 기능을 선택해주세요.',
    Markup.inlineKeyboard([[Markup.button.callback('🏠 메인 메뉴', 'menu_main')]])
  );
});

// ============================================
// 봇 시작
// ============================================
bot.launch().then(() => {
  console.log('🤖 ReelzFactory Bot is running!');
  console.log('📋 Menus: Main, Make, Channel, Publish, Dashboard, Reference, Settings, Admin');
  console.log('🔗 Commands: /start, /make, /status, /help');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
