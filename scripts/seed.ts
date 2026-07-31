import type { SanitizedConfig } from 'payload'
import payload from 'payload'

/**
 * Seed script — populates a fresh database with realistic starter content.
 *
 * Run via: `pnpm seed` (registers `keyframes` in package.json).
 *
 * Safe to re-run: every entry is checked by slug before creation.
 *
 * Required env vars:
 *   PAYLOAD_SEED_ADMIN_EMAIL       — admin email
 *   PAYLOAD_SEED_ADMIN_PASSWORD    — admin password (min 8 chars)
 * Optional but recommended:
 *   DATABASE_URI                    — DB connection string
 */

type SeedConfig = {
  adminEmail: string
  adminPassword: string
}

const extras = [
  { slug: 'banya', name: 'Баня', price: 500, order: 1 },
  { slug: 'manhal', name: 'Мангальная зона', price: 300, order: 2 },
  { slug: 'fishing', name: 'Рыбалка', price: 200, order: 3 },
  { slug: 'bikes', name: 'Велосипеды', price: 150, order: 4 },
]

const faqItems = [
  {
    question: 'Можно ли с животными?',
    answer: 'Да, небольшие дружелюбные животные приветствуются. Просим заранее согласовать размер породы.',
  },
  {
    question: 'Есть ли Wi-Fi?',
    answer: 'Да, скорость 100 Мбит/с, оптика. Покрытие есть на всей территории.',
  },
  {
    question: 'Какое время заезда и выезда?',
    answer: 'Стандартное время заезда — с 15:00, выезд — до 12:00. Возможны ранние заезды и поздние выезды по согласованию.',
  },
  {
    question: 'Нужно ли бронировать баню заранее?',
    answer: 'Да, баня популярна — лучше бронировать минимум за 1-2 дня.',
  },
  {
    question: 'Есть ли парковка?',
    answer: 'Да, на территории 4 машиноместа, плюс дополнительная парковка у входа.',
  },
  {
    question: 'Можно ли арендовать только мангальную зону?',
    answer: 'Да, мангальная зона доступна отдельно от дома — 300 ₽/час, минимум 2 часа.',
  },
]

export const script = async (config: SanitizedConfig) => {
  const seedConfig = readSeedConfig()
  await payload.init({ config })

  payload.logger.info('Running seed script...')

  // ExtraServices
  for (const e of extras) {
    const exists = await payload.find({
      collection: 'extra-services',
      where: { slug: { equals: e.slug } },
      limit: 1,
    })
    if (exists.totalDocs === 0) {
      await payload.create({
        collection: 'extra-services',
        data: { ...e, isActive: true },
      })
      payload.logger.info(`Created extra-service: ${e.slug}`)
    }
  }

  // FAQ (single-instance record with slug 'faq')
  const faqExists = await payload.find({
    collection: 'faq',
    where: { slug: { equals: 'faq' } },
    limit: 1,
  })
  if (faqExists.totalDocs === 0) {
    await payload.create({
      collection: 'faq',
      data: {
        slug: 'faq',
        title: 'Вопросы и ответы',
        intro: [],
        faqItems,
      },
    })
    payload.logger.info('Created FAQ page')
  }

  // Sample House
  const houses = await payload.find({
    collection: 'houses',
    limit: 1,
  })
  if (houses.totalDocs === 0) {
    await payload.create({
      collection: 'houses',
      data: {
        slug: 'main-house',
        title: 'Главный дом',
        summary:
          'Уютный деревянный дом на 6 гостей с камином, панорамными окнами и выходом к реке.',
        capacity: 6,
        bedrooms: 3,
        address: 'Московская область, д. Дача на удачу',
        basePrice: 8000,
        bookingEnabled: true,
        body: [],
      },
    })
    payload.logger.info('Created sample house: main-house')
  }

  // Admin user — from env vars
  const adminEmail = seedConfig.adminEmail
  const adminExists = await payload.find({
    collection: 'users',
    where: { email: { equals: adminEmail } },
    limit: 1,
  })
  if (adminExists.totalDocs === 0) {
    await payload.create({
      collection: 'users',
      data: {
        email: adminEmail,
        password: seedConfig.adminPassword,
        // synthetic telegramId — must be unique; prefix admin- so it's clear
        telegramId: `admin-${adminEmail}`,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
      },
    })
    payload.logger.info(`Created admin user: ${adminEmail}`)
  } else {
    payload.logger.info(`Admin user already exists: ${adminEmail}`)
  }

  payload.logger.info('Seed complete.')
  process.exit(0)
}

function readSeedConfig(): SeedConfig {
  const adminEmail = process.env.PAYLOAD_SEED_ADMIN_EMAIL
  const adminPassword = process.env.PAYLOAD_SEED_ADMIN_PASSWORD
  if (!adminEmail || !adminPassword) {
    throw new Error(
      'Missing required env vars: PAYLOAD_SEED_ADMIN_EMAIL and PAYLOAD_SEED_ADMIN_PASSWORD',
    )
  }
  if (adminPassword.length < 8) {
    throw new Error('PAYLOAD_SEED_ADMIN_PASSWORD must be at least 8 characters')
  }
  return { adminEmail, adminPassword }
}
