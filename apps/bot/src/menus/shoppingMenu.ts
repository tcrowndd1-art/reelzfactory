import { Context } from 'telegraf';
import * as fs from 'fs';
import * as path from 'path';

// ============ STATE MAPS ============
const waitingForShoppingInput = new Map<number, {
  mode: 'video_link' | 'product_link' | 'manual';
  language: string;
  step: string;
  data: Record<string, any>;
}>();

// ============ SHOPPING MENU ============
export async function showShoppingMenu(ctx: Context) {
  const buttons = [
    [{ text: '🎬 영상 링크로 만들기', callback_data: 'shop_video_link' }],
    [{ text: '🔗 제품 링크로 만들기', callback_data: 'shop_product_link' }],
    [{ text: '✍️ 수동 입력', callback_data: 'shop_manual' }],
    [{ text: '🔙 메인 메뉴', callback_data: 'menu_main' }],
  ];
  await ctx.editMessageText(
    '🛒 *쇼핑 쇼츠*\n\n' +
    '제품 영상을 자동으로 만들어드립니다!\n\n' +
    '🎬 영상 링크 → 도우인/틱톡/인스타 영상 재창작\n' +
    '🔗 제품 링크 → 쿠팡/아마존/1688 제품 AI 영상\n' +
    '✍️ 수동 입력 → 제품명 + 사진으로 AI 영상\n\n' +
    '📎 아래 버튼을 선택하세요.',
    { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } }
  );
}

// ============ LANGUAGE SELECTOR ============
function showLanguageSelect(ctx: Context, mode: 'video_link' | 'product_link' | 'manual') {
  const langButtons = [
    [{ text: '🇰🇷 한국어', callback_data: `shop_lang_${mode}_ko` }],
    [{ text: '🇺🇸 English', callback_data: `shop_lang_${mode}_en` }],
    [{ text: '🇧🇷 Português', callback_data: `shop_lang_${mode}_pt` }],
  ];
  return ctx.editMessageText(
    '🌐 *언어 선택*\n\n어떤 언어로 쇼핑 쇼츠를 만들까요?',
    { parse_mode: 'Markdown', reply_markup: { inline_keyboard: langButtons } }
  );
}

// ============ MODE HANDLERS ============
export async function handleShopVideoLink(ctx: Context) {
  ctx.answerCbQuery();
  await showLanguageSelect(ctx, 'video_link');
}

export async function handleShopProductLink(ctx: Context) {
  ctx.answerCbQuery();
  await showLanguageSelect(ctx, 'product_link');
}

export async function handleShopManual(ctx: Context) {
  ctx.answerCbQuery();
  await showLanguageSelect(ctx, 'manual');
}

// ============ LANGUAGE SELECTED → NEXT STEP ============
export async function handleShopLangSelect(ctx: Context, mode: string, lang: string) {
  ctx.answerCbQuery();
  const userId = ctx.from!.id;
  const langNames: Record<string, string> = { ko: '한국어', en: 'English', pt: 'Português' };

  if (mode === 'video_link') {
    waitingForShoppingInput.set(userId, { mode: 'video_link', language: lang, step: 'awaiting_link', data: {} });
    await ctx.editMessageText(
      `🎬 *${langNames[lang]} 쇼핑 쇼츠*\n\n` +
      '영상 링크를 보내주세요!\n' +
      '(도우인/틱톡/인스타그램/1688)',
      { parse_mode: 'Markdown' }
    );
  } else if (mode === 'product_link') {
    waitingForShoppingInput.set(userId, { mode: 'product_link', language: lang, step: 'awaiting_link', data: {} });
    await ctx.editMessageText(
      `🔗 *${langNames[lang]} 쇼핑 쇼츠*\n\n` +
      '제품 링크를 보내주세요!\n' +
      '(쿠팡/아마존/1688)',
      { parse_mode: 'Markdown' }
    );
  } else if (mode === 'manual') {
    waitingForShoppingInput.set(userId, { mode: 'manual', language: lang, step: 'awaiting_name', data: {} });
    await ctx.editMessageText(
      `✍️ *${langNames[lang]} 수동 입력*\n\n` +
      '제품명을 입력해주세요!\n' +
      '예: 무선 핸디 청소기',
      { parse_mode: 'Markdown' }
    );
  }
}

