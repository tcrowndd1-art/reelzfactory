import { Context, Markup } from 'telegraf';
import { getOrCreateUser, saveReference, getReferences, trackFeature } from '../../../../packages/shared/supabase';

const REF_TYPES = [
  { id: 'script_example', emoji: '📝', name: '대본 참고자료' },
  { id: 'title_reference', emoji: '📰', name: '제목 레퍼런스' },
  { id: 'character_image', emoji: '🖼️', name: '캐릭터 이미지' },
  { id: 'thumbnail_example', emoji: '🎨', name: '썸네일 예시' },
  { id: 'bgm', emoji: '🎵', name: 'BGM 파일' },
  { id: 'image_style', emoji: '✨', name: '이미지 스타일 프롬프트' },
  { id: 'tag_set', emoji: '🏷️', name: '태그 세트' },
  { id: 'cta', emoji: '📢', name: 'CTA 문구' },
  { id: 'blocklist', emoji: '🚫', name: '금지어 리스트' },
  { id: 'benchmark_video', emoji: '🔗', name: '참고 영상 벤치마킹' },
];

// 참고자료 메인 메뉴
export async function showReferenceMenu(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = await getOrCreateUser(telegramId);
  const allRefs = await getReferences(user.id);

  // 타입별 카운트
  const counts: Record<string, number> = {};
  allRefs.forEach(ref => {
    counts[ref.type] = (counts[ref.type] || 0) + 1;
  });

  let text = '📚 *참고자료 관리*\n\n';
  REF_TYPES.forEach(rt => {
    const count = counts[rt.id] || 0;
    text += `${rt.emoji} ${rt.name}: ${count}개\n`;
  });
  text += `\n총 ${allRefs.length}개 등록됨`;

  const buttons: any[][] = [];

  // 2열로 배치
  for (let i = 0; i < REF_TYPES.length; i += 2) {
    const row = [
      Markup.button.callback(
        `${REF_TYPES[i].emoji} ${REF_TYPES[i].name}`,
        `ref_type_${REF_TYPES[i].id}`
      ),
    ];
    if (REF_TYPES[i + 1]) {
      row.push(
        Markup.button.callback(
          `${REF_TYPES[i + 1].emoji} ${REF_TYPES[i + 1].name}`,
          `ref_type_${REF_TYPES[i + 1].id}`
        )
      );
    }
    buttons.push(row);
  }

  buttons.push([Markup.button.callback('📤 한번에 업로드', 'ref_bulk_upload')]);
  buttons.push([Markup.button.callback('🔙 메인 메뉴', 'menu_main')]);

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons),
  });
}

// 특정 타입 참고자료 보기
export async function showReferenceType(ctx: Context, typeId: string) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = await getOrCreateUser(telegramId);
  const refs = await getReferences(user.id, typeId);
  const refType = REF_TYPES.find(rt => rt.id === typeId);

  let text = `${refType?.emoji} *${refType?.name}*\n\n`;

  if (refs.length === 0) {
    text += '등록된 자료가 없습니다.\n아래 버튼으로 추가해보세요!';
  } else {
    refs.slice(0, 15).forEach((ref, i) => {
      if (ref.title) {
        text += `${i + 1}. ${ref.title}\n`;
      } else if (ref.content) {
        text += `${i + 1}. ${ref.content.substring(0, 40)}...\n`;
      } else if (ref.file_url) {
        text += `${i + 1}. [파일] ${ref.file_type || '알 수 없음'}\n`;
      }
    });
    if (refs.length > 15) {
      text += `\n...외 ${refs.length - 15}개`;
    }
  }

  const buttons = [
    [Markup.button.callback('➕ 추가하기', `ref_add_${typeId}`)],
    [Markup.button.callback('🗑️ 전체 삭제', `ref_clear_${typeId}`)],
    [Markup.button.callback('🔙 참고자료', 'menu_reference')],
  ];

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons),
  });
}

// 참고자료 추가 모드
const waitingForReference = new Map<number, { type: string; mode: string }>();

export function setWaitingForReference(userId: number, data: { type: string; mode: string }) {
  waitingForReference.set(userId, data);
}

export function getWaitingForReference(userId: number) {
  return waitingForReference.get(userId);
}

export function clearWaitingForReference(userId: number) {
  waitingForReference.delete(userId);
}

