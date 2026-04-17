import { Context, Markup } from 'telegraf';
import { generateAnimationScript } from '../../../../packages/pipeline/src/animation/generateAnimationScript';

const PRODUCTS = [
  { id: 'acerola_c', emoji: '🍒', name: '아세로라C' },
  { id: 'omega3_marine', emoji: '🐟', name: '오메가3' },
  { id: 'double_x', emoji: '💊', name: '더블엑스' },
  { id: 'cal_mag_d', emoji: '🦴', name: '칼마디' },
  { id: 'protein', emoji: '💪', name: '프로틴' },
];

const TONES = [
  { id: 'cognitive_gap', emoji: '🧠', name: '인지부조화 (권위+귀여움)' },
  { id: 'provocateur', emoji: '🔥', name: '도발자 (팩폭+귀여움)' },
  { id: 'gravity', emoji: '💼', name: '중력감 (CEO+귀여움)' },
];

const DURATIONS = [
  { id: '15', emoji: '⚡', name: '15초' },
  { id: '30', emoji: '🎬', name: '30초' },
  { id: '45', emoji: '📺', name: '45초' },
  { id: '60', emoji: '🎥', name: '60초' },
];

const GENDERS = [
  { id: 'male', emoji: '👨', name: '남성' },
  { id: 'female', emoji: '👩', name: '여성' },
];

// 사용자별 선택 상태 저장
const userSelections: Map<number, {
  product?: string;
  tone?: string;
  duration?: string;
  gender?: string;
}> = new Map();

function getSelection(userId: number) {
  if (!userSelections.has(userId)) userSelections.set(userId, {});
  return userSelections.get(userId)!;
}

// Step 1: 제품 선택
export async function showAnimationMenu(ctx: Context) {
  const rows = [];
  for (let i = 0; i < PRODUCTS.length; i += 2) {
    const row = [
      Markup.button.callback(
        `${PRODUCTS[i].emoji} ${PRODUCTS[i].name}`,
        `anim_prod_${PRODUCTS[i].id}`
      ),
    ];
    if (PRODUCTS[i + 1]) {
      row.push(
        Markup.button.callback(
          `${PRODUCTS[i + 1].emoji} ${PRODUCTS[i + 1].name}`,
          `anim_prod_${PRODUCTS[i + 1].id}`
        )
      );
    }
    rows.push(row);
  }
  rows.push([Markup.button.callback('🔙 영상 제작', 'menu_make')]);
  await ctx.editMessageText(
    '🎭 *애니메이션 숏폼 제작*\n\n어떤 제품의 영상을 만들까요?',
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard(rows) }
  );
}

// Step 2: 톤 선택
export async function handleAnimProductSelect(ctx: Context, productId: string) {
  const userId = ctx.from?.id;
  if (!userId) return;
  getSelection(userId).product = productId;

  const product = PRODUCTS.find(p => p.id === productId);
  const rows = TONES.map(t => [
    Markup.button.callback(`${t.emoji} ${t.name}`, `anim_tone_${t.id}`)
  ]);
  rows.push([Markup.button.callback('🔙 제품 선택', 'menu_animation')]);

  await ctx.editMessageText(
    `🎭 *톤 선택*\n\n제품: ${product?.emoji} ${product?.name}\n\n어떤 스타일로 만들까요?`,
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard(rows) }
  );
}

// Step 3: 성별 선택
export async function handleAnimToneSelect(ctx: Context, toneId: string) {
  const userId = ctx.from?.id;
  if (!userId) return;
  getSelection(userId).tone = toneId;

  const sel = getSelection(userId);
  const product = PRODUCTS.find(p => p.id === sel.product);
  const tone = TONES.find(t => t.id === toneId);

  const rows = GENDERS.map(g => [
    Markup.button.callback(`${g.emoji} ${g.name}`, `anim_gender_${g.id}`)
  ]);
  rows.push([Markup.button.callback('🔙 톤 선택', `anim_prod_${sel.product}`)]);

  await ctx.editMessageText(
    `🎭 *음성 성별 선택*\n\n제품: ${product?.emoji} ${product?.name}\n톤: ${tone?.emoji} ${tone?.name}\n\n어떤 목소리로 할까요?`,
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard(rows) }
  );
}

