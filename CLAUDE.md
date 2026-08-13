# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Next.js 15 + Payload CMS 3** monorepo for a Russian-language website renting rural houses ("дача" = country house). Payload CMS serves as both the headless CMS and admin UI, integrated directly into the Next.js application.

## Tech Stack

- **Framework**: Next.js 15 App Router (React 19)
- **CMS**: Payload CMS 3 (self-hosted, not SaaS)
- **Database**: PostgreSQL via `@payloadcms/db-postgres`
- **Styling**: TailwindCSS 4 + DaisyUI 4 with a custom dark "everpet" theme
- **Rich Text**: Lexical editor (`@payloadcms/richtext-lexical`)
- **Image Processing**: Sharp

## Common Commands

```bash
# Development
npm run dev              # Start Next.js dev server (localhost:3000)
just dev                # Same via Just runner

# Production
npm run build           # Production Next.js build
npm run start           # Start production server
just build              # Same via Just runner

# Payload CMS
npm run payload         # Run Payload CLI
npm run seed            # Seed database with initial data
npm run generate:types  # Generate Payload TypeScript types
npm run generate:importmap # Generate admin importmap

# Docker
just docker-build       # Build Docker image
just docker-validate    # Validate docker-compose config
```

## Architecture

### Route Groups

- `app/(frontend)/` — Public-facing pages (houses, events, news, booking, FAQ, search)
- `app/(payload)/` — Payload CMS routes (`/admin` for admin UI, `/api` for REST/GraphQL API)

### Payload Collections (Content Types)

Core collections in `collections/`:
- **Houses** — Bookable rental properties (slug, capacity, bedrooms, basePrice, bookingEnabled)
- **Events** — Community events with RSVP system (related: EventRsvps, EventDrivers, TaxiPools, TaxiPassengers)
- **News** — News articles
- **FAQ** — FAQ items with question/answer
- **Bookings** — House booking requests
- **SiteSettings** — Global settings (brand, contacts, social links via `globals/SiteSettings.ts`)
- **Users** — Payload auth collection
- **Media** — File/uploads collection

### Key Patterns

**Singleton Payload Client** (`lib/payload.ts`): Provides a cached Payload instance to avoid repeated initialization.

**Access Control** (`lib/access.ts`): Custom access functions (`isAdmin`, `adminOrPublished`, etc.) used in collection configs.

**ISR with Revalidation**: Collection hooks call `revalidateAfter()` to purge Next.js cache on content changes.

**Custom Admin Widgets** (`components/admin/widgets/`): Three dashboard widgets for Payload admin — RecentBookings, RsvpStats, QuickActions.

**Lexical Blocks** (`collections/blocks.ts`): Defines block types used in rich text fields.

### Directory Structure

```
app/
├── (frontend)/          # Public pages
│   ├── houses/         # House listing + detail pages
│   ├── events/         # Events listing + detail + RSVP
│   ├── news/           # News articles
│   ├── booking/        # Booking flow
│   ├── faq/, search/
│   └── page.tsx        # Homepage
├── (payload)/          # Payload CMS
│   ├── admin/          # Admin UI
│   └── api/            # REST + GraphQL API
collections/            # Payload collection definitions
components/
├── admin/widgets/      # Custom Payload admin widgets
├── layout/             # Header, Footer, Toaster
├── houses/, events/, news/, booking/, newsletter/
└── blocks/             # Content block renderers
lib/
├── payload.ts          # Payload client singleton
├── access.ts           # Access control helpers
├── blocks-registry.tsx # Block renderer registry
├── revalidate.ts       # ISR revalidation hooks
└── rate-limit.ts       # Rate limiting
payload.config.ts       # Central Payload configuration
src/
├── payload-types.ts   # Auto-generated types
└── migrations/        # Payload migrations
```

## Database

PostgreSQL is used via `@payloadcms/db-postgres`. Migrations live in `src/migrations/`. Use `npm run payload migrate` to run pending migrations after pulling changes.

## Current State

- **Tests**: No frontend test framework configured (no Jest, Vitest, or Playwright)
- **CI**: `.github/workflows/ci.yml` has stale references to a Django backend that no longer exists — the frontend build job (`frontend`) works correctly
- **Docker**: Multi-container setup with Next.js app, Caddy reverse proxy, and external PostgreSQL

## No Existing AI Rules

No `.cursorrules`, `.cursor/rules/`, `.github/copilot-instructions.md`, `.codex/`, or `.gemini/` files exist in this project.