export async function showAddReference(ctx: Context, typeId: string) {
  const refType = REF_TYPES.find(rt => rt.id === typeId);
  const userId = ctx.from?.id;
  if (!userId) return;

  // 파일 업로드 타입인지 텍스트 타입인지 구분
  const fileTypes = ['character_image', 'thumbnail_example', 'bgm'];
  const isFileType = fileTypes.includes(typeId);

  setWaitingForReference(userId, { type: typeId, mode: isFileType ? 'file' : 'text' });

  const instructions: Record<string, string> = {
    script_example:
      '대본 예시를 텍스트로 보내주세요.\n\n' +
      '좋은 대본 예시:\n' +
      '• 후킹이 강한 첫 문장\n' +
      '• 정보 전달이 명확한 본문\n' +
      '• 행동 유도 마무리\n\n' +
      '여러 개를 한번에 보내려면\n--- 로 구분해주세요.',
    title_reference:
      '조회수 높은 제목 예시를 보내주세요.\n\n' +
      '예시:\n' +
      '• "이거 모르면 전재산 날립니다"\n' +
      '• "부자들이 절대 안 알려주는 3가지"\n' +
      '• "AI가 바꿀 미래, 준비 안하면 끝"\n\n' +
      '여러 개를 한번에 보내려면\n한 줄에 하나씩 입력하세요.',
    character_image:
      '캐릭터 레퍼런스 이미지를 보내주세요.\n\n' +
      'AI가 이 스타일을 참고해서\n일관된 캐릭터를 생성합니다.\n\n' +
      '📎 이미지 파일을 보내주세요.',
    thumbnail_example:
      '썸네일 예시 이미지를 보내주세요.\n\n' +
      '클릭률 높은 썸네일 스타일을\nAI가 참고합니다.\n\n' +
      '📎 이미지 파일을 보내주세요.',
    bgm:
      'BGM 파일(MP3)을 보내주세요.\n\n' +
      '무드별로 분류됩니다:\n' +
      '• 긴장감 → 투자/경제\n' +
      '• 잔잔함 → 명언/심리\n' +
      '• 신남 → 트렌드/엔터\n\n' +
      '📎 MP3 파일을 보내주세요.',
    image_style:
      '이미지 스타일 프롬프트를 보내주세요.\n\n' +
      '예시:\n' +
      '• "cinematic lighting, dramatic shadows"\n' +
      '• "anime style, vibrant colors"\n' +
      '• "3D render, soft lighting, cute"\n\n' +
      '여러 개를 한번에: 한 줄에 하나씩.',
    tag_set:
      '태그 세트를 보내주세요.\n\n' +
      '예시 (투자 카테고리):\n' +
      'bitcoin, 비트코인, 투자, 재테크, 주식, 부동산, 경제, 금융\n\n' +
      '카테고리별로 쉼표(,)로 구분해서 입력하세요.',
    cta:
      'CTA(행동유도) 문구를 보내주세요.\n\n' +
      '예시:\n' +
      '• "구독 안 하면 손해입니다"\n' +
      '• "좋아요 누르고 다음편 기다려주세요"\n' +
      '• "댓글로 의견 남겨주세요"\n\n' +
      '한 줄에 하나씩 입력하세요.',
    blocklist:
      '금지어/필터 단어를 보내주세요.\n\n' +
      'YouTube 정책 위반 단어나\n민감한 표현을 등록하면\nAI가 자동으로 피합니다.\n\n' +
      '쉼표(,)로 구분해서 입력하세요.',
  };
    benchmark_video:
      '🔗 벤치마킹할 영상 링크를 보내주세요.\n\n' +
      '지원 플랫폼:\n' +
      '• YouTube (Shorts/일반)\n' +
      '• TikTok\n' +
      '• 1688/중국 틱톡 (더우인)\n\n' +
      'AI가 영상 구조를 분석하고\n동일 구조로 새 영상을 만듭니다.\n\n' +
      '📎 링크를 그대로 붙여넣으세요.',

  await ctx.editMessageText(
    `${refType?.emoji} *${refType?.name} 추가*\n\n${instructions[typeId] || '자료를 보내주세요.'}`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('❌ 취소', `ref_type_${typeId}`)],
      ]),
    }
  );
}

