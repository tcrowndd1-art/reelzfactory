import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return NextResponse.json({ error: "Telegram not configured" }, { status: 200 });
  }

  try {
    const { text } = await req.json();

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🎬 ReelzFactory\n${text}`,
        parse_mode: "HTML",
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Telegram send error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}