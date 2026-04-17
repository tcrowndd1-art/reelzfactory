import { showShoppingMenu, handleShopVideoLink, handleShopProductLink, handleShopManual, handleShopLangSelect, handleShoppingMessage } from './menus/shoppingMenu';
import 'dotenv/config';
import { Telegraf, Markup } from 'telegraf';
import { showMainMenu } from './menus/mainMenu';
import { showReferenceMenu, showReferenceType, showAddReference, processTextReference, processFileReference } from './menus/referenceMenu';
import {
  showMakeMenu, showCategoryMenu, handleCategorySelect,
  handleManualTopic, handleAutoTopic, executeVideoGeneration, suggestedTopicCache,
  getWaitingForTopic, clearWaitingForTopic,
    showTrendMenu, handleTrendAnalysis
} from './menus/makeMenu';
import {
  showChannelMenu, showAddChannel, handleAddYoutube,
  showChannelSettings, showVoiceMenu, showLanguageMenu,
  showStyleMenu, showApiKeyMenu, setVoice, setLanguage, setStyle
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
  showSettingsMenu, showPlanMenu, handlePlanSelect,
  showNotificationSettings, showDefaultLanguage, showMyInfo, showHelp
} from './menus/settingsMenu';
import {
  showAdminMenu, showAdminUsers, showAdminStats,
  showAdminProductions, showAdminRevenue, showAdminCategories,
  showAdminTopics, showAdminErrors, showAdminSystem
} from './menus/adminMenu';
import { handleStatus } from './commands/status';
console.log('📦 모든 import 완료');
console.log('🔥 Starting bot...');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!, {
  handlerTimeout: 600_000,
});
const UPLOAD_BASE_URL = process.env.UPLOAD_PAGE_URL || 'http://localhost:3000';

// ============ COMMANDS ============
bot.command('start', (ctx) => showMainMenu(ctx));
bot.command('help', (ctx) => showHelp(ctx));
bot.command('make', async (ctx) => {
  const text = ctx.message?.text ?? '';
  const topic = text.replace('/make', '').trim();
  if (topic) {
    await executeVideoGeneration(ctx, topic);
  } else {
    showMakeMenu(ctx);
  }
});
bot.command('status', (ctx) => handleStatus(ctx));
bot.command('voice', (ctx) => { showVoiceMenu(ctx, 'default'); });
bot.command('lang', (ctx) => { showLanguageMenu(ctx, 'default'); });
bot.command('channel', (ctx) => { showChannelMenu(ctx); });

// ============ MAIN MENU ============
bot.action('main_menu', (ctx) => { ctx.answerCbQuery(); showMainMenu(ctx); });
bot.action('menu_make', (ctx) => { ctx.answerCbQuery(); showMakeMenu(ctx); });
bot.action('menu_channel', (ctx) => { ctx.answerCbQuery(); showChannelMenu(ctx); });
bot.action('menu_benchmark', async (ctx) => {
  ctx.answerCbQuery();
  const { setWaitingForReference } = await import('./menus/referenceMenu');
  setWaitingForReference(ctx.from!.id, { type: 'benchmark_video', mode: 'text' });
  await ctx.editMessageText(
    '🎯 *벤치마킹*\n\n' +
    '분석할 YouTube/TikTok 영상 링크를 보내주세요!\n\n' +
    'AI가 영상 구조를 분석하고\n동일 구조로 새 영상을 만들어드립니다.\n\n' +
    '📎 링크를 그대로 붙여넣으세요.\n"취소" 입력시 취소됩니다.',
    { parse_mode: 'Markdown' }
  );
});

// ============ SHOPPING SHORTS ============
bot.action('menu_shopping', (ctx) => { ctx.answerCbQuery(); showShoppingMenu(ctx); });
bot.action('shop_video_link', (ctx) => handleShopVideoLink(ctx));
bot.action('shop_product_link', (ctx) => handleShopProductLink(ctx));
bot.action('shop_manual', (ctx) => handleShopManual(ctx));
bot.action(/^shop_lang_(.+)_(.+)$/, (ctx) => {
  const mode = ctx.match[1];
  const lang = ctx.match[2];
  handleShopLangSelect(ctx, mode, lang);
});


