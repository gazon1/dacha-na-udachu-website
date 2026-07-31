import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Toaster } from '@/components/layout/Toaster'

export const metadata: Metadata = {
  title: {
    default: 'Evergreen Community — загородный клуб',
    template: '%s — Evergreen Community',
  },
  description: 'Уютное пространство для встреч, мероприятий и отдыха',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-base-100 text-base-content">
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}