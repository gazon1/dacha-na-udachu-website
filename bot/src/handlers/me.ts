import type { BotContext } from '../session'
import { getBotPayload } from '../db'
import { escapeHtml } from '../utils/escapeHtml'
import { formatDate, formatRub, pluralRubles } from '../utils/format'

/**
 * /me — мои RSVP и взносы.
 *
 * Если userId === null — юзер не логинился через сайт, нечего показывать.
 */
export async function handleMe(ctx: BotContext): Promise<void> {
  const userId = ctx.session.userId
  if (!userId) {
    await ctx.reply(
      'Чтобы видеть свои записи и взносы, сначала войди через сайт:\n' +
        '1. Открой [dacha.maxdrobin.ru](https://dacha.maxdrobin.ru)\n' +
        '2. Нажми «Войти через Telegram»\n' +
        '3. Вернись в бот и попробуй /me ещё раз',
    )
    return
  }

  const payload = await getBotPayload()

  // RSVP
  const rsvps = await payload.find({
    collection: 'event-rsvps',
    where: { user: { equals: userId } },
    sort: '-createdAt',
    limit: 20,
    depth: 1,
    overrideAccess: true,
  })

  const rsvpsList = rsvps.docs as Array<{
    id: string | number
    status: 'going' | 'maybe' | 'not_going' | 'waiting'
    guestsCount?: number
    event?: { id: string | number; title?: string; slug?: string; startDate?: string }
  }>

  const going = rsvpsList.filter((r) => r.status === 'going')
  const maybe = rsvpsList.filter((r) => r.status === 'maybe')
  const now = Date.now()
  const upcomingGoing = going.filter(
    (r) => r.event?.startDate && new Date(r.event.startDate).getTime() > now,
  )

  // Contributions
  const contribs = await payload.find({
    collection: 'event-contributions',
    where: {
      and: [
        { user: { equals: userId } },
        { status: { equals: 'confirmed' } },
      ],
    },
    sort: '-confirmedAt',
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })

  const contribsList = contribs.docs as Array<{ amount: number; event?: string | number }>
  const totalContrib = contribsList.reduce((s, c) => s + c.amount, 0)

  let text = '� <b>Твой профиль:</b>\n\n'

  text += `📅 <b>RSVP:</b> идёшь на ${upcomingGoing.length} впереди, всего «иду» ${going.length}, «может быть» ${maybe.length}\n`

  if (upcomingGoing.length > 0) {
    text += '\n<b>Ближайшие:</b>\n'
    for (const r of upcomingGoing.slice(0, 3)) {
      const t = r.event?.title ?? '—'
      const d = r.event?.startDate ? formatDate(r.event.startDate) : ''
      text += `  • ${escapeHtml(t)} — ${d}\n`
    }
  }

  text += `\n💸 <b>Взносы:</b> ${formatRub(totalContrib)} всего, ${contribsList.length} ${pluralRubles(contribsList.length)}\n`

  await ctx.reply(text, { parse_mode: 'HTML' })
}
