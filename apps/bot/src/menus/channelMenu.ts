import { Context, Markup } from 'telegraf';
import { getOrCreateUser, getUserChannels, createChannel, updateChannel, trackFeature } from '../../../../packages/shared/supabase';

const VOICE_OPTIONS = [
  { id: 'ko-KR-Neural2-C', name: '신뢰 남성', desc: '투자/뉴스' },
  { id: 'ko-KR-Neural2-A', name: '차분한 여성', desc: '교육/정보' },
  { id: 'ko-KR-Wavenet-D', name: '부드러운 남성', desc: '명언/심리' },
  { id: 'ko-KR-Wavenet-B', name: '밝은 여성', desc: '트렌드/여행' },
  { id: 'ko-KR-Neural2-B', name: '따뜻한 여성', desc: '건강/라이프' },
  { id: 'ko-KR-Wavenet-C', name: '에너지 남성', desc: '엔터/수입' },
];

const LANGUAGES = [
  { id: 'ko', flag: '🇰🇷', name: '한국어', voice: 'ko-KR-Neural2-C' },
  { id: 'en', flag: '🇺🇸', name: '영어', voice: 'en-US-Neural2-J' },
  { id: 'ja', flag: '🇯🇵', name: '일본어', voice: 'ja-JP-Neural2-C' },
  { id: 'es', flag: '🇪🇸', name: '스페인어', voice: 'es-ES-Neural2-B' },
  { id: 'pt', flag: '🇧🇷', name: '포르투갈어', voice: 'pt-BR-Neural2-B' },
  { id: 'zh', flag: '🇨🇳', name: '중국어', voice: 'cmn-CN-Neural2-C' },
  { id: 'de', flag: '🇩🇪', name: '독일어', voice: 'de-DE-Neural2-B' },
];

const IMAGE_STYLES = [
  { id: 'cinematic', name: '시네마틱', desc: '영화 같은 고퀄' },
  { id: 'anime', name: '애니메이션', desc: '일본 애니풍' },
  { id: '3d_render', name: '3D 렌더', desc: '입체감 있는 캐릭터' },
  { id: 'realistic', name: '포토리얼', desc: '실사 스타일' },
  { id: 'illustration', name: '일러스트', desc: '그림체 스타일' },
  { id: 'comic', name: '만화', desc: '웹툰/코믹풍' },
];

// 채널 관리 메인 메뉴
export async function showChannelMenu(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = await getOrCreateUser(telegramId);
  const channels = await getUserChannels(user.id);

  let text = '📡 *채널 관리*\n\n';

  if (channels.length === 0) {
    text += '등록된 채널이 없습니다.\n채널을 추가해보세요!';
  } else {
    channels.forEach((ch, i) => {
      const langFlag = LANGUAGES.find(l => l.id === ch.language)?.flag || '🌐';
      text += `${i + 1}. ${langFlag} *${ch.name}*\n`;
      text += `   🎙️ ${VOICE_OPTIONS.find(v => v.id === ch.voice_id)?.name || ch.voice_id}\n`;
      text += `   🎨 ${IMAGE_STYLES.find(s => s.id === ch.image_style)?.name || ch.image_style}\n\n`;
    });
  }

  const buttons: any[][] = [];

  // 기존 채널 버튼
  channels.forEach(ch => {
    buttons.push([Markup.button.callback(`⚙️ ${ch.name} 설정`, `ch_settings_${ch.id}`)]);
  });

  buttons.push([Markup.button.callback('➕ 새 채널 추가', 'ch_add')]);
  buttons.push([Markup.button.callback('🔑 API 키 관리', 'ch_apikeys')]);
  buttons.push([Markup.button.callback('🔙 메인 메뉴', 'menu_main')]);

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons),
  });
}

// 채널 추가
export async function showAddChannel(ctx: Context) {
  const buttons = [
    [Markup.button.callback('📺 YouTube Shorts', 'ch_add_youtube')],
    [Markup.button.callback('🎵 TikTok (준비중)', 'ch_add_tiktok')],
    [Markup.button.callback('📷 Instagram Reels (준비중)', 'ch_add_instagram')],
    [Markup.button.callback('🔙 채널 관리', 'menu_channel')],
  ];

  await ctx.editMessageText(
    '➕ *새 채널 추가*\n\n어떤 플랫폼에 연결할까요?',
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
  );
}

// YouTube 채널 추가 프로세스
const waitingForChannelName = new Map<number, string>();

