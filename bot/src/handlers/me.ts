import type { BotContext } from '../session'
import { getBotPayload } from '../db'
import { escapeHtml } from '../utils/escapeHtml'
import { formatDate, formatRub, pluralRubles, truncate } from '../utils/format'
import { siteUrl } from '../utils/url'
import { handleTransferCheck } from './transfer-check'

/**
 * /me — мои RSVP и взносы.
 *
 * If userId === null we still show RSVP (since ensureUser was added) but
 * contributions need a linked user.
 */
export async function handleMe(ctx: BotContext): Promise<void> {
  const userId = ctx.session.userId
  const payload = await getBotPayload()

  // ── RSVP ────────────────────────────────────────────────────────────────
  const rsvps = await payload.find({
    collection: 'event-rsvps',
    where: { user: { equals: userId ?? -1 } },
    sort: '-createdAt',
    limit: 20,
    depth: 1,
    overrideAccess: true,
  })

  type Rsvp = {
    status: 'going' | 'maybe' | 'not_going' | 'waiting'
    guestsCount?: number
    event?: { id: string | number; title?: string; slug?: string; startDate?: string }
  }
  const rsvpsList = rsvps.docs as Rsvp[]
  const going = rsvpsList.filter((r) => r.status === 'going')
  const maybe = rsvpsList.filter((r) => r.status === 'maybe')
  const now = Date.now()
  const upcomingGoing = going.filter(
    (r) => r.event?.startDate && new Date(r.event.startDate).getTime() > now,
  )

  // ── Contributions ──────────────────────────────────────────────────────
  const contribs = await payload.find({
    collection: 'event-contributions',
    where: { user: { equals: userId ?? -1 } },
    sort: '-createdAt',
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })

  type Contrib = {
    id: string | number
    secretKey: string
    status: 'pending' | 'confirmed' | 'rejected'
    amount: number
    event?: string | number
    createdAt?: string
    confirmedAt?: string
    message?: string | null
  }
  const contribsList = (contribs.docs as Contrib[]).filter(Boolean)

  const pending = contribsList.filter((c) => c.status === 'pending')
  const confirmed = contribsList.filter((c) => c.status === 'confirmed')
  const rejected = contribsList.filter((c) => c.status === 'rejected')

  const totalPending = pending.reduce((s, c) => s + c.amount, 0)
  const totalConfirmed = confirmed.reduce((s, c) => s + c.amount, 0)
  const totalRejected = rejected.reduce((s, c) => s + c.amount, 0)

  // ── Build text ──────────────────────────────────────────────────────────
  let text = '📋 <b>Твой профиль:</b>\n\n'

  text += `📅 <b>RSVP:</b> идёшь на ${upcomingGoing.length} впереди, всего «иду» ${going.length}, «может быть» ${maybe.length}\n`

  if (upcomingGoing.length > 0) {
    text += '\n<b>Ближайшие:</b>\n'
    for (const r of upcomingGoing.slice(0, 3)) {
      const t = r.event?.title ?? '—'
      const d = r.event?.startDate ? formatDate(r.event.startDate) : ''
      text += `  • ${escapeHtml(truncate(t, 40))} — ${d}\n`
    }
  }

  // ── Contributions by status ────────────────────────────────────────────
  const hasContribs = contribsList.length > 0
  const contribHeader = hasContribs
    ? `\n💰 <b>Переводы:</b>`
    : `\n💰 <b>Переводов пока нет</b>`

  text += contribHeader

  if (pending.length > 0) {
    text += `\n\n⏳ <b>Ожидают подтверждения</b> — ${pending.length} шт., ${formatRub(totalPending)}`
    for (const c of pending.slice(0, 5)) {
      const age = c.createdAt ? relativeAge(c.createdAt) : ''
      text += `\n  • ${formatRub(c.amount)}${age ? ` (${age})` : ''}`
    }
  }

  if (confirmed.length > 0) {
    text += `\n\n✅ <b>Подтверждены</b> — ${confirmed.length} шт., ${formatRub(totalConfirmed)}`
    for (const c of confirmed.slice(0, 5)) {
      const age = c.confirmedAt ? relativeAge(c.confirmedAt) : ''
      text += `\n  • ${formatRub(c.amount)}${age ? ` (${age})` : ''}`
    }
  }

  if (rejected.length > 0) {
    text += `\n\n⚠️ <b>Отклонены</b> — ${rejected.length} шт., ${formatRub(totalRejected)}`
    for (const c of rejected.slice(0, 3)) {
      text += `\n  • ${formatRub(c.amount)} — сумма не совпала`
    }
  }

  // ── Build inline keyboard ───────────────────────────────────────────────
  // "Проверить" button for each pending contribution.
  const keyboardRows: { text: string; callback_data: string }[][] = []
  for (const c of pending) {
    keyboardRows.push([{
      text: `🔄 Проверить: ${formatRub(c.amount)}`,
      callback_data: `pay:check:${c.secretKey}`,
    }])
  }

  await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: keyboardRows.length > 0
      ? { inline_keyboard: keyboardRows }
      : undefined,
  })
}

function relativeAge(isoString: string): string {
  const ms = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(ms / 60_000)
  if (mins < 1) return 'только что'
  if (mins < 60) return `${mins} мин. назад`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} ч. назад`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'вчера'
  if (days < 7) return `${days} дн. назад`
  if (days < 30) return `${Math.floor(days / 7)} нед. назад`
  return `${Math.floor(days / 30)} мес. назад`
}
