import Link from 'next/link'

/**
 * Site header. Placeholder — copy real navigation from
 * /workspace/frontend/components/layout/Header.tsx.
 */
export function Header() {
  return (
    <header className="border-b border-base-300 bg-base-200">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          Evergreen Community
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/houses" className="hover:text-primary">Дома</Link>
          <Link href="/events" className="hover:text-primary">События</Link>
          <Link href="/news" className="hover:text-primary">Новости</Link>
          <Link href="/faq" className="hover:text-primary">FAQ</Link>
          <Link href="/booking" className="hover:text-primary">Бронирование</Link>
        </nav>
      </div>
    </header>
  )
}