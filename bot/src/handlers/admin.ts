import { InlineKeyboard } from 'grammy'
import type { BotContext } from '../session'
import { getBotPayload } from '../db'
import type { NotifyCategory } from '../../../lib/telegram-notify'

const NOTIFY_CATEGORIES: { key: NotifyCategory; label: string; emoji: string }[] = [
  { key: 'contribution', label: 'Взносы', emoji: '💰' },
  { key: 'booking', label: 'Бронирования', emoji: '📅' },
  { key: 'newEvent', label: 'Новые события', emoji: '🎉' },
  { key: 'rsvp', label: 'RSVP', emoji: '✅' },
]

type SiteSettingsTelegramAdminsRow = {
  id?: string | number
  user?: { id: number | string; telegramId?: string | null }
  label?: string | null
  notifyOn?: Partial<Record<NotifyCategory, boolean>>
}

// ─── /admin command ───────────────────────────────────────────────────────

export async function handleAdmin(ctx: BotContext): Promise<void> {
  if (ctx.session.role !== 'admin') {
    await ctx.reply('⛔ Команда только для админов.')
    return
  }

  await showAdminPanel(ctx)
}

// ─── Show panel (reply or edit) ────────────────────────────────────────

async function showAdminPanel(ctx: BotContext, edit = false): Promise<void> {
  const settings = await loadSettings()
  const myRow = settings?.telegramAdmins?.find(
    (r) => String(r.user?.id) === String(ctx.session.userId),
  )

  const lines: string[] = ['🔔 <b>Админ-панель</b>\n']

  lines.push('<b>Ваши уведомления:</b>')
  for (const cat of NOTIFY_CATEGORIES) {
    const enabled = myRow?.notifyOn?.[cat.key] !== false
    const check = enabled ? '✅' : '❌'
    lines.push(`${check} ${cat.emoji} ${cat.label}`)
  }

  lines.push('')
  lines.push('<i>Используйте кнопки ниже, чтобы переключить категорию.</i>')

  // Build keyboard: 2 per row
  const kb = new InlineKeyboard()
  let col = 0
  for (const cat of NOTIFY_CATEGORIES) {
    const enabled = myRow?.notifyOn?.[cat.key] !== false
    const label = enabled ? `❌ Выкл: ${cat.label}` : `✅ Вкл: ${cat.label}`
    kb.text(label, `notif:toggle:${ctx.session.userId}:${cat.key}`)
    col++
    if (col % 2 === 0) kb.row()
  }
  if (col % 2 !== 0) kb.row()
  kb.row()
  kb.text('💰 Все переводы', 'admin:contributions')

  const msg = lines.join('\n')
  if (edit) {
    try {
      await ctx.editMessageText(msg, {
        parse_mode: 'HTML',
        reply_markup: kb,
      })
      return
    } catch {
      // Fall through to reply
    }
  }
  await ctx.reply(msg, { parse_mode: 'HTML', reply_markup: kb })
}

// ─── Toggle category callback ────────────────────────────────────────────

export async function handleNotifToggle(
  ctx: BotContext,
  userId: string,
  category: NotifyCategory,
): Promise<void> {
  if (ctx.session.role !== 'admin') return
  await ctx.answerCallbackQuery()

  // Only the targeted user can toggle their own settings.
  if (String(ctx.session.userId) !== userId) {
    await ctx.answerCallbackQuery({
      text: 'Вы можете менять только свои настройки.',
      show_alert: true,
    })
    return
  }

  const settings = await loadSettings()
  const admins = settings?.telegramAdmins ?? []
  const rowIndex = admins.findIndex(
    (r) => String(r.user?.id) === userId,
  )

  if (rowIndex === -1 || !settings) {
    await ctx.answerCallbackQuery({
      text: 'Вас нет в списке админов. Попросите другого админа добавить вас в SiteSettings.',
      show_alert: true,
    })
    return
  }

  const current = admins[rowIndex].notifyOn?.[category]
  const updated = current === false // toggle: false → true, true/undefined → false

  // Build updated array
  const newAdmins = admins.map((r, i) => {
    if (i !== rowIndex) return r
    return {
      ...r,
      notifyOn: { ...(r.notifyOn ?? {}), [category]: updated },
    }
  })

  try {
    const payload = await getBotPayload()
    await payload.updateGlobal({
      slug: 'site-settings',
      data: { telegramAdmins: newAdmins } as Record<string, unknown>,
      depth: 0,
      overrideAccess: true,
    })
  } catch (err) {
    console.error('[admin] failed to save notification preferences:', err)
    await ctx.answerCallbackQuery({
      text: 'Не удалось сохранить настройки. Попробуйте позже.',
      show_alert: true,
    })
    return
  }

  await showAdminPanel(ctx, true)
}

