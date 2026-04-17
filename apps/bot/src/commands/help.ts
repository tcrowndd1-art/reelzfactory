import { Context } from 'grammy';

export async function helpCommand(ctx: Context) {
  const helpText = `
🏭 *ReelzFactory Bot*

AI가 자동으로 유튜브 쇼츠를 만들어줍니다!

📋 *명령어 목록:*

/make \`주제\` — 쇼츠 영상 생성
  예: /make 비트코인 1억 돌파 이유
  예: /make 2026년 AI가 대체할 직업

/status — 현재 작업 상태 확인

/help — 도움말 보기

⏱️ 영상 생성은 약 3~5분 소요됩니다.
💰 1회 생성 비용: ~$0.25
  `;

  await ctx.reply(helpText, { parse_mode: 'Markdown' });
}