bot.action('menu_dashboard', (ctx) => { ctx.answerCbQuery(); showDashboardMenu(ctx); });
bot.action('menu_reference', (ctx) => { ctx.answerCbQuery(); showReferenceMenu(ctx); });
bot.action('menu_settings', (ctx) => { ctx.answerCbQuery(); showSettingsMenu(ctx); });
bot.action('menu_status', (ctx) => { ctx.answerCbQuery(); handleStatus(ctx); });
bot.action('menu_admin', (ctx) => { ctx.answerCbQuery(); showAdminMenu(ctx); });
bot.action('menu_main', (ctx) => { ctx.answerCbQuery(); showMainMenu(ctx); });

// ============ MAKE MENU ============
bot.action('make_custom', (ctx) => { ctx.answerCbQuery(); handleManualTopic(ctx, 'default'); });
bot.action('make_category', (ctx) => { ctx.answerCbQuery(); showCategoryMenu(ctx); });
bot.action('make_series', (ctx) => { ctx.answerCbQuery(); ctx.editMessageText('🔄 시리즈 기능 준비중...'); });
bot.action('make_trend', (ctx) => { ctx.answerCbQuery(); showTrendMenu(ctx); });
bot.action(/^trend_(?!topic)(.+)$/, (ctx) => { ctx.answerCbQuery(); handleTrendAnalysis(ctx, ctx.match[1]); });
bot.action(/^trend_topic_(.+)_(\d+)$/, (ctx) => { ctx.answerCbQuery(); const topics = (ctx as any).session?.trendTopics || []; const topic = topics[parseInt(ctx.match[2])] || '트렌드 토픽'; executeVideoGeneration(ctx, topic, ctx.match[1]).catch(e => console.error('영상생성 에러:', e)); });bot.action('make_schedule', (ctx) => { ctx.answerCbQuery(); ctx.editMessageText('⏰ 스케줄 기능 준비중...'); });
bot.action(/^cat_auto_(.+)$/, (ctx) => { ctx.answerCbQuery(); handleAutoTopic(ctx, ctx.match[1]); });
bot.action(/^cat_manual_(.+)$/, (ctx) => { ctx.answerCbQuery(); handleManualTopic(ctx, ctx.match[1]); });
bot.action(/^cat_(.+)$/, (ctx) => { ctx.answerCbQuery(); handleCategorySelect(ctx, ctx.match[1]); });
bot.action(/^stopic_([^_]+)_(\d+)$/, (ctx) => { ctx.answerCbQuery(); const topics = suggestedTopicCache.get(ctx.from!.id) || []; const topic = topics[parseInt(ctx.match[2])]; if (topic) executeVideoGeneration(ctx, topic, ctx.match[1]).catch(e => console.error('영상생성 에러:', e)); });
bot.action(/^topic_([^_]+)_(.+)$/, (ctx) => { ctx.answerCbQuery(); executeVideoGeneration(ctx, decodeURIComponent(ctx.match[2]), ctx.match[1]).catch(e => console.error('영상생성 에러:', e)); });
// ============ CHANNEL MENU ============
bot.action('ch_add', (ctx) => { ctx.answerCbQuery(); showAddChannel(ctx); });
bot.action('ch_add_youtube', (ctx) => { ctx.answerCbQuery(); handleAddYoutube(ctx); });
bot.action('ch_add_tiktok', (ctx) => { ctx.answerCbQuery(); ctx.editMessageText('🔜 TikTok 연동 준비중...'); });
bot.action('ch_add_instagram', (ctx) => { ctx.answerCbQuery(); ctx.editMessageText('🔜 Instagram 연동 준비중...'); });
bot.action(/^ch_settings_(.+)$/, (ctx) => { ctx.answerCbQuery(); showChannelSettings(ctx, ctx.match[1]); });
bot.action(/^ch_voice_(.+)$/, (ctx) => { ctx.answerCbQuery(); showVoiceMenu(ctx, ctx.match[1]); });
bot.action(/^ch_lang_(.+)$/, (ctx) => { ctx.answerCbQuery(); showLanguageMenu(ctx, ctx.match[1]); });
bot.action(/^ch_style_(.+)$/, (ctx) => { ctx.answerCbQuery(); showStyleMenu(ctx, ctx.match[1]); });
bot.action(/^set_voice_(.+)__(.+)$/, (ctx) => { ctx.answerCbQuery(); setVoice(ctx, ctx.match[1], ctx.match[2]); });
bot.action(/^set_lang_(.+)__(.+)$/, (ctx) => { ctx.answerCbQuery(); setLanguage(ctx, ctx.match[1], ctx.match[2]); });
bot.action(/^set_style_(.+)__(.+)$/, (ctx) => { ctx.answerCbQuery(); setStyle(ctx, ctx.match[1], ctx.match[2]); });
bot.action('ch_apikeys', (ctx) => { ctx.answerCbQuery(); showApiKeyMenu(ctx); });

