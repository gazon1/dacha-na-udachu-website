import type { BotContext } from '../session'
import { getBotPayload } from '../db'
import { eventsListKeyboard, eventCardKeyboard } from '../keyboards/inline'
import { escapeHtml } from '../utils/escapeHtml'
import { formatDateShort, formatDate, truncate } from '../utils/format'

type Event = {
  id: string | number
  slug: string
  title: string
  startDate: string
  venue?: string | null
  summary?: string | null
  rsvpCapacity?: number | null
}

/**
 * /events — список ближайших 5 опубликованных событий.
 */
export async function handleEventsList(ctx: BotContext): Promise<void> {
  const payload = await getBotPayload()

  const now = new Date().toISOString()
  const res = await payload.find({
    collection: 'events',
    where: {
      and: [
        { startDate: { greater_than: now } },
        { _status: { equals: 'published' } },
      ],
    },
    sort: 'startDate',
    limit: 5,
    depth: 0,
    overrideAccess: true,
  })

  const events = res.docs as unknown as Event[]

  if (events.length === 0) {
    await ctx.reply('Ближайших событий пока нет. Загляни позже 👋')
    return
  }

  const lines = events.map(
    (e, i) => `${i + 1}. <b>${escapeHtml(e.title)}</b>\n   📅 ${formatDateShort(e.startDate)}`,
  )
  const text =
    `� <b>Ближайшие события:</b>\n\n` +
    lines.join('\n\n') +
    `\n\nНажми на событие, чтобы открыть карточку:`

  await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: eventsListKeyboard(events),
  })
}

/**
 * Inline-кнопка `open:<eventId>` — открывает карточку события.
 */
export async function handleEventOpen(
  ctx: BotContext,
  eventIdStr: string,
): Promise<void> {
  await ctx.answerCallbackQuery()
  const payload = await getBotPayload()

  let event: Event | undefined
  try {
    const res = await payload.findByID({
      collection: 'events',
      id: eventIdStr,
      depth: 0,
      overrideAccess: true,
    })
    event = res as unknown as Event
  } catch {
    await ctx.reply('Событие не найдено.')
    return
  }

  if (!event) {
    await ctx.reply('Событие не найдено.')
    return
  }

  const lines: string[] = []
  lines.push(`� <b>${escapeHtml(event.title)}</b>`)
  lines.push(`🗓 ${formatDate(event.startDate)}`)
  if (event.venue) lines.push(`📍 ${escapeHtml(event.venue)}`)
  if (event.summary) lines.push(`\n${escapeHtml(truncate(event.summary, 280))}`)

  await ctx.reply(lines.join('\n'), {
    parse_mode: 'HTML',
    reply_markup: eventCardKeyboard(event.id),
  })
}