export async function handleAddYoutube(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId) return;

  waitingForChannelName.set(userId, 'youtube_shorts');

  await ctx.editMessageText(
    '📺 *YouTube 채널 추가*\n\n' +
    '채널 이름을 입력해주세요.\n\n' +
    '예시: "투자의 정석", "AI 트렌드", "명언 모음"\n\n' +
    '💬 아래에 채널 이름을 입력하세요:',
    { parse_mode: 'Markdown' }
  );
}

export function getWaitingForChannelName(userId: number) {
  return waitingForChannelName.get(userId);
}

export function clearWaitingForChannelName(userId: number) {
  waitingForChannelName.delete(userId);
}

export async function processNewChannel(ctx: Context, channelName: string) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const platform = getWaitingForChannelName(telegramId);
  clearWaitingForChannelName(telegramId);

  const user = await getOrCreateUser(telegramId);

  const channel = await createChannel(user.id, {
    name: channelName,
    platform: platform || 'youtube_shorts',
  });

  await trackFeature(user.id, 'create_channel', { name: channelName, platform });

  await ctx.reply(
    `✅ *채널 생성 완료!*\n\n` +
    `📺 ${channelName}\n\n` +
    `이제 채널 설정을 해볼까요?`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🎙️ 목소리 설정', `ch_voice_${channel.id}`)],
        [Markup.button.callback('🌍 언어 설정', `ch_lang_${channel.id}`)],
        [Markup.button.callback('🎨 이미지 스타일', `ch_style_${channel.id}`)],
        [Markup.button.callback('✅ 나중에 하기', 'menu_channel')],
      ]),
    }
  );
}

// 채널 설정 메뉴
export async function showChannelSettings(ctx: Context, channelId: string) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = await getOrCreateUser(telegramId);
  const channels = await getUserChannels(user.id);
  const channel = channels.find(ch => ch.id === channelId);

  if (!channel) {
    await ctx.editMessageText('❌ 채널을 찾을 수 없습니다.');
    return;
  }

  const voiceName = VOICE_OPTIONS.find(v => v.id === channel.voice_id)?.name || channel.voice_id;
  const langInfo = LANGUAGES.find(l => l.id === channel.language);
  const styleInfo = IMAGE_STYLES.find(s => s.id === channel.image_style);

  const text =
    `⚙️ *${channel.name} 설정*\n\n` +
    `🎙️ 목소리: ${voiceName}\n` +
    `🌍 언어: ${langInfo?.flag || '🌐'} ${langInfo?.name || channel.language}\n` +
    `🎨 스타일: ${styleInfo?.name || channel.image_style}\n` +
    `🏷️ 카테고리: ${channel.category}\n` +
    `🎵 BGM: ${channel.bgm_enabled ? '✅ ON' : '❌ OFF'}\n` +
    `📝 자동 제목: ${channel.auto_title ? '✅' : '❌'}\n`;

  const buttons = [
    [Markup.button.callback('🎙️ 목소리 변경', `ch_voice_${channelId}`)],
    [Markup.button.callback('🌍 언어 변경', `ch_lang_${channelId}`)],
    [Markup.button.callback('🎨 이미지 스타일', `ch_style_${channelId}`)],
    [Markup.button.callback('🎵 BGM 설정', `ch_bgm_${channelId}`)],
    [Markup.button.callback('📝 자막 설정', `ch_subtitle_${channelId}`)],
    [Markup.button.callback('🏷️ 기본 카테고리', `ch_category_${channelId}`)],
    [Markup.button.callback('🔗 YouTube 재연동', `ch_reauth_${channelId}`)],
    [Markup.button.callback('❌ 채널 삭제', `ch_delete_${channelId}`)],
    [Markup.button.callback('🔙 채널 관리', 'menu_channel')],
  ];

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons),
  });
}

// 목소리 선택
export async function showVoiceMenu(ctx: Context, channelId: string) {
  const buttons = VOICE_OPTIONS.map(v => [
    Markup.button.callback(
      `🎙️ ${v.name} (${v.desc})`,
      `set_voice_${channelId}_${v.id}`
    ),
  ]);
  buttons.push([Markup.button.callback('🎧 미리듣기 (준비중)', 'voice_preview')]);
  buttons.push([Markup.button.callback('🔙 채널 설정', `ch_settings_${channelId}`)]);

  await ctx.editMessageText(
    '🎙️ *목소리 선택*\n\n채널에 사용할 목소리를 선택하세요:',
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
  );
}

