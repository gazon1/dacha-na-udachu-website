import type { BotContext } from '../session'
import { config } from '../config'

/**
 * /start — приветствие.
 * Если юзер уже логинился через Telegram Login Widget на сайте — используем
 * firstName из Users. Иначе — first_name из ctx.from.
 */
export async function handleStart(ctx: BotContext): Promise<void> {
  const name = ctx.session.firstName ?? ctx.from?.first_name ?? 'друг'
  const knownUser = ctx.session.userId !== null

  const text =
    `Привет, ${name}! 👋\n\n` +
    `Я бот дачного сообщества «Дача на удачу». ` +
    (knownUser
      ? 'Ты залогинен через сайт — `/me` покажет твои записи и взносы.'
      : 'Залогинься через сайт и вернись — `/me` будет показывать твои записи и взносы.') +
    `\n\n` +
    `Команды: /events, /me, /subscribe, /help`

  await ctx.reply(text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🌐 Открыть сайт', url: config.PAYLOAD_PUBLIC_SERVER_URL ?? 'https://dacha.maxdrobin.ru' }],
        [{ text: '📅 Ближайшие события', callback_data: 'cmd:events' }],
      ],
    },
  })
}