// 텍스트 참고자료 처리
export async function processTextReference(ctx: Context, text: string) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const waiting = getWaitingForReference(userId);
  if (!waiting) return;

  clearWaitingForReference(userId);

  const user = await getOrCreateUser(userId);
  const refType = REF_TYPES.find(rt => rt.id === waiting.type);
    // 벤치마킹 링크 처리
  if (waiting.type === 'benchmark_video') {
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    if (!urlMatch) {
      await ctx.reply('❌ 유효한 링크가 아닙니다. YouTube/TikTok 링크를 보내주세요.');
      return;
    }

    const videoUrl = urlMatch[0];
    await ctx.reply('🔍 영상 분석 중... (30초~1분 소요)');

    try {
      const { extractVideoData } = await import('../../../../packages/pipeline/src/benchmark/extractVideo');
      const { analyzeVideoStructure, structureToKnowledgeBase } = await import('../../../../packages/pipeline/src/benchmark/analyzeStructure');

      const meta = await extractVideoData(videoUrl);
      const structure = await analyzeVideoStructure(meta);
      const knowledgeBase = structureToKnowledgeBase(meta, structure);

      await saveReference({
        user_id: user.id,
        type: 'benchmark_video',
        title: meta.title.substring(0, 50),
        content: knowledgeBase,
      });

      const summaryText =
        `✅ *벤치마킹 분석 완료!*\n\n` +
        `📌 *${meta.title}*\n` +
        `⏱️ ${meta.duration}초 | 👀 ${meta.viewCount?.toLocaleString()}회\n` +
        `🎯 훅: ${structure.hookType} (${structure.hookTiming})\n` +
        `💫 감정흐름: ${structure.emotionFlow}\n` +
        `🔥 바이럴요소: ${structure.viralElements?.slice(0, 3).join(', ')}\n\n` +
        `이 구조로 영상을 만들까요?`;

      await ctx.reply(summaryText, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🎬 이 구조로 영상 만들기', `bench_make_${user.id}`)],
          [Markup.button.callback('🌐 언어 선택 후 만들기', `bench_lang_${user.id}`)],
          [Markup.button.callback('🔗 다른 영상 분석', 'ref_add_benchmark_video')],
          [Markup.button.callback('🔙 참고자료', 'menu_reference')],
        ]),
      });
    } catch (e) {
      console.error('벤치마킹 실패:', e);
      await ctx.reply('❌ 영상 분석에 실패했습니다.\n링크를 확인하고 다시 시도해주세요.', {
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔁 다시 시도', 'ref_add_benchmark_video')],
          [Markup.button.callback('🔙 참고자료', 'menu_reference')],
        ]),
      });
    }
    return;
  }


  // 여러 줄 또는 --- 구분자로 분리
  let items: string[] = [];
  if (text.includes('---')) {
    items = text.split('---').map(s => s.trim()).filter(s => s.length > 0);
  } else if (['title_reference', 'cta', 'image_style'].includes(waiting.type)) {
    items = text.split('\n').map(s => s.trim()).filter(s => s.length > 0);
  } else if (['tag_set', 'blocklist'].includes(waiting.type)) {
    // 쉼표 구분은 하나의 세트로 저장
    items = [text];
  } else {
    items = [text];
  }

  let savedCount = 0;
  for (const item of items) {
    await saveReference({
      user_id: user.id,
      type: waiting.type,
      title: item.substring(0, 50),
      content: item,
    });
    savedCount++;
  }

  await trackFeature(user.id, 'add_reference', { type: waiting.type, count: savedCount });

  await ctx.reply(
    `✅ *${refType?.emoji} ${refType?.name}* ${savedCount}개 저장 완료!`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('➕ 더 추가', `ref_add_${waiting.type}`)],
        [Markup.button.callback(`📋 ${refType?.name} 보기`, `ref_type_${waiting.type}`)],
        [Markup.button.callback('🔙 참고자료', 'menu_reference')],
      ]),
    }
  );
}

// 파일 참고자료 처리
export async function processFileReference(ctx: Context, fileUrl: string, fileType: string) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const waiting = getWaitingForReference(userId);
  if (!waiting) return;

  clearWaitingForReference(userId);

  const user = await getOrCreateUser(userId);
  const refType = REF_TYPES.find(rt => rt.id === waiting.type);

  await saveReference({
    user_id: user.id,
    type: waiting.type,
    title: `${refType?.name} ${new Date().toLocaleDateString('ko-KR')}`,
    file_url: fileUrl,
    file_type: fileType,
  });

  await trackFeature(user.id, 'add_reference_file', { type: waiting.type, fileType });

  await ctx.reply(
    `✅ *${refType?.emoji} ${refType?.name}* 파일 저장 완료!`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('➕ 더 추가', `ref_add_${waiting.type}`)],
        [Markup.button.callback(`📋 ${refType?.name} 보기`, `ref_type_${waiting.type}`)],
        [Markup.button.callback('🔙 참고자료', 'menu_reference')],
      ]),
    }
  );
}

// 전체 삭제
export async function confirmClearReferences(ctx: Context, typeId: string) {
  const refType = REF_TYPES.find(rt => rt.id === typeId);

  await ctx.editMessageText(
    `⚠️ *정말 삭제할까요?*\n\n${refType?.emoji} ${refType?.name}의 모든 자료가 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🗑️ 네, 전체 삭제', `ref_confirm_clear_${typeId}`)],
        [Markup.button.callback('❌ 취소', `ref_type_${typeId}`)],
      ]),
    }
  );
}

// 한번에 업로드 안내
export async function showBulkUpload(ctx: Context) {
  await ctx.editMessageText(
    '📤 *한번에 업로드*\n\n' +
    '여러 자료를 한번에 등록하는 방법:\n\n' +
    '*텍스트 자료 (대본/제목/CTA 등)*\n' +
    '해당 카테고리 선택 → 추가하기 →\n' +
    '여러 줄 또는 --- 구분자로 입력\n\n' +
    '*파일 자료 (이미지/BGM)*\n' +
    '해당 카테고리 선택 → 추가하기 →\n' +
    '파일을 하나씩 보내기\n\n' +
    '💡 팁: 대본 예시는 카테고리당 5~10개,\n' +
    '제목 레퍼런스는 100개 이상이 이상적!',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔙 참고자료', 'menu_reference')],
      ]),
    }
  );
}

export { REF_TYPES };