// Step 4: 길이 선택
export async function handleAnimGenderSelect(ctx: Context, genderId: string) {
  const userId = ctx.from?.id;
  if (!userId) return;
  getSelection(userId).gender = genderId;

  const sel = getSelection(userId);
  const product = PRODUCTS.find(p => p.id === sel.product);
  const tone = TONES.find(t => t.id === sel.tone);
  const gender = GENDERS.find(g => g.id === genderId);

  const rows = [];
  for (let i = 0; i < DURATIONS.length; i += 2) {
    const row = [
      Markup.button.callback(
        `${DURATIONS[i].emoji} ${DURATIONS[i].name}`,
        `anim_dur_${DURATIONS[i].id}`
      ),
    ];
    if (DURATIONS[i + 1]) {
      row.push(
        Markup.button.callback(
          `${DURATIONS[i + 1].emoji} ${DURATIONS[i + 1].name}`,
          `anim_dur_${DURATIONS[i + 1].id}`
        )
      );
    }
    rows.push(row);
  }
  rows.push([Markup.button.callback('🔙 성별 선택', `anim_tone_${sel.tone}`)]);

  await ctx.editMessageText(
    `🎭 *영상 길이 선택*\n\n제품: ${product?.emoji} ${product?.name}\n톤: ${tone?.emoji} ${tone?.name}\n음성: ${gender?.emoji} ${gender?.name}\n\n몇 초짜리 영상으로 할까요?`,
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard(rows) }
  );
}

// Step 5: 확인 & 생성
export async function handleAnimDurationSelect(ctx: Context, durationId: string) {
  const userId = ctx.from?.id;
  if (!userId) return;
  getSelection(userId).duration = durationId;

  const sel = getSelection(userId);
  const product = PRODUCTS.find(p => p.id === sel.product);
  const tone = TONES.find(t => t.id === sel.tone);
  const gender = GENDERS.find(g => g.id === sel.gender);
  const duration = DURATIONS.find(d => d.id === durationId);

  const rows = [
    [Markup.button.callback('🚀 대본 생성 시작!', 'anim_generate')],
    [Markup.button.callback('🔙 길이 선택', `anim_gender_${sel.gender}`)],
    [Markup.button.callback('🔙 처음부터', 'menu_animation')],
  ];

  await ctx.editMessageText(
    `🎭 *최종 확인*\n\n` +
    `📦 제품: ${product?.emoji} ${product?.name}\n` +
    `🎨 톤: ${tone?.emoji} ${tone?.name}\n` +
    `🗣 음성: ${gender?.emoji} ${gender?.name}\n` +
    `⏱ 길이: ${duration?.emoji} ${duration?.name}\n` +
    `💰 예상 비용: ~$${durationId === '15' ? '0.80' : durationId === '30' ? '1.60' : durationId === '45' ? '2.40' : '3.20'}\n\n` +
    `이대로 생성할까요?`,
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard(rows) }
  );
}

// Step 6: 실제 생성
export async function executeAnimationGeneration(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const sel = getSelection(userId);
  if (!sel.product || !sel.tone || !sel.gender || !sel.duration) {
    await ctx.editMessageText('❌ 설정이 누락되었습니다. 다시 시작해주세요.');
    return;
  }

  const product = PRODUCTS.find(p => p.id === sel.product);
  const tone = TONES.find(t => t.id === sel.tone);

  await ctx.editMessageText(
    `⏳ *대본 생성 중...*\n\n` +
    `📦 ${product?.emoji} ${product?.name} | ${tone?.emoji} ${tone?.name} | ${sel.duration}초\n\n` +
    `Gemini Pro가 대본을 작성하고 있습니다. 30-60초 소요됩니다.`,
    { parse_mode: 'Markdown' }
  );

  try {
    const startTime = Date.now();
    const script = await generateAnimationScript({
      product: sel.product,
      duration: parseInt(sel.duration),
      tone: sel.tone,
      gender: sel.gender,
      language: 'ko',
    });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // 씬 요약 생성
    const sceneList = script.scenes
      ?.map((s: any, i: number) => `${i + 1}. [${s.phase}] ${s.render_type} ${s.duration_sec}s`)
      .join('\n') || 'N/A';

    const rows = [
      [Markup.button.callback('🎬 풀 영상 제작 시작', `anim_full_${userId}`)],
      [Markup.button.callback('📝 대본 수정 요청', `anim_retry`)],
      [Markup.button.callback('🔙 처음부터', 'menu_animation')],
    ];

    await ctx.editMessageText(
      `✅ *대본 생성 완료!* (${elapsed}초)\n\n` +
      `📌 *${script.title}*\n\n` +
      `🎣 훅: "${script.scenes?.[0]?.tts_script || 'N/A'}"\n\n` +
      `📋 *씬 구성:*\n${sceneList}\n\n` +
      `💰 예상 비용: $${script.estimated_cost?.total_usd || 'N/A'}\n\n` +
      `다음 단계를 선택하세요:`,
      { parse_mode: 'Markdown', ...Markup.inlineKeyboard(rows) }
    );

    // 대본 임시 저장 (나중에 풀 파이프라인에서 사용)
    userSelections.set(userId, { ...sel, ...{ _script: script } as any });

  } catch (error: any) {
    await ctx.editMessageText(
      `❌ *대본 생성 실패*\n\n` +
      `에러: ${error.message}\n\n` +
      `다시 시도해주세요.`,
      { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
        [Markup.button.callback('🔄 다시 시도', 'anim_generate')],
        [Markup.button.callback('🔙 메인 메뉴', 'menu_main')],
      ])}
    );
  }
}