// ─── All contributions summary ───────────────────────────────────────────

export async function handleAdminContributions(ctx: BotContext): Promise<void> {
  if (ctx.session.role !== 'admin') return
  await ctx.answerCallbackQuery()

  const payload = await getBotPayload()

  const contribs = await payload.find({
    collection: 'event-contributions',
    sort: '-createdAt',
    limit: 500,
    depth: 0,
    overrideAccess: true,
  })

  type Contrib = {
    id: string | number
    status: 'pending' | 'confirmed' | 'rejected'
    amount: number
    name: string
    createdAt?: string
    confirmedAt?: string
  }
  const docs = contribs.docs as Contrib[]

  const pending = docs.filter((c) => c.status === 'pending')
  const confirmed = docs.filter((c) => c.status === 'confirmed')
  const rejected = docs.filter((c) => c.status === 'rejected')

  const totalPending = pending.reduce((s, c) => s + c.amount, 0)
  const totalConfirmed = confirmed.reduce((s, c) => s + c.amount, 0)
  const totalRejected = rejected.reduce((s, c) => s + c.amount, 0)

  const lines: string[] = [
    `💰 <b>Переводы</b> (всего ${docs.length})\n`,
    `⏳ pending: ${pending.length} шт., ${totalPending.toLocaleString('ru-RU')} ₽`,
    `✅ confirmed: ${confirmed.length} шт., ${totalConfirmed.toLocaleString('ru-RU')} ₽`,
    `⚠️ rejected: ${rejected.length} шт., ${totalRejected.toLocaleString('ru-RU')} ₽`,
    '',
    '<b>Последние 10:</b>',
  ]

  const recent = docs.slice(0, 10)
  const statusEmoji: Record<string, string> = {
    pending: '⏳',
    confirmed: '✅',
    rejected: '⚠️',
  }
  for (const c of recent) {
    const age = c.confirmedAt ?? c.createdAt ?? ''
    const ageStr = age ? ' — ' + relativeAge(age) : ''
    lines.push(
      `${statusEmoji[c.status] ?? '?'} <b>${c.name}</b> — ${c.amount.toLocaleString('ru-RU')} ₽${ageStr}`,
    )
  }

  const kb = new InlineKeyboard().text('◀️ Назад', 'admin:back')

  await ctx.reply(lines.join('\n'), { parse_mode: 'HTML', reply_markup: kb })
}

// ─── Back to admin panel ─────────────────────────────────────────────────

export async function handleAdminBack(ctx: BotContext): Promise<void> {
  if (ctx.session.role !== 'admin') return
  await ctx.answerCallbackQuery()
  await showAdminPanel(ctx, true)
}

// ─── Helpers ─────────────────────────────────────────────────────────────

async function loadSettings(): Promise<{ telegramAdmins?: SiteSettingsTelegramAdminsRow[] } | null> {
  try {
    const payload = await getBotPayload()
    return (await payload.findGlobal({
      slug: 'site-settings',
      depth: 1,
    })) as { telegramAdmins?: SiteSettingsTelegramAdminsRow[] } | null
  } catch {
    return null
  }
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
