import type { AdminViewServerProps } from 'payload'

/**
 * Dashboard widget — shows the 10 most recent bookings.
 *
 * Renders server-side: uses the local payload API to fetch the latest
 * bookings plus their house in a single round-trip (depth: 1).
 */
export default async function RecentBookings({ payload }: AdminViewServerProps) {
  const bookings = await payload.find({
    collection: 'bookings',
    sort: '-createdAt',
    limit: 10,
    depth: 1,
    overrideAccess: true,
  })

  const list = bookings.docs
  const isEmpty = list.length === 0

  return (
    <div
      style={{
        background: 'var(--theme-elevation-50)',
        border: '1px solid var(--theme-elevation-100)',
        borderRadius: '8px',
        padding: '1.25rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.75rem',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '0.85rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--theme-elevation-600)',
          }}
        >
          Последние бронирования
        </h3>
        <a
          href="/admin/collections/bookings"
          style={{
            fontSize: '0.8rem',
            color: 'var(--theme-elevation-600)',
            textDecoration: 'none',
          }}
        >
          Все →
        </a>
      </div>

      {isEmpty ? (
        <p style={{ margin: 0, color: 'var(--theme-elevation-500)', fontSize: '0.9rem' }}>
          Нет бронирований.
        </p>
      ) : (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.85rem',
          }}
        >
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--theme-elevation-500)' }}>
              <th style={{ padding: '0.4rem 0.5rem', fontWeight: 500 }}>Дом</th>
              <th style={{ padding: '0.4rem 0.5rem', fontWeight: 500 }}>Заезд</th>
              <th style={{ padding: '0.4rem 0.5rem', fontWeight: 500 }}>Выезд</th>
              <th style={{ padding: '0.4rem 0.5rem', fontWeight: 500, textAlign: 'right' }}>
                Сумма
              </th>
              <th style={{ padding: '0.4rem 0.5rem', fontWeight: 500 }}>Статус</th>
            </tr>
          </thead>
          <tbody>
            {list.map((b) => {
              const doc = b as {
                id: string | number
                name?: string
                checkIn?: string
                checkOut?: string
                totalPrice?: number
                isConfirmed?: boolean
                house?: { title?: string } | number | string | null
              }
              const houseTitle =
                typeof doc.house === 'object' && doc.house !== null
                  ? doc.house.title
                  : '—'
              return (
                <tr
                  key={doc.id}
                  style={{
                    borderTop: '1px solid var(--theme-elevation-100)',
                  }}
                >
                  <td style={{ padding: '0.5rem' }}>
                    <a
                      href={`/admin/collections/bookings/${doc.id}`}
                      style={{
                        color: 'var(--theme-text)',
                        textDecoration: 'none',
                        fontWeight: 500,
                      }}
                    >
                      {houseTitle}
                    </a>
                    {doc.name && (
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--theme-elevation-500)',
                        }}
                      >
                        {doc.name}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.5rem', color: 'var(--theme-elevation-600)' }}>
                    {doc.checkIn ?? '—'}
                  </td>
                  <td style={{ padding: '0.5rem', color: 'var(--theme-elevation-600)' }}>
                    {doc.checkOut ?? '—'}
                  </td>
                  <td
                    style={{
                      padding: '0.5rem',
                      textAlign: 'right',
                      fontWeight: 500,
                    }}
                  >
                    {doc.totalPrice != null
                      ? `${doc.totalPrice.toLocaleString('ru-RU')} ₽`
                      : '—'}
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        background: doc.isConfirmed
                          ? 'color-mix(in oklab, var(--theme-success-500) 18%, transparent)'
                          : 'color-mix(in oklab, var(--theme-warning-500) 18%, transparent)',
                        color: doc.isConfirmed
                          ? 'var(--theme-success-500)'
                          : 'var(--theme-warning-500)',
                      }}
                    >
                      {doc.isConfirmed ? 'Подтверждена' : 'Ожидает'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
