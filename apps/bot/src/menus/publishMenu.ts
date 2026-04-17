import { Context, Markup } from 'telegraf';
import { getOrCreateUser, getUserProductions, updateProduction, trackFeature } from '../../../../packages/shared/supabase';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

// 발행 관리 메인 메뉴
export async function showPublishMenu(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = await getOrCreateUser(telegramId);
  const reviewVideos = await getUserProductions(user.id, 'review');
  const scheduledVideos = await getUserProductions(user.id, 'scheduled');
  const publishedToday = await import('../../../../packages/shared/supabase').then(m => m.getTodayProductions(user.id));
  const todayPublished = publishedToday.filter(p => p.status === 'published');

  const text =
    `📤 *발행 관리*\n\n` +
    `📝 대기중 (Unlisted): ${reviewVideos.length}개\n` +
    `⏰ 예약 발행: ${scheduledVideos.length}개\n` +
    `✅ 오늘 발행됨: ${todayPublished.length}개\n`;

  const buttons = [
    [Markup.button.callback(`📝 대기중 영상 (${reviewVideos.length})`, 'pub_review_list')],
    [Markup.button.callback(`⏰ 예약 목록 (${scheduledVideos.length})`, 'pub_scheduled_list')],
    [Markup.button.callback(`✅ 오늘 발행된 영상 (${todayPublished.length})`, 'pub_today_list')],
    [Markup.button.callback('📊 전체 영상 기록', 'pub_all_list')],
    [Markup.button.callback('🔙 메인 메뉴', 'menu_main')],
  ];

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons),
  });
}

// 대기중 영상 목록
export async function showReviewList(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = await getOrCreateUser(telegramId);
  const videos = await getUserProductions(user.id, 'review');

  if (videos.length === 0) {
    await ctx.editMessageText(
      '📝 *대기중 영상*\n\n대기중인 영상이 없습니다.',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🎬 영상 만들기', 'menu_make')],
          [Markup.button.callback('🔙 발행 관리', 'menu_publish')],
        ]),
      }
    );
    return;
  }

  let text = '📝 *대기중 영상 (Unlisted)*\n\n';
  const buttons: any[][] = [];

  videos.forEach((v, i) => {
    const date = new Date(v.created_at).toLocaleDateString('ko-KR');
    text += `${i + 1}. ${v.topic}\n   📅 ${date} | 🔗 ${v.youtube_url || '없음'}\n\n`;
    buttons.push([
      Markup.button.callback(`${i + 1}. ${v.topic.substring(0, 25)}...`, `pub_detail_${v.id}`),
    ]);
  });

  buttons.push([Markup.button.callback('🔙 발행 관리', 'menu_publish')]);

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons),
  });
}

// 영상 상세 + 발행 옵션
export async function showVideoDetail(ctx: Context, productionId: string) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = await getOrCreateUser(telegramId);
  const videos = await getUserProductions(user.id);
  const video = videos.find(v => v.id === productionId);

  if (!video) {
    await ctx.editMessageText('❌ 영상을 찾을 수 없습니다.');
    return;
  }

  const date = new Date(video.created_at).toLocaleDateString('ko-KR');
  const statusEmoji: Record<string, string> = {
    review: '📝 대기중', scheduled: '⏰ 예약됨', published: '✅ 발행됨', failed: '❌ 실패',
  };

  const text =
    `🎬 *영상 상세*\n\n` +
    `📌 주제: ${video.topic}\n` +
    `📂 카테고리: ${video.category || '일반'}\n` +
    `📅 생성일: ${date}\n` +
    `📊 상태: ${statusEmoji[video.status] || video.status}\n` +
    `🔗 링크: ${video.youtube_url || '없음'}\n\n` +
    `📈 조회수: ${video.view_count} | 👍 ${video.like_count} | 💬 ${video.comment_count}\n` +
    `💰 비용: $${video.cost_total?.toFixed(3) || '0.000'}`;

  const buttons: any[][] = [];

  if (video.youtube_url) {
    buttons.push([Markup.button.url('▶️ 미리보기', video.youtube_url)]);
  }

  if (video.status === 'review') {
    buttons.push([Markup.button.callback('✅ 공개 발행', `publish_now_${productionId}`)]);
    buttons.push([Markup.button.callback('⏰ 예약 발행', `publish_schedule_${productionId}`)]);
    buttons.push([Markup.button.callback('✏️ 제목/설명 수정', `edit_meta_${productionId}`)]);
    buttons.push([Markup.button.callback('🔄 리메이크', `remake_${productionId}`)]);
    buttons.push([Markup.button.callback('🗑️ 삭제', `delete_${productionId}`)]);
  } else if (video.status === 'scheduled') {
    buttons.push([Markup.button.callback('✅ 지금 발행', `publish_now_${productionId}`)]);
    buttons.push([Markup.button.callback('❌ 예약 취소', `cancel_schedule_${productionId}`)]);
  } else if (video.status === 'published') {
    buttons.push([Markup.button.callback('💬 댓글 보기', `view_comments_${productionId}`)]);
    buttons.push([Markup.button.callback('📊 성과 업데이트', `refresh_stats_${productionId}`)]);
  }

  buttons.push([Markup.button.callback('🔙 발행 관리', 'menu_publish')]);

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons),
  });
}

