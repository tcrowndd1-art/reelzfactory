// lib/notify.ts — 파이프라인 알림 (Console + localStorage + Telegram)

import type { PipelineNotification } from "@/types/pipeline";

function saveNotificationLog(notification: PipelineNotification): void {
  if (typeof window === "undefined") return;
  try {
    const key = "reelzfactory_notifications";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    existing.unshift({
      ...notification,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 100)));
  } catch {
    // localStorage 실패 시 무시
  }
}

async function sendTelegram(text: string): Promise<void> {
  try {
    const res = await fetch("/api/notify-telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) console.warn("Telegram notify failed:", res.status);
  } catch (err) {
    console.warn("Telegram notify error:", err);
  }
}

export async function notifyPipeline(notification: PipelineNotification): Promise<void> {
  const prefix = notification.severity === "critical" ? "🚨"
    : notification.severity === "warning" ? "⚠️" : "ℹ️";

  // 1. Console
  console.warn(`[PIPELINE ${prefix}] ${notification.type}: ${notification.details}`);

  // 2. localStorage
  saveNotificationLog(notification);

  // 3. Telegram (critical + warning만)
  if (notification.severity === "critical" || notification.severity === "warning") {
    await sendTelegram(`${prefix} [${notification.severity.toUpperCase()}]\n${notification.type}\n${notification.details}`);
  }
}
