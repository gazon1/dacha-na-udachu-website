/**
 * Send a message to the configured Telegram admin chat.
 *
 * Reuses the existing TELEGRAM_BOT_TOKEN used by the Login Widget — no new
 * token required. Set TELEGRAM_ADMIN_CHAT_ID to the numeric chat id where
 * notifications should land (private chat: positive int; group/channel: negative).
 *
 * Silently no-ops if either env var is missing — callers (e.g. the
 * EventContributions afterChange hook) can fire-and-forget without breaking
 * the surrounding flow.
 *
 * Failures are logged via console.error so they show up in the Payload
 * server log; they never throw.
 *
 * @see https://core.telegram.org/bots/api#sendmessage
 */
export async function notifyAdmin(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID
  if (!token || !chatId) return

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })
    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      console.error('[telegram-notify] non-OK:', res.status, errBody)
    }
  } catch (err) {
    console.error('[telegram-notify] failed:', err)
  }
}