// ============ PUBLISH MENU ============
bot.action('publish_review', (ctx) => { ctx.answerCbQuery(); showReviewList(ctx); });
bot.action('publish_today', (ctx) => { ctx.answerCbQuery(); showTodayList(ctx); });
bot.action('publish_all', (ctx) => { ctx.answerCbQuery(); showAllList(ctx); });
bot.action(/^pub_detail_(.+)$/, (ctx) => { ctx.answerCbQuery(); showVideoDetail(ctx, ctx.match[1]); });
bot.action(/^publish_now_(.+)$/, (ctx) => { ctx.answerCbQuery(); publishNow(ctx, ctx.match[1]); });
bot.action(/^publish_schedule_(.+)$/, (ctx) => { ctx.answerCbQuery(); showSchedulePublish(ctx, ctx.match[1]); });
bot.action(/^schedule_time_(.+)_(\d+)$/, (ctx) => { ctx.answerCbQuery(); setScheduleTime(ctx, ctx.match[1], ctx.match[2]); });
bot.action(/^schedule_time_(.+)_(tomorrow\d+)$/, (ctx) => { ctx.answerCbQuery(); setScheduleTime(ctx, ctx.match[1], ctx.match[2]); });
bot.action(/^cancel_schedule_(.+)$/, (ctx) => { ctx.answerCbQuery(); ctx.editMessageText('예약이 취소되었습니다.'); });
bot.action(/^refresh_stats_(.+)$/, (ctx) => { ctx.answerCbQuery(); showVideoDetail(ctx, ctx.match[1]); });
bot.action(/^remake_(.+)$/, (ctx) => { ctx.answerCbQuery(); ctx.editMessageText('🔄 리메이크 기능 준비중...'); });
bot.action(/^delete_(.+)$/, (ctx) => { ctx.answerCbQuery(); ctx.editMessageText('🗑️ 삭제 기능 준비중...'); });
bot.action(/^retry_upload_(.+)$/, (ctx) => { ctx.answerCbQuery(); ctx.editMessageText('🔄 재업로드 준비중...'); });
bot.action(/^comments_(.+)$/, (ctx) => { ctx.answerCbQuery(); showComments(ctx, ctx.match[1]); });

// ============ DASHBOARD ============
bot.action('dash_today', (ctx) => { ctx.answerCbQuery(); showTodayStats(ctx); });
bot.action('dash_top7', (ctx) => { ctx.answerCbQuery(); showTopVideos(ctx, 7); });
bot.action('dash_top30', (ctx) => { ctx.answerCbQuery(); showTopVideos(ctx, 30); });
bot.action('dash_comments', (ctx) => { ctx.answerCbQuery(); showLatestComments(ctx); });
bot.action('dash_cost', (ctx) => { ctx.answerCbQuery(); showCostReport(ctx); });
bot.action('dash_spy', (ctx) => { ctx.answerCbQuery(); showSpyMenu(ctx); });
bot.action('spy_add', (ctx) => { ctx.answerCbQuery(); ctx.editMessageText('🕵️ 경쟁 채널 분석 준비중...'); });

// ============ REFERENCE ============
bot.action(/^ref_type_(.+)$/, (ctx) => { ctx.answerCbQuery(); handleReferenceType(ctx, ctx.match[1]); });
bot.action(/^ref_add_(.+)$/, (ctx) => { ctx.answerCbQuery(); handleAddRef(ctx, ctx.match[1]); });
bot.action(/^ref_clear_(.+)$/, (ctx) => { ctx.answerCbQuery(); handleClearRef(ctx, ctx.match[1]); });
bot.action('ref_bulk', (ctx) => { ctx.answerCbQuery(); handleBulkUpload(ctx); });

