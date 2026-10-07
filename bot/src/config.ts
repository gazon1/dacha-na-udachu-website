import { z } from 'zod'

/**
 * Zod-валидация env. Бот падает на старте если что-то не так — лучше
 * упасть сейчас, чем странно себя вести в проде.
 */

// Telegram: 1-256 chars, only A-Z a-z 0-9 _ and -.
const WEBHOOK_SECRET = z
  .string()
  .min(1, 'TELEGRAM_WEBHOOK_SECRET must not be empty')
  .max(256, 'TELEGRAM_WEBHOOK_SECRET must be at most 256 characters')
  .regex(
    /^[A-Za-z0-9_-]+$/,
    'TELEGRAM_WEBHOOK_SECRET may only contain A-Z, a-z, 0-9, _ and -',
  )

const ConfigSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(20, 'TELEGRAM_BOT_TOKEN is required'),
  DATABASE_URI: z.string().min(1),
  PAYLOAD_SECRET: z.string().min(1),
  PAYLOAD_PUBLIC_SERVER_URL: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  WEBHOOK_URL: z.string().url().optional(),
  // Shared secret Telegram echoes back in X-Telegram-Bot-Api-Secret-Token on
  // every update. Without it, anyone can POST a forged update to our public
  // /webhook URL and the bot would act on it as a real message — including
  // impersonating a known admin telegramId and reaching /admin.
  TELEGRAM_WEBHOOK_SECRET: WEBHOOK_SECRET.optional(),
  BOT_PORT: z.coerce.number().int().positive().default(3001),
  INTERNAL_API_SECRET: z.string().min(16).optional(),
})

const parsed = ConfigSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid bot environment:')
  for (const issue of parsed.error.issues) {
    console.error(`   ${issue.path.join('.')}: ${issue.message}`)
  }
  process.exit(1)
}

export const config = parsed.data

/**
 * Бот может работать в двух режимах:
 *  - WEBHOOK (production): TELEGRAM шлёт push на WEBHOOK_URL. Используется
 *    в Docker через Caddy (bot.maxdrobin.ru → bot:3001/webhook).
 *  - LONG_POLLING (dev): бот сам тянет апдейты. Удобно локально без ngrok.
 *
 * Переключается автоматически: если WEBHOOK_URL задан и NODE_ENV=production —
 * webhook, иначе polling.
 */
export const useWebhook =
  config.NODE_ENV === 'production' && Boolean(config.WEBHOOK_URL)

/**
 * Fail closed: a production webhook endpoint is publicly reachable through
 * Caddy, so serving it without a shared secret would let anyone POST forged
 * updates — including updates claiming to come from a known admin telegramId,
 * which is how sessionMiddleware decides `role: 'admin'`.
 *
 * Refusing to start is deliberate: the alternative is running the bot in a
 * state where the admin panel can be reached by anyone who guesses a user id.
 */
if (useWebhook && !config.TELEGRAM_WEBHOOK_SECRET) {
  console.error(
    '❌ TELEGRAM_WEBHOOK_SECRET is required in webhook mode.\n' +
      '   The /webhook endpoint is public — without a shared secret anyone could\n' +
      '   POST forged updates and impersonate any telegramId, including admins.\n' +
      '   Generate one with:  openssl rand -hex 32\n' +
      '   Then add it to .env next to WEBHOOK_URL.',
  )
  process.exit(1)
}
