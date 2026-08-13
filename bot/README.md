# Dacha Telegram Bot

Telegram-бот для сайта [dacha.maxdrobin.ru](https://dacha.maxdrobin.ru).
Делит PostgreSQL с основным Next.js + Payload CMS приложением через
[Payload Local API](https://payloadcms.com/docs/local-api/overview).

## Что умеет

- `/start`, `/help`, `/me` — базовые команды
- `/events` — список ближайших событий с inline-кнопками RSVP
- Inline-кнопка «Скинуться» — переход к форме ввода суммы → оплата ЮMoney
- `/subscribe`, `/unsubscribe` — push о новых событиях
- Уведомления админа (через `notifyAdmin` из `lib/telegram-notify.ts`) — уже было

## Архитектура

- **Webhook** на `https://bot.maxdrobin.ru/webhook` — Caddy проксирует на `:3001`
- Express на 3001: `POST /webhook` (Telegram), `POST /internal/broadcast-event`
  (от основного app при создании события), `GET /healthz` (Docker healthcheck)
- БД — `getPayload({ config })` из `lib/payload.ts`, та же конфигурация, что у `app`
- Тот же `TELEGRAM_BOT_TOKEN` (тот же бот, что для Login Widget)

## Локальный запуск

```bash
cd bot
npm install
npm run dev          # tsx watch, long polling — webhook не нужен локально
```

Требует `.env` в корне проекта с:
- `TELEGRAM_BOT_TOKEN`
- `DATABASE_URI`
- `PAYLOAD_SECRET`
- `PAYLOAD_PUBLIC_SERVER_URL` (для URL-кнопок)

## Прод-деплой

`docker-compose.yml` запускает бот-сервис с командой
`npx tsx bot/src/index.ts`. Healthcheck на `http://localhost:3001/healthz`.

## Добавление новых команд

1. Создай handler в `src/handlers/myCommand.ts`:
   ```ts
   import type { Context } from 'grammy'
   export async function handleMyCommand(ctx: Context) {
     await ctx.reply('Hello!')
   }
   ```
2. Зарегистрируй в `src/index.ts`:
   ```ts
   import { handleMyCommand } from './handlers/myCommand'
   bot.command('mycommand', handleMyCommand)
   ```
3. Перезапусти бот.
