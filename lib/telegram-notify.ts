/**
 * Send a Telegram message to one or more admin recipients, filtered by
 * notification category.
 *
 * Routing is driven by SiteSettings.telegramAdmins (admin-editable), not
 * by .env.  Each recipient can independently opt in or out of each category
 * (contribution / booking / newEvent / rsvp).
 *
 * chat_id for each recipient is taken from User.telegramId — for private chats
 * it equals ctx.from.id, for groups/channels it would be a negative ID (future
 * extension: add an explicit `explicitChatId` field to the SiteSettings row).
 *
 * Silently no-ops if TELEGRAM_BOT_TOKEN is missing, if SiteSettings has no
 * telegramAdmins rows, or if no recipient is subscribed to the given category.
 * Callers can fire-and-forget without breaking the surrounding flow.
 *
 * @see https://core.telegram.org/bots/api#sendmessage
 */

import { getPayloadClient } from './payload'

export type NotifyCategory = 'contribution' | 'booking' | 'newEvent' | 'rsvp'

type SiteSettingsTelegramAdminsRow = {
  id?: string | number
  user?: { id: number | string; telegramId?: string | null }
  label?: string | null
  notifyOn?: Partial<Record<NotifyCategory, boolean>>
}

export async function notifyAdmin(
  text: string,
  category: NotifyCategory,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return // silent no-op — TELEGRAM_BOT_TOKEN not set

  const payload = await getPayloadClient()

  let settings: { telegramAdmins?: SiteSettingsTelegramAdminsRows } | null = null
  try {
    settings = (await payload.findGlobal({
      slug: 'site-settings',
      depth: 1,
    })) as { telegramAdmins?: SiteSettingsTelegramAdminsRows } | null
  } catch {
    // SiteSettings might not exist yet (fresh install) — no-op
    return
  }

  const admins: SiteSettingsTelegramAdminsRows =
    settings?.telegramAdmins ?? []

  if (admins.length === 0) return // no recipients configured — no-op

  await Promise.allSettled(
    admins.map(async (row) => {
      const chatId = row.user?.telegramId
      if (!chatId) return

      // Opt-out: explicitly false means the user disabled this category.
      if (row.notifyOn?.[category] === false) return

      try {
        const res = await fetch(
          `https://api.telegram.org/bot${token}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text,
              parse_mode: 'HTML',
              disable_web_page_preview: true,
            }),
          },
        )
        if (!res.ok) {
          const errBody = await res.text().catch(() => '')
          console.error(
            '[telegram-notify] non-OK:',
            res.status,
            chatId,
            errBody,
          )
        }
      } catch (err) {
        console.error('[telegram-notify] send failed for', chatId, err)
      }
    }),
  )
}

// Helper type to keep the cast concise
type SiteSettingsTelegramAdminsRows = SiteSettingsTelegramAdminsRow[]
