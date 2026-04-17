import { Context } from 'telegraf';

export async function handleStatus(ctx: Context) {
  await ctx.reply('🔍 시스템 상태 확인 중...');

  const results: string[] = [];
  results.push('📊 *ReelzFactory 시스템 상태*\n');
  results.push('✅ 봇: 온라인');

  try {
    const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}` }
    });
    if (res.ok) {
      results.push('✅ AI (OpenRouter): 연결됨');
    } else {
      results.push('❌ AI (OpenRouter): 연결 실패');
    }
  } catch {
    results.push('❌ AI (OpenRouter): 연결 실패');
  }

  try {
    const res = await fetch('https://api.replicate.com/v1/account', {
      headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}` }
    });
    if (res.ok) {
      results.push('✅ 이미지 (Replicate): 연결됨');
    } else {
      results.push('❌ 이미지 (Replicate): 연결 실패');
    }
  } catch {
    results.push('❌ 이미지 (Replicate): 연결 실패');
  }

  try {
    const apiKey = process.env.GOOGLE_TTS_API_KEY;
    if (apiKey) {
      const res = await fetch(
        `https://texttospeech.googleapis.com/v1/voices?languageCode=ko-KR&key=${apiKey}`
      );
      if (res.ok) {
        const data = await res.json();
        results.push(`✅ 음성 (Google TTS): 연결됨 | ${data.voices?.length || 0}개 음성`);
      } else {
        results.push('❌ 음성 (Google TTS): 연결 실패');
      }
    } else {
      results.push('⚠️ 음성 (Google TTS): API 키 없음');
    }
  } catch {
    results.push('❌ 음성 (Google TTS): 연결 실패');
  }

  const hasYT = process.env.YOUTUBE_CLIENT_ID &&
                process.env.YOUTUBE_CLIENT_SECRET &&
                process.env.YOUTUBE_REFRESH_TOKEN;
  results.push(hasYT ? '✅ YouTube: API 설정 완료' : '⚠️ YouTube: 인증 정보 부족');

  const voice = process.env.TTS_VOICE || 'ko-KR-Neural2-C';
  results.push(`\n🎙️ 현재 음성: ${voice}`);
  results.push('💰 예상 비용: ~$0.25/영상');
  results.push(`\n⏰ ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);

  await ctx.reply(results.join('\n'), { parse_mode: 'Markdown' });
}