// ============ SETTINGS ============
bot.action('settings_plan', (ctx) => { ctx.answerCbQuery(); showPlanMenu(ctx); });
bot.action(/^select_plan_(.+)$/, (ctx) => { ctx.answerCbQuery(); handlePlanSelect(ctx, ctx.match[1]); });
bot.action('settings_notifications', (ctx) => { ctx.answerCbQuery(); showNotificationSettings(ctx); });
bot.action('settings_language', (ctx) => { ctx.answerCbQuery(); showDefaultLanguage(ctx); });
bot.action('settings_info', (ctx) => { ctx.answerCbQuery(); showMyInfo(ctx); });
bot.action('settings_help', (ctx) => { ctx.answerCbQuery(); showHelp(ctx); });

// ============ ADMIN ============
bot.action('admin_menu', (ctx) => { ctx.answerCbQuery(); showAdminMenu(ctx); });
bot.action('admin_users', (ctx) => { ctx.answerCbQuery(); showAdminUsers(ctx); });
bot.action('admin_stats', (ctx) => { ctx.answerCbQuery(); showAdminStats(ctx); });
bot.action('admin_productions', (ctx) => { ctx.answerCbQuery(); showAdminProductions(ctx); });
bot.action('admin_revenue', (ctx) => { ctx.answerCbQuery(); showAdminRevenue(ctx); });
bot.action('admin_categories', (ctx) => { ctx.answerCbQuery(); showAdminCategories(ctx); });
bot.action('admin_topics', (ctx) => { ctx.answerCbQuery(); showAdminTopics(ctx); });
bot.action('admin_errors', (ctx) => { ctx.answerCbQuery(); showAdminErrors(ctx); });
bot.action('admin_system', (ctx) => { ctx.answerCbQuery(); showAdminSystem(ctx); });
// ============ BENCHMARK HANDLERS ============
bot.action(/^bench_make_(.+)$/, async (ctx) => {
  ctx.answerCbQuery();
  const { getOrCreateUser, getReferences } = await import('../../../packages/shared/supabase');
  const user = await getOrCreateUser(ctx.from!.id);
  const benchRefs = await getReferences(user.id, 'benchmark_video');
  if (benchRefs.length === 0) {
    await ctx.editMessageText('❌ 벤치마킹 데이터가 없습니다. 먼저 영상 링크를 분석해주세요.');
    return;
  }
  const knowledgeBase = benchRefs[0].content;
  const { runFullPipeline } = await import('../../../packages/pipeline/src/fullPipeline');
  await ctx.editMessageText('🎬 *벤치마킹 구조로 영상 제작 시작!*\n\n⏳ 3~5분 소요...', { parse_mode: 'Markdown' });
  try {
    const result = await runFullPipeline({
      topic: '벤치마킹 기반 자동 주제',
      category: 'general',
      userId: String(ctx.from!.id),
      knowledgeBase,
    });
    await ctx.reply(
      `✅ *영상 제작 완료!*\n\n📁 ${result.videoPath}\n⏱️ ${result.totalDuration?.toFixed(1)}초`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {
    console.error('벤치마킹 영상 제작 실패:', e);
    await ctx.reply('❌ 영상 제작에 실패했습니다.');
  }
});

bot.action(/^bench_lang_(.+)$/, async (ctx) => {
  ctx.answerCbQuery();
  const langButtons = [
    [{ text: '🇰🇷 한국어', callback_data: 'bench_run_ko' }],
    [{ text: '🇺🇸 English', callback_data: 'bench_run_en' }],
    [{ text: '🇧🇷 Português', callback_data: 'bench_run_pt' }],
    [{ text: '🇪🇸 Español', callback_data: 'bench_run_es' }],
    [{ text: '🇯🇵 日本語', callback_data: 'bench_run_ja' }],
    [{ text: '🔙 뒤로', callback_data: 'menu_reference' }],
  ];
  await ctx.editMessageText('🌐 어떤 언어로 영상을 만들까요?', {
    reply_markup: { inline_keyboard: langButtons },
  });
});

bot.action(/^bench_run_(.+)$/, async (ctx) => {
  ctx.answerCbQuery();
  const lang = ctx.match[1];
  const langNames: Record<string, string> = { ko: '한국어', en: 'English', pt: 'Português', es: 'Español', ja: '日本語' };
  const { getOrCreateUser, getReferences } = await import('../../../packages/shared/supabase');
  const user = await getOrCreateUser(ctx.from!.id);
  const benchRefs = await getReferences(user.id, 'benchmark_video');
  if (benchRefs.length === 0) {
    await ctx.editMessageText('❌ 벤치마킹 데이터가 없습니다.');
    return;
  }
  const knowledgeBase = benchRefs[0].content;
  const { runFullPipeline } = await import('../../../packages/pipeline/src/fullPipeline');
  await ctx.editMessageText(`🎬 *${langNames[lang] || lang}로 영상 제작 시작!*\n\n⏳ 3~5분 소요...`, { parse_mode: 'Markdown' });
  try {
        // 원본 영상 길이에서 maxScenes 자동 계산
    const durationMatch = knowledgeBase.match(/길이:\s*(\d+)초/);
    const originalDuration = durationMatch ? parseInt(durationMatch[1]) : 60;
    const maxScenes = originalDuration > 120
      ? Math.min(Math.ceil(originalDuration / 10), 80)
      : 5;

    const result = await runFullPipeline({
      topic: '벤치마킹 기반 자동 주제',
      category: 'general',
      language: lang,
      userId: String(ctx.from!.id),
      knowledgeBase,
      maxScenes,
    });
    const safePath = result.videoPath.replace(/\\/g, '/');
    await ctx.reply(
      `✅ ${langNames[lang]} 영상 제작 완료!\n\n` +
      `📁 파일: ${safePath}\n` +
      `⏱️ 길이: ${result.totalDuration?.toFixed(1)}초\n` +
      `🎬 씬: ${maxScenes}개 (${originalDuration > 120 ? '롱폼' : '숏폼'})\n` +
      `🌐 언어: ${langNames[lang]}`
    );


  } catch (e) {
    console.error('벤치마킹 영상 제작 실패:', e);
    await ctx.reply('❌ 영상 제작에 실패했습니다.');
  }
});


// ============ LANGUAGE SETTING ============
bot.action(/^set_default_lang_(.+)$/, async (ctx) => {
  ctx.answerCbQuery();
  const lang = ctx.match[1];
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const user = await getOrCreateUser(ctx.from!.id);
  await supabase.from('users').update({ default_language: lang }).eq('id', user.id);
  const langNames: Record<string, string> = { ko: '한국어', pt: 'Português', es: 'Español', ja: '日本語', en: 'English' };
  await ctx.editMessageText('✅ 기본 언어가 ' + (langNames[lang] || lang) + '(으)로 변경되었습니다.');
});


// ============ TEXT INPUT (주제 입력 수신) ============
// ============ PHOTO HANDLER ============
bot.on('photo', async (ctx) => {
  console.log('📸 사진 수신');
  const handled = await handleShoppingMessage(ctx);
  if (handled) return;
  await ctx.reply('📸 사진을 받았지만 처리할 작업이 없습니다.');
});

bot.on('text', async (ctx) => {
  console.log('📨 텍스트 수신:', ctx.message.text);
  const userId = ctx.from?.id;
  if (!userId) return;
  
      // 쇼핑 쇼츠 메시지 체크
  const handled = await handleShoppingMessage(ctx);
  if (handled) return;

  // 벤치마킹 링크 체크
  const { getWaitingForReference, clearWaitingForReference } = await import('./menus/referenceMenu');
  const refWaiting = getWaitingForReference(userId);
  console.log('🔍 벤치마킹 대기:', refWaiting, '유저:', userId);

    if (refWaiting && refWaiting.type === 'benchmark_video') {
    const text = ctx.message.text.trim();
    if (text === '취소' || text === 'cancel') {
      clearWaitingForReference(userId);
      await ctx.reply('✅ 벤치마킹이 취소되었습니다.');
      return;
    }
      console.log('🎯 벤치마킹 processTextReference 호출 시작');

    try {
      await processTextReference(ctx, text);
      console.log('🎯 벤치마킹 processTextReference 완료');
    } catch (e) {
      console.error('🎯 벤치마킹 에러:', e);
      await ctx.reply('❌ 벤치마킹 처리 중 에러가 발생했습니다.');
    }
    return;
  }




  const waiting = getWaitingForTopic(userId);
  if (!waiting) return;

  
  const topic = ctx.message.text.trim();
  if (!topic) return;
  
  console.log(`📝 주제 입력: "${topic}" (카테고리: ${waiting.category})`);
  clearWaitingForTopic(userId);
  
  executeVideoGeneration(ctx, topic, waiting.category).catch(e => console.error('영상생성 에러:', e));
});

// ============ REFERENCE HANDLERS (로컬용 - 링크 텍스트 전송) ============
function handleReferenceMenu(ctx: any) {
  ctx.editMessageText(
    '📚 참고자료 관리\n\n' +
    '업로드한 참고자료는 AI가 영상 제작할 때 자동으로 참고합니다.\n\n' +
    '📝 대본 참고자료 - 스타일 가이드, 훅 모음\n' +
    '🖼️ 이미지 - 캐릭터, 썸네일 레퍼런스\n' +
    '🎵 BGM - 배경음악 파일',
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📝 대본 참고자료', callback_data: 'ref_type_scripts' }],
          [{ text: '🖼️ 이미지/썸네일', callback_data: 'ref_type_images' }],
          [{ text: '🎵 BGM 음악', callback_data: 'ref_type_bgm' }],
          [{ text: '📤 업로드 페이지 열기', callback_data: 'ref_bulk' }],
          [{ text: '🔙 메인 메뉴', callback_data: 'main_menu' }],
        ],
      },
    }
  );
}

