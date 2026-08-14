import type { BotContext } from '../session'
import { siteUrl } from '../utils/url'

/**
 * /start — приветствие.
 * Если юзер уже логинился через Telegram Login Widget на сайте — используем
 * firstName из Users. Инача — first_name из ctx.from.
 */
export async function handleStart(ctx: BotContext): Promise<void> {
  const name = ctx.session.firstName ?? ctx.from?.first_name ?? 'друг'
  const knownUser = ctx.session.userId !== null

  const greeting = `Привет, ${name}! 👋`
  const capabilities = [
    '📅 <b>/events</b> — ближайшие события',
    '📋 <b>/me</b> — мои записи и взносы',
    '🔔 <b>/subscribe</b> — подписаться на анонсы',
    '❌ <b>/unsubscribe</b> — отписаться',
    'ℹ️ <b>/help</b> — справка',
  ]

  let text = `${greeting}\n\n`
  text += `${capabilities.join('\n')}\n\n`
  if (knownUser) {
    text += `Ты залогинен через сайт — <b>/me</b> покажет твои записи и взносы.`
    if (ctx.session.role === 'admin') {
      text += '\n\n👋 Вы админ. Команда <b>/admin</b> открывает панель уведомлений и переводов.'
    }
  } else {
    text +=
      `Чтобы видеть свои записи и взносы — <a href="${siteUrl('login')}">войди через сайт</a> ` +
      `и вернись в бот.`
  }

  await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🌐 Открыть сайт', url: siteUrl() }],
        [{ text: '📅 Ближайшие события', callback_data: 'cmd:events' }],
      ],
    },
  })
}
