import type { AdminViewServerProps } from 'payload'

/**
 * Dashboard widget — quick action buttons (create new House/Event/News).
 *
 * Pure server component. Uses `<a href>` to navigate to the collection
 * create pages — Payload's admin mounts those routes client-side, so
 * server-rendered anchors trigger client-side navigation.
 */
export default function QuickActions(_props: AdminViewServerProps) {
  const actions = [
    { href: '/admin/collections/houses/create', icon: 'home', label: 'Новый дом' },
    { href: '/admin/collections/events/create', icon: 'event', label: 'Новое событие' },
    { href: '/admin/collections/news/create', icon: 'article', label: 'Новая новость' },
  ]

  return (
    <div
      style={{
        background: 'var(--theme-elevation-50)',
        border: '1px solid var(--theme-elevation-100)',
        borderRadius: '8px',
        padding: '1.25rem',
      }}
    >
      <h3
        style={{
          margin: '0 0 0.75rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--theme-elevation-600)',
        }}
      >
        Быстрые действия
      </h3>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {actions.map((a) => (
          <a
            key={a.href}
            href={a.href}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.9rem',
              borderRadius: '6px',
              background: 'var(--theme-elevation-100)',
              color: 'var(--theme-text)',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 500,
              transition: 'background 0.15s',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>
              {a.icon}
            </span>
            {a.label}
          </a>
        ))}
      </div>
    </div>
  )
}