// 공개 발행 (unlisted → public)
export async function publishNow(ctx: Context, productionId: string) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  try {
    const user = await getOrCreateUser(telegramId);
    const videos = await getUserProductions(user.id);
    const video = videos.find(v => v.id === productionId);

    if (!video || !video.youtube_video_id) {
      await ctx.editMessageText('❌ YouTube 영상 정보를 찾을 수 없습니다.');
      return;
    }

    await ctx.editMessageText('📤 공개 전환 중...');

    // YouTube API로 privacy 변경
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    await youtube.videos.update({
      part: ['status'],
      requestBody: {
        id: video.youtube_video_id,
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
        },
      },
    });

    // DB 업데이트
    await updateProduction(productionId, {
      status: 'published',
      privacy_status: 'public',
      published_at: new Date().toISOString(),
    });

    await trackFeature(user.id, 'publish_video', { productionId });

    await ctx.editMessageText(
      `✅ *공개 발행 완료!*\n\n` +
      `📌 ${video.topic}\n` +
      `🔗 ${video.youtube_url}\n` +
      `📊 상태: 공개(Public)\n\n` +
      `이제 누구나 영상을 볼 수 있습니다!`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('▶️ 영상 보기', video.youtube_url!)],
          [Markup.button.callback('📤 발행 관리', 'menu_publish')],
          [Markup.button.callback('🔙 메인 메뉴', 'menu_main')],
        ]),
      }
    );
  } catch (error: any) {
    console.error('Publish error:', error);
    await ctx.editMessageText(
      `❌ 발행 실패: ${error.message}`,
      {
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 다시 시도', `publish_now_${productionId}`)],
          [Markup.button.callback('🔙 발행 관리', 'menu_publish')],
        ]),
      }
    );
  }
}

// 예약 발행 시간 선택
export async function showSchedulePublish(ctx: Context, productionId: string) {
  const buttons = [
    [Markup.button.callback('⏰ 1시간 후', `schedule_time_${productionId}_1`)],
    [Markup.button.callback('⏰ 3시간 후', `schedule_time_${productionId}_3`)],
    [Markup.button.callback('⏰ 6시간 후', `schedule_time_${productionId}_6`)],
    [Markup.button.callback('⏰ 12시간 후', `schedule_time_${productionId}_12`)],
    [Markup.button.callback('⏰ 내일 오전 9시', `schedule_time_${productionId}_tomorrow9`)],
    [Markup.button.callback('⏰ 내일 오후 6시', `schedule_time_${productionId}_tomorrow18`)],
    [Markup.button.callback('🔙 영상 상세', `pub_detail_${productionId}`)],
  ];

  await ctx.editMessageText(
    '⏰ *예약 발행*\n\n언제 공개할까요?',
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
  );
}