// 목소리 설정 적용
export async function setVoice(ctx: Context, channelId: string, voiceId: string) {
  await updateChannel(channelId, { voice_id: voiceId });
  const voice = VOICE_OPTIONS.find(v => v.id === voiceId);

  await ctx.editMessageText(
    `✅ 목소리가 변경되었습니다!\n\n🎙️ ${voice?.name} (${voice?.desc})`,
    {
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔙 채널 설정', `ch_settings_${channelId}`)],
        [Markup.button.callback('🔙 메인 메뉴', 'menu_main')],
      ]),
    }
  );
}

// 언어 선택
export async function showLanguageMenu(ctx: Context, channelId: string) {
  const buttons = LANGUAGES.map(l => [
    Markup.button.callback(
      `${l.flag} ${l.name}`,
      `set_lang_${channelId}_${l.id}`
    ),
  ]);
  buttons.push([Markup.button.callback('🔙 채널 설정', `ch_settings_${channelId}`)]);

  await ctx.editMessageText(
    '🌍 *언어 선택*\n\n영상에 사용할 언어를 선택하세요:',
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
  );
}

// 언어 설정 적용
export async function setLanguage(ctx: Context, channelId: string, langId: string) {
  const lang = LANGUAGES.find(l => l.id === langId);
  await updateChannel(channelId, {
    language: langId,
    voice_id: lang?.voice || 'ko-KR-Neural2-C',
  });

  await ctx.editMessageText(
    `✅ 언어가 변경되었습니다!\n\n${lang?.flag} ${lang?.name}\n🎙️ 기본 목소리도 함께 변경됨`,
    {
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🎙️ 목소리 변경', `ch_voice_${channelId}`)],
        [Markup.button.callback('🔙 채널 설정', `ch_settings_${channelId}`)],
      ]),
    }
  );
}

// 이미지 스타일 선택
export async function showStyleMenu(ctx: Context, channelId: string) {
  const buttons = IMAGE_STYLES.map(s => [
    Markup.button.callback(
      `🎨 ${s.name} - ${s.desc}`,
      `set_style_${channelId}_${s.id}`
    ),
  ]);
  buttons.push([Markup.button.callback('🔙 채널 설정', `ch_settings_${channelId}`)]);

  await ctx.editMessageText(
    '🎨 *이미지 스타일 선택*\n\n영상 이미지의 스타일을 선택하세요:',
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
  );
}

// 스타일 설정 적용
export async function setStyle(ctx: Context, channelId: string, styleId: string) {
  await updateChannel(channelId, { image_style: styleId });
  const style = IMAGE_STYLES.find(s => s.id === styleId);

  await ctx.editMessageText(
    `✅ 이미지 스타일이 변경되었습니다!\n\n🎨 ${style?.name} - ${style?.desc}`,
    {
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔙 채널 설정', `ch_settings_${channelId}`)],
        [Markup.button.callback('🔙 메인 메뉴', 'menu_main')],
      ]),
    }
  );
}

// API 키 관리
export async function showApiKeyMenu(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = await getOrCreateUser(telegramId);
  const { getUserApiKeys } = await import('../../../../packages/shared/supabase');
  const keys = await getUserApiKeys(user.id);

  const hasOpenRouter = keys.find(k => k.provider === 'openrouter');
  const hasReplicate = keys.find(k => k.provider === 'replicate');
  const hasGoogleTts = keys.find(k => k.provider === 'google_tts');

  const text =
    `🔑 *API 키 관리*\n\n` +
    `${hasOpenRouter ? '✅' : '❌'} OpenRouter (대본 AI)\n` +
    `${hasReplicate ? '✅' : '❌'} Replicate (이미지)\n` +
    `${hasGoogleTts ? '✅' : '❌'} Google TTS (음성)\n\n` +
    `키를 입력하려면 아래 버튼을 선택하세요:`;

  const buttons = [
    [Markup.button.callback(`${hasOpenRouter ? '✏️' : '➕'} OpenRouter`, 'apikey_openrouter')],
    [Markup.button.callback(`${hasReplicate ? '✏️' : '➕'} Replicate`, 'apikey_replicate')],
    [Markup.button.callback(`${hasGoogleTts ? '✏️' : '➕'} Google TTS`, 'apikey_google_tts')],
    [Markup.button.callback('🔄 연결 테스트', 'apikey_test')],
    [Markup.button.callback('🔙 채널 관리', 'menu_channel')],
  ];

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons),
  });
}

export { VOICE_OPTIONS, LANGUAGES, IMAGE_STYLES };
