import Link from 'next/link'

const NAV = [
  { href: '/houses', label: 'Дома' },
  { href: '/events', label: 'События' },
  { href: '/news', label: 'Новости' },
  { href: '/faq', label: 'FAQ' },
  { href: '/booking', label: 'Бронирование' },
] as const

export type FooterSettings = {
  brandName: string
  tagline: string
  copyright: string
  email?: string | null
  phone?: string | null
  socialLinks: { label: string; url: string; icon?: string | null; img?: string | null }[]
}

type Props = {
  settings: FooterSettings
}

/**
 * Footer with 4-column layout: brand, navigation, social, copyright.
 * All copy comes from the SiteSettings global — admin-editable via
 * /admin/globals/site-settings.
 */
export function Footer({ settings }: Props) {
  const year = new Date().getFullYear()
  const { brandName, tagline, copyright, email, phone, socialLinks } = settings
  return (
    <footer className="border-t border-base-300/50 bg-base-200 mt-20">
      <div className="container-narrow py-12 grid gap-10 md:grid-cols-4">
        {/* Brand */}
        <div className="space-y-3">
          <Link href="/" className="font-serif text-xl font-bold">
            {brandName}
          </Link>
          <p className="text-sm text-base-content/60">{tagline}</p>
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
            {email && (
              <li>
                <a href={`mailto:${email}`} className="hover:text-primary">
                  {email}
                </a>
              </li>
            )}
            {phone && (
              <li>
                <a href={`tel:${phone.replace(/\D/g, '')}`} className="hover:text-primary">
                  {phone}
                </a>
              </li>
            )}
          </ul>
        </div>

        {/* Social */}
        {socialLinks.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-base-content/80 mb-3">
              Соцсети
            </h3>
            <ul className="flex gap-2">
              {socialLinks.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost btn-square btn-sm"
                    aria-label={s.label}
                  >
                    {s.img ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={s.img}
                        alt=""
                        className="w-5 h-5"
                        style={{ filter: 'brightness(0) invert(1)' }}
                      />
                    ) : s.icon ? (
                      <span className="material-symbols-outlined">{s.icon}</span>
                    ) : null}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-base-300/50 py-4">
        <div className="container-narrow text-xs text-base-content/40 flex flex-col md:flex-row md:justify-between gap-2">
          <p>© {year} {copyright}</p>
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
