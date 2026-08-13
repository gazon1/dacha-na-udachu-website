import type { BotContext } from '../session'

const HELP_TEXT =
  `📋 <b>Команды бота:</b>\n\n` +
  `/start — приветствие\n` +
  `/help — эта справка\n` +
  `/events — ближайшие события\n` +
  `/me — мои RSVP и взносы\n` +
  `/subscribe — подписаться на новые события\n` +
  `/unsubscribe — отписаться\n\n` +
  `На карточке события доступны кнопки:\n` +
  `🟢 Иду / 🟡 Может быть / 🔴 Не смогу / 💸 Скинуться`

export async function handleHelp(ctx: BotContext): Promise<void> {
  await ctx.reply(HELP_TEXT, { parse_mode: 'HTML' })
}
