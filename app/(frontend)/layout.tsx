import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'
import { Header } from '@/components/layout/Header'
import { Footer, type FooterSettings } from '@/components/layout/Footer'
import { Toaster } from '@/components/layout/Toaster'
import { defaultMetadata } from '@/lib/metadata'
import { getPayloadClient } from '@/lib/payload'

const inter = Inter({
  subsets: ['cyrillic', 'latin'],
  variable: '--font-inter',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['cyrillic', 'latin'],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata: Metadata = defaultMetadata

// The public site is intentionally fully dynamic — there is NO ISR / no page
// cache anywhere. Admin edits to SiteSettings (footer contacts, brand, social
// links) must appear immediately, and with a small catalogue (a handful of
// houses, dozens of events) the DB round-trip per request costs far less than
// the complexity of a cache-invalidation strategy.
//
// `force-dynamic` here cascades to every nested route, which is what we want.
// `booking/page.tsx` additionally uses searchParams, so it could not be cached
// regardless.
//
// Why there are no `revalidatePath()` calls in the collection hooks: they were
// removed along with lib/revalidate.ts. They were pure no-ops — invalidating a
// path that is re-rendered on every request — and their presence suggested a
// caching layer that did not exist.
//
// Revisit this when either becomes true: the catalogue grows to hundreds of
// entries, TTFB shows up in monitoring, or edit-visibility stops needing to be
// immediate. Then convert pages to `export const revalidate = 60` and add
// targeted invalidation back — measuring first, since Payload's caching
// requires every data dependency to be cache-safe.
export const dynamic = 'force-dynamic'

async function loadFooterSettings(): Promise<FooterSettings> {
  const payload = await getPayloadClient()
  const settings = await payload.findGlobal({ slug: 'site-settings' })
  const brand = (settings?.brand ?? {}) as {
    name?: string
    tagline?: string
    copyright?: string
  }
  const contacts = (settings?.contacts ?? {}) as {
    email?: string | null
    phone?: string | null
  }
  const links = (settings?.socialLinks ?? []) as Array<{
    label: string
    url: string
    icon?: string | null
    img?: string | null
  }>
  return {
    brandName: brand.name ?? 'Дача на удачу',
    tagline: brand.tagline ?? 'Уютное пространство для встреч, мероприятий и отдыха',
    copyright: brand.copyright ?? 'Дача на удачу. Все права защищены.',
    email: contacts.email ?? null,
    phone: contacts.phone ?? null,
    socialLinks: links,
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await loadFooterSettings()
  return (
    <html lang="ru" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen bg-base-100 text-base-content font-sans antialiased">
        <Providers>
          <Header brandName={settings.brandName} />
          <main>{children}</main>
          <Footer settings={settings} />
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
