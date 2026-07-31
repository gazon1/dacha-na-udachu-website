import Link from 'next/link'

const NAV = [
  { href: '/houses', label: 'Дома' },
  { href: '/events', label: 'События' },
  { href: '/news', label: 'Новости' },
  { href: '/faq', label: 'FAQ' },
  { href: '/booking', label: 'Бронирование' },
] as const

const SOCIAL = [
  { label: 'Telegram', href: 'https://t.me/evergreen', icon: 'send' },
  {
    label: 'Instagram',
    href: 'https://instagram.com/evergreen',
    icon: 'photo_camera',
  },
] as const

/**
 * Footer with 4-column layout: brand, navigation, social, copyright.
 */
export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-base-300/50 bg-base-200 mt-20">
      <div className="container-narrow py-12 grid gap-10 md:grid-cols-4">
        {/* Brand */}
        <div className="space-y-3">
          <Link href="/" className="font-serif text-xl font-bold">
            Evergreen
          </Link>
          <p className="text-sm text-base-content/60">
            Уютное пространство для встреч, мероприятий и отдыха.
          </p>
        </div>

        {/* Navigation */}
        <div>
          <h3 className="font-semibold text-sm uppercase tracking-wider text-base-content/80 mb-3">
            Навигация
          </h3>
          <ul className="space-y-2 text-sm">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-base-content/60 hover:text-primary"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contacts */}
        <div>
          <h3 className="font-semibold text-sm uppercase tracking-wider text-base-content/80 mb-3">
            Контакты
          </h3>
          <ul className="space-y-2 text-sm text-base-content/60">
            <li>
              <a href="mailto:hello@evergreen.local" className="hover:text-primary">
                hello@evergreen.local
              </a>
            </li>
            <li>
              <a href="tel:+74950000000" className="hover:text-primary">
                +7 (495) 000-00-00
              </a>
            </li>
          </ul>
        </div>

        {/* Social */}
        <div>
          <h3 className="font-semibold text-sm uppercase tracking-wider text-base-content/80 mb-3">
            Соцсети
          </h3>
          <ul className="flex gap-2">
            {SOCIAL.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-square btn-sm"
                  aria-label={s.label}
                >
                  <span className="material-symbols-outlined">{s.icon}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-base-300/50 py-4">
        <div className="container-narrow text-xs text-base-content/40 flex flex-col md:flex-row md:justify-between gap-2">
          <p>© {year} Evergreen Community. Все права защищены.</p>
          <p>
            Built with{' '}
            <a
              href="https://payloadcms.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary"
            >
              Payload CMS
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
