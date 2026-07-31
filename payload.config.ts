import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import path from "path";
import { buildConfig } from "payload";
import sharp from "sharp";
import { fileURLToPath } from "url";

import { Bookings } from "./collections/Bookings";
import { CarpoolRequests } from "./collections/CarpoolRequests";
import { EventDrivers } from "./collections/EventDrivers";
import { EventRsvps } from "./collections/EventRsvps";
import { Events } from "./collections/Events";
import { ExtraServices } from "./collections/ExtraServices";
import { FAQ } from "./collections/FAQ";
import { Houses } from "./collections/Houses";
import { Media } from "./collections/Media";
import { News } from "./collections/News";
import { NewsletterSignups } from "./collections/NewsletterSignups";
import { RidePassengers } from "./collections/RidePassengers";
import { SiteSettings } from "./collections/SiteSettings";
import { TaxiPassengers } from "./collections/TaxiPassengers";
import { TaxiPools } from "./collections/TaxiPools";
import { Users } from "./collections/Users";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// Email adapter — only register when SMTP_HOST is set. Avoids
// "ECONNREFUSED 127.0.0.1:587" errors during `payload generate:types`
// in dev where SMTP isn't running.
async function buildEmail() {
  if (!process.env.SMTP_HOST) return undefined;
  const { nodemailerAdapter } = await import("@payloadcms/email-nodemailer");
  return nodemailerAdapter({
    defaultFromName: process.env.EMAIL_FROM_NAME || "Dacha CMS",
    defaultFromAddress: process.env.EMAIL_FROM || "noreply@dacha.maxdrobin.ru",
    transportOptions: {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASSWORD || "",
      },
    },
  });
}

export default buildConfig({
  email: await buildEmail(),
  // --- Core ---
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || "http://localhost:3000",
  secret:
    process.env.PAYLOAD_SECRET ||
    "change-me-in-production-please-use-long-random-string",
  cors: [process.env.PAYLOAD_PUBLIC_SERVER_URL || "http://localhost:3000"],
  csrf: [process.env.PAYLOAD_PUBLIC_SERVER_URL || "http://localhost:3000"],

  // --- Performance ---
  // Auto-indexes all sortable top-level fields (saves a lot of manual index: true).
  indexSortableFields: true,

  // --- Database ---
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI,
      max: 20, // Максимум соединений в пуле
      idleTimeoutMillis: 30000,
    },
    // Shared transaction isolation for multi-step Local API calls.
    transactionOptions: { isolationLevel: "read committed" },
    // Auto-sync schema on first connect. Convenient for first deploy
    // and small projects — creates/updates tables from the schema in
    // payload.config.ts without running `payload migrate`.
    // Trade-off: not safe for zero-downtime prod — can drop columns.
    // For multi-instance deploys, switch to proper migrations
    // (pnpm payload migrate:create + run `migrate` service).
    push: true,
  }),

  // --- Bin scripts ---
  // Run via `pnpm seed` (script registered in package.json).
  bin: [{ key: "seed", scriptPath: path.resolve(dirname, "scripts/seed.ts") }],

  // --- Editor ---
  editor: lexicalEditor(),

  // --- Image processing ---
  sharp,

  // --- Admin ---
  admin: {
    user: Users.slug,
    meta: { titleSuffix: " — Dacha CMS" },
    livePreview: {
      collections: ["houses", "events", "news", "faq"],
      breakpoints: [
        { name: "mobile", width: 375, height: 667, label: "Mobile" },
        { name: "tablet", width: 768, height: 1024, label: "Tablet" },
        { name: "desktop", width: 1440, height: 900, label: "Desktop" },
      ],
    },
    // Custom dashboard widgets — render below the default collections cards.
    components: {
      afterDashboard: [
        "/components/admin/widgets/RecentBookings",
        "/components/admin/widgets/RsvpStats",
        "/components/admin/widgets/QuickActions",
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

  // --- Globals ---
  globals: [SiteSettings],

  // --- TypeScript ---
  typescript: {
    outputFile: path.resolve(dirname, "src/payload-types.ts"),
  },

  // --- GraphQL ---
  graphQL: {
    disable: false,
  },

  // --- Logging ---
  logger: {
    options: {
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
    },
  },
});
