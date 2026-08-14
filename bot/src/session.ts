import type { Context, SessionFlavor } from 'grammy'

/**
 * Per-user session data attached to every grammY context.
 * Populated by middlewares/session.ts on each update.
 */
export type SessionData = {
  /** Telegram numeric user id (ctx.from.id as string). */
  telegramId: string
  /** Payload User.id, если бот знает этого юзера (есть в Users по telegramId). */
  userId: string | number | null
  /** Role из Users.role — 'admin' | 'user'. */
  role: 'admin' | 'user' | null
  /** Telegram first_name. */
  firstName: string | null
  /** Telegram @username. */
  username: string | null
  /** FSM для contribution — хранит промежуточное состояние ввода суммы. */
  fsm?: {
    /** Событие, для которого собирается взнос. */
    contributingToEventId?: string | number
    contributingToEventSlug?: string
    contributingToEventTitle?: string
    /** Сохранённая сумма на этапе подтверждения. */
    pendingAmount?: number
    /** Сохранённое сообщение на этапе подтверждения. */
    pendingMessage?: string
    /** Текущий шаг FSM. */
    step?: 'awaiting_custom_amount' | 'awaiting_message'
  }
}

export type BotContext = Context & SessionFlavor<SessionData>
