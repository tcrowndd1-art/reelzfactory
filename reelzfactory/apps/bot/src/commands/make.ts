import { Context } from 'grammy';
import { runFullPipeline } from '../../../../packages/pipeline/src/fullPipeline';
import { uploadToYoutube } from '../../../../packages/pipeline/src/upload';
import { activeJobs } from './status';

export async function makeCommand(ctx: Context) {
  const text = ctx.message?.text || '';
  const topic = text.replace('/make', '').trim();

  if (!topic) {
    await ctx.reply('❌ 주제를 입력해주세요!\n\n예시:\n/make 비트코인 1억 돌파 이유\n/make 2026년 AI가 대체할 직업');
    return;
  }

  const chatId = ctx.chat?.id || 0;

  if (activeJobs.has(chatId)) {
    await ctx.reply('⏳ 이미 영상을 만들고 있어요! /status 로 확인하세요.');
    return;
  }

  activeJobs.set(chatId, {
    topic,
    status: 'running',
    step: '시작 중...',
    startTime: Date.now(),
  });

  await ctx.reply(`🏭 ReelzFactory 영상 생성 시작!\n\n🎯 주제: ${topic}\n⏱️ 예상 소요: 3~5분\n\n/status 로 진행 상황을 확인할 수 있어요.`);

  try {
    const result = await runFullPipeline({
      topic,
      language: 'ko',
      maxScenes: 4,
      voiceRate: '+10%',
    });

    if (result && result.videoPath) {
      // YouTube 업로드
      await ctx.reply('📤 YouTube 업로드 중...');

      const uploadResult = await uploadToYoutube({
        videoPath: result.videoPath,
        title: `${result.title || topic} 🎯`,
        description: `${topic}에 대한 AI 생성 쇼츠입니다.\n\n#AI쇼츠 #ReelzFactory #자동생성`,
        tags: ['AI', '쇼츠', topic],
        privacyStatus: 'unlisted',
      });

      if (uploadResult.success) {
        await ctx.reply(
          `🎉 ReelzFactory 완료!\n\n` +
          `📌 주제: ${topic}\n` +
          `🎬 제목: ${result.title || topic}\n` +
          `⏱️ 영상 길이: ${result.totalDuration || '30'}초\n` +
          `🔗 YouTube: ${uploadResult.videoUrl}\n\n` +
          `👆 링크를 눌러 확인하세요!`
        );
      } else {
        await ctx.reply(`⚠️ 영상은 만들었지만 YouTube 업로드 실패: ${uploadResult.error}`);
      }
    }
  } catch (error: any) {
    await ctx.reply(`❌ 에러 발생: ${error.message}`);
  } finally {
    activeJobs.delete(chatId);
  }
}
