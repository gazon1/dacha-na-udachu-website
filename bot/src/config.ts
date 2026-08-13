import { z } from 'zod'

/**
 * Zod-валидация env. Бот падает на старте если что-то не так — лучше
 * упасть сейчас, чем странно себя вести в проде.
 */
const ConfigSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(20, 'TELEGRAM_BOT_TOKEN is required'),
  DATABASE_URI: z.string().min(1),
  PAYLOAD_SECRET: z.string().min(1),
  PAYLOAD_PUBLIC_SERVER_URL: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  WEBHOOK_URL: z.string().url().optional(),
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
