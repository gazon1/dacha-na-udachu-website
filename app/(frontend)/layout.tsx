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

// Re-fetch on every request — admin edits to SiteSettings should show immediately.
// `revalidate = 0` + `dynamic = 'force-dynamic'` covers the public layout.
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