// 예약 시간 설정
export async function setScheduleTime(ctx: Context, productionId: string, timeOption: string) {
  let scheduledAt = new Date();

  if (timeOption === 'tomorrow9') {
    scheduledAt.setDate(scheduledAt.getDate() + 1);
    scheduledAt.setHours(9, 0, 0, 0);
  } else if (timeOption === 'tomorrow18') {
    scheduledAt.setDate(scheduledAt.getDate() + 1);
    scheduledAt.setHours(18, 0, 0, 0);
  } else {
    const hours = parseInt(timeOption);
    scheduledAt.setHours(scheduledAt.getHours() + hours);
  }

  await updateProduction(productionId, {
    status: 'scheduled',
    scheduled_at: scheduledAt.toISOString(),
  });

  const timeStr = scheduledAt.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  await ctx.editMessageText(
    `✅ *예약 발행 설정 완료!*\n\n⏰ 발행 예정: ${timeStr}\n\n예정 시간에 자동으로 공개됩니다.`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('❌ 예약 취소', `cancel_schedule_${productionId}`)],
        [Markup.button.callback('🔙 발행 관리', 'menu_publish')],
      ]),
    }
  );
}

// 오늘 발행된 영상 목록
export async function showTodayList(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = await getOrCreateUser(telegramId);
  const { getTodayProductions } = await import('../../../../packages/shared/supabase');
  const todayVideos = await getTodayProductions(user.id);

  if (todayVideos.length === 0) {
    await ctx.editMessageText(
      '✅ *오늘 영상*\n\n오늘 제작된 영상이 없습니다.',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🎬 영상 만들기', 'menu_make')],
          [Markup.button.callback('🔙 발행 관리', 'menu_publish')],
        ]),
      }
    );
    return;
  }

  let text = '✅ *오늘 영상*\n\n';
  const buttons: any[][] = [];

  todayVideos.forEach((v, i) => {
    const statusEmoji: Record<string, string> = {
      review: '📝', scheduled: '⏰', published: '✅', failed: '❌',
      scripting: '📝', imaging: '🎨', voicing: '🔊', rendering: '🎥', uploading: '📤',
    };
    text += `${statusEmoji[v.status] || '❓'} ${v.topic}\n`;
    text += `   👁️ ${v.view_count} | 👍 ${v.like_count} | 💬 ${v.comment_count}\n\n`;
    buttons.push([
      Markup.button.callback(`${i + 1}. ${v.topic.substring(0, 28)}`, `pub_detail_${v.id}`),
    ]);
  });

  buttons.push([Markup.button.callback('🔙 발행 관리', 'menu_publish')]);

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons),
  });
}

// 전체 영상 기록
export async function showAllList(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = await getOrCreateUser(telegramId);
  const videos = await getUserProductions(user.id, undefined, 20);

  if (videos.length === 0) {
    await ctx.editMessageText(
      '📊 *전체 영상 기록*\n\n제작된 영상이 없습니다.',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🎬 영상 만들기', 'menu_make')],
          [Markup.button.callback('🔙 발행 관리', 'menu_publish')],
        ]),
      }
    );
    return;
  }

  let text = '📊 *전체 영상 기록 (최근 20개)*\n\n';
  const buttons: any[][] = [];

  videos.forEach((v, i) => {
    const statusEmoji: Record<string, string> = {
      review: '📝', scheduled: '⏰', published: '✅', failed: '❌',
    };
    const date = new Date(v.created_at).toLocaleDateString('ko-KR');
    text += `${statusEmoji[v.status] || '❓'} ${date} | ${v.topic}\n`;
  });

  // 처음 10개만 버튼
  videos.slice(0, 10).forEach((v, i) => {
    buttons.push([
      Markup.button.callback(`${i + 1}. ${v.topic.substring(0, 28)}`, `pub_detail_${v.id}`),
    ]);
  });

  buttons.push([Markup.button.callback('🔙 발행 관리', 'menu_publish')]);

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons),
  });
}

// 댓글 보기
export async function showComments(ctx: Context, productionId: string) {
  // TODO: YouTube API로 댓글 가져오기
  await ctx.editMessageText(
    '💬 *댓글 보기*\n\n준비 중입니다. 곧 업데이트됩니다!',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔙 영상 상세', `pub_detail_${productionId}`)],
      ]),
    }
  );
}