// ============ TEXT/PHOTO MESSAGE HANDLER ============
export async function handleShoppingMessage(ctx: Context): Promise<boolean> {
  const userId = ctx.from!.id;
  const state = waitingForShoppingInput.get(userId);
  if (!state) return false;

  const text = (ctx.message as any)?.text || '';
  const photo = (ctx.message as any)?.photo;

  // MODE: video_link
  if (state.mode === 'video_link' && state.step === 'awaiting_link') {
    state.data.videoUrl = text;
    waitingForShoppingInput.delete(userId);
    await ctx.reply(`⏳ 영상 리믹스 시작!\n🔗 ${text}\n🌐 ${state.language}`);
    try {
      const { downloadAndOverlay } = await import('../../../../packages/pipeline/src/benchmark/overlayVideo');
      const result = await downloadAndOverlay({
        videoUrl: text,
        language: state.language,
      });
      // 영상 파일 텔레그램으로 전송
      const fs = await import('fs');
      await ctx.replyWithVideo({ source: fs.createReadStream(result.videoPath) });
      await ctx.reply(
        `✅ 리믹스 완료!\n⏱️ ${result.duration.toFixed(1)}초\n📁 ${result.videoPath}`
      );
    } catch (error: any) {
      await ctx.reply(`❌ 리믹스 실패: ${error.message}`);
    }
    return true;
  }

  // MODE: product_link
  if (state.mode === 'product_link' && state.step === 'awaiting_link') {
    state.data.productUrl = text;
    waitingForShoppingInput.delete(userId);
    await ctx.reply(
      `⏳ 제품 정보 수집 중...\n🔗 ${text}\n🌐 ${state.language}\n\n` +
      '🚧 제품 링크 파이프라인 구현 중 (Phase 2)',
    );
    return true;
  }

  // MODE: manual — step 1: product name
  if (state.mode === 'manual' && state.step === 'awaiting_name') {
    state.data.productName = text;
    state.step = 'awaiting_image';
    await ctx.reply(
      `✅ 제품명: *${text}*\n\n` +
      '이제 제품 사진을 보내주세요! 📸\n' +
      '(사진 1장)',
      { parse_mode: 'Markdown' }
    );
    return true;
  }

  // MODE: manual — step 2: product image → 파이프라인 실행
  if (state.mode === 'manual' && state.step === 'awaiting_image' && photo) {
    const fileId = photo[photo.length - 1].file_id;
    const productName = state.data.productName;
    const language = state.language;
    waitingForShoppingInput.delete(userId);

    await ctx.reply(
      `🚀 *쇼핑 쇼츠 생성 시작!*\n\n` +
      `📦 제품: ${productName}\n` +
      `🌐 언어: ${language}\n` +
      `📸 이미지: 수신 완료\n\n` +
      '⏳ 대본 → TTS → 이미지 → 렌더링 → 업로드...',
      { parse_mode: 'Markdown' }
    );

    // 사진 다운로드
    try {
      const file = await ctx.telegram.getFile(fileId);
      const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
      const projectDir = path.resolve(`./outputs/shop_${Date.now()}`);
      fs.mkdirSync(projectDir, { recursive: true });
      const imagePath = path.join(projectDir, 'product_image.jpg');

      // 이미지 다운로드
      const response = await fetch(fileUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(imagePath, buffer);
      console.log(`📸 제품 이미지 저장: ${imagePath}`);

      // 파이프라인 실행
      const { runShoppingPipeline } = await import('../../../../packages/pipeline/src/shopping/shoppingPipeline');
      const result = await runShoppingPipeline({
        productName,
        language,
        mode: 'manual',
        productImagePath: imagePath,
        uploadToYoutube: true,
        privacyStatus: 'unlisted',
      });

      let msg = `🎉 *쇼핑 쇼츠 완료!*\n\n` +
        `📦 ${productName}\n` +
        `🎬 구조: ${result.script.structure}\n` +
        `⏱️ 소요: ${result.duration.toFixed(1)}초\n` +
        `📁 ${result.videoPath}`;

      if (result.youtubeUrl) {
        msg += `\n🔗 ${result.youtubeUrl}`;
      }

      await ctx.reply(msg, { parse_mode: 'Markdown' });
    } catch (error: any) {
      console.error('🛒 쇼핑 쇼츠 실패:', error);
      await ctx.reply(`❌ 쇼핑 쇼츠 생성 실패: ${error.message}`);
    }
    return true;
  }

  return false;
}

export { waitingForShoppingInput };