function handleReferenceType(ctx: any, type: string) {
  const labels: Record<string, string> = {
    scripts: '📝 대본 참고자료',
    images: '🖼️ 이미지/썸네일',
    bgm: '🎵 BGM 음악',
  };
  ctx.editMessageText(
    `${labels[type] || type}\n\n파일을 추가하거나 초기화할 수 있습니다.`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ 파일 추가 (업로드 페이지)', callback_data: `ref_add_${type}` }],
          [{ text: '🗑️ 전체 초기화', callback_data: `ref_clear_${type}` }],
          [{ text: '🔙 참고자료 메뉴', callback_data: 'menu_reference' }],
        ],
      },
    }
  );
}

function handleAddRef(ctx: any, type: string) {
  const token = String(ctx.from?.id || 'unknown');
  const uploadUrl = `${UPLOAD_BASE_URL}/upload/${token}`;
  ctx.editMessageText(
    `📤 업로드 페이지 링크:\n\n${uploadUrl}\n\n` +
    `👆 위 링크를 브라우저 주소창에 복사해서 열어주세요!\n` +
    `드래그 앤 드롭으로 간편하게 업로드할 수 있습니다.`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 참고자료 메뉴', callback_data: 'menu_reference' }],
        ],
      },
    }
  );
}

function handleBulkUpload(ctx: any) {
  const token = String(ctx.from?.id || 'unknown');
  const uploadUrl = `${UPLOAD_BASE_URL}/upload/${token}`;
  ctx.editMessageText(
    `📤 참고자료 & BGM 업로드\n\n` +
    `🔗 ${uploadUrl}\n\n` +
    `👆 위 링크를 브라우저 주소창에 복사해서 열어주세요!\n\n` +
    `📝 대본 참고자료 (txt, md)\n` +
    `🖼️ 이미지/썸네일 (png, jpg)\n` +
    `🎵 BGM 음악 (mp3, wav)\n\n` +
    `탭으로 구분되어 있어서 쉽게 올릴 수 있습니다!`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 참고자료 메뉴', callback_data: 'menu_reference' }],
        ],
      },
    }
  );
}

function handleClearRef(ctx: any, type: string) {
  ctx.editMessageText(
    `⚠️ ${type} 참고자료를 모두 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 취소', callback_data: 'menu_reference' }],
        ],
      },
    }
  );
}

// ============ LAUNCH ============
bot.catch((err: any) => {
  console.error('⚠️ 봇 에러:', err);
});

async function main() {

  console.log('🚀 bot.launch() 시작...');
  await bot.launch({ dropPendingUpdates: true });
  await bot.telegram.setMyCommands([
    { command: 'start', description: '🏠 홈으로 돌아가기' },
    { command: 'make', description: '🎬 바로 영상 제작' },
    { command: 'status', description: '📊 진행 중인 영상 확인' },
    { command: 'help', description: '❓ 도움말' },
  ]);
  console.log('✅ ReelzFactory Bot 실행 성공!');
  console.log('📋 메뉴: /start | /make | /status | /help');
}


main().catch((err) => {
  console.error('❌ Bot 실행 실패:', err);
  process.exit(1);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
