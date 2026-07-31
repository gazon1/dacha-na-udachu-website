import Link from 'next/link'
import { TelegramLoginButton } from '@/components/auth/TelegramLoginButton'

const NAV_ITEMS = [
  { href: '/houses', label: 'Дома' },
  { href: '/events', label: 'События' },
  { href: '/news', label: 'Новости' },
  { href: '/faq', label: 'FAQ' },
  { href: '/booking', label: 'Бронирование' },
] as const

/**
 * Site header with mobile drawer + Telegram login.
 * Server Component — no 'use client' needed for the layout itself.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-base-300/50 bg-base-100/80 backdrop-blur-lg">
      <div className="container-narrow flex items-center justify-between h-16">
        <Link
          href="/"
          className="font-serif text-xl font-bold tracking-tight hover:text-primary transition-colors"
        >
          Evergreen
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-base-content/80 hover:text-primary transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <TelegramLoginButton />
          {/* Mobile drawer trigger */}
          <div className="drawer-end md:hidden">
            <input
              id="mobile-drawer"
              type="checkbox"
              className="drawer-toggle"
            />
            <label
              htmlFor="mobile-drawer"
              className="btn btn-ghost btn-square btn-sm"
              aria-label="Открыть меню"
            >
              <span className="material-symbols-outlined">menu</span>
            </label>
            <div className="drawer-side z-40">
              <label
                htmlFor="mobile-drawer"
                aria-label="Закрыть меню"
                className="drawer-overlay"
              />
              <div className="bg-base-200 min-h-full w-72 p-6 space-y-4">
                <Link
                  href="/"
                  className="font-serif text-2xl font-bold block mb-6"
                >
                  Evergreen
                </Link>
                <nav className="flex flex-col gap-2">
                  {NAV_ITEMS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="btn btn-ghost justify-start"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
