import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { buildConfig } from 'payload'

import { Media } from './collections/Media'
import { Houses } from './collections/Houses'
import { Events } from './collections/Events'
import { News } from './collections/News'
import { FAQ } from './collections/FAQ'
import { Bookings } from './collections/Bookings'
import { EventRsvps } from './collections/EventRsvps'
import { EventDrivers } from './collections/EventDrivers'
import { RidePassengers } from './collections/RidePassengers'
import { CarpoolRequests } from './collections/CarpoolRequests'
import { TaxiPools } from './collections/TaxiPools'
import { TaxiPassengers } from './collections/TaxiPassengers'
import { Users } from './collections/Users'
import { NewsletterSignups } from './collections/NewsletterSignups'
import { ExtraServices } from './collections/ExtraServices'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Email adapter — only register when SMTP_HOST is set. Avoids
// "ECONNREFUSED 127.0.0.1:587" errors during `payload generate:types`
// in dev where SMTP isn't running.
async function buildEmail() {
  if (!process.env.SMTP_HOST) return undefined
  const { nodemailerAdapter } = await import('@payloadcms/email-nodemailer')
  return nodemailerAdapter({
    defaultFromName: process.env.EMAIL_FROM_NAME || 'Dacha CMS',
    defaultFromAddress: process.env.EMAIL_FROM || 'noreply@dacha.maxdrobin.ru',
    transportOptions: {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASSWORD || '',
      },
    },
  })
}

export default buildConfig({
  email: await buildEmail(),
  // --- Core ---
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000',
  secret: process.env.PAYLOAD_SECRET || 'change-me-in-production-please-use-long-random-string',
  cors: [process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'],
  csrf: [process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'],

  // --- Performance ---
  // Auto-indexes all sortable top-level fields (saves a lot of manual index: true).
  indexSortableFields: true,

  // --- Database ---
  db: postgresAdapter({
    pool: {
      connectionString:
        process.env.DATABASE_URI ||
        'postgres://postgres:postgres@localhost:5432/dacha_payload',
    },
    // Shared transaction isolation for multi-step Local API calls.
    transactionOptions: { isolationLevel: 'read committed' },
  }),

  // --- Bin scripts ---
  // Run via `pnpm seed` (script registered in package.json).
  bin: [
    { key: 'seed', scriptPath: path.resolve(dirname, 'scripts/seed.ts') },
  ],

  // --- Editor ---
  editor: lexicalEditor(),

  // --- Image processing ---
  sharp,

  // --- Admin ---
  admin: {
    user: Users.slug,
    meta: { titleSuffix: ' — Dacha CMS' },
    livePreview: {
      collections: ['houses', 'events', 'news', 'faq'],
      breakpoints: [
        { name: 'mobile', width: 375, height: 667, label: 'Mobile' },
        { name: 'tablet', width: 768, height: 1024, label: 'Tablet' },
        { name: 'desktop', width: 1440, height: 900, label: 'Desktop' },
      ],
    },
  },

  // --- Collections ---
  collections: [
    Users,
    Media,
    Houses,
    Events,
    News,
    FAQ,
    Bookings,
    EventRsvps,
    EventDrivers,
    RidePassengers,
    CarpoolRequests,
    TaxiPools,
    TaxiPassengers,
    NewsletterSignups,
    ExtraServices,
  ],

  // --- TypeScript ---
  typescript: {
    outputFile: path.resolve(dirname, 'src/payload-types.ts'),
  },

  // --- GraphQL ---
  graphQL: {
    disable: false,
  },

  // --- Logging ---
  logger: {
    options: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  },
})