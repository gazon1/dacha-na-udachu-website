import type { AdminViewServerProps } from 'payload'

type RsvpStatus = 'going' | 'maybe' | 'not_going' | 'waiting'

const STATUS_COLORS: Record<RsvpStatus, string> = {
  going: 'var(--theme-success-500)',
  maybe: 'var(--theme-warning-500)',
  not_going: 'var(--theme-elevation-400)',
  waiting: 'var(--theme-elevation-600)',
}

const STATUS_LABEL: Record<RsvpStatus, string> = {
  going: 'Идут',
  maybe: 'Возможно',
  not_going: 'Не идут',
  waiting: 'Лист ожидания',
}

const STATUS_ORDER: RsvpStatus[] = ['going', 'maybe', 'waiting', 'not_going']

/**
 * Dashboard widget — RSVP roll-up for the next 5 upcoming events.
 *
 * Per event, fetches all RSVPs and counts by status. Renders a small
 * stacked bar plus a "X% of capacity" badge that turns red when ≥80%.
 */
export default async function RsvpStats({ payload }: AdminViewServerProps) {
  const today = new Date().toISOString().slice(0, 10)

  const eventsRes = await payload.find({
    collection: 'events',
    where: { startDate: { greater_than: today } },
    sort: 'startDate',
    limit: 5,
    depth: 0,
    overrideAccess: true,
  })

  const events = eventsRes.docs
  const isEmpty = events.length === 0

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
        RSVP — ближайшие события
      </h3>

      {isEmpty ? (
        <p style={{ margin: 0, color: 'var(--theme-elevation-500)', fontSize: '0.9rem' }}>
          Нет предстоящих событий.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.85rem' }}>
          {await Promise.all(
            events.map(async (e) => {
              const event = e as {
                id: string | number
                title: string
                startDate: string
                rsvpCapacity?: number | null
              }
              const rsvpsRes = await payload.find({
                collection: 'event-rsvps',
                where: { event: { equals: event.id } },
                limit: 500,
                depth: 0,
                overrideAccess: true,
              })

              const counts: Record<RsvpStatus, number> = {
                going: 0,
                maybe: 0,
                not_going: 0,
                waiting: 0,
              }
              for (const r of rsvpsRes.docs) {
                const status = (r as { status: RsvpStatus }).status
                if (status in counts) counts[status] += 1
              }
              const total = counts.going + counts.maybe + counts.not_going + counts.waiting
              const fillPct = event.rsvpCapacity
                ? Math.min(100, Math.round((counts.going / event.rsvpCapacity) * 100))
                : null
              const isHot = fillPct !== null && fillPct >= 80

              return (
                <li
                  key={event.id}
                  style={{
                    borderTop: '1px solid var(--theme-elevation-100)',
                    paddingTop: '0.85rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      marginBottom: '0.4rem',
                    }}
                  >
                    <a
                      href={`/admin/collections/events/${event.id}`}
                      style={{
                        color: 'var(--theme-text)',
                        textDecoration: 'none',
                        fontWeight: 500,
                        fontSize: '0.95rem',
                      }}
                    >
                      {event.title}
                    </a>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--theme-elevation-500)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {event.startDate}
                    </span>
                  </div>

                  {/* Stacked bar (only counts of claimed statuses) */}
                  <div
                    style={{
                      display: 'flex',
                      height: '6px',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      background: 'var(--theme-elevation-100)',
                      marginBottom: '0.4rem',
                    }}
                  >
                    {STATUS_ORDER.map((s) => {
                      const width = total ? (counts[s] / total) * 100 : 0
                      if (width === 0) return null
                      return (
                        <div
                          key={s}
                          style={{
                            width: `${width}%`,
                            background: STATUS_COLORS[s],
                          }}
                          title={`${STATUS_LABEL[s]}: ${counts[s]}`}
                        />
                      )
                    })}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.4rem 0.75rem',
                      fontSize: '0.75rem',
                      color: 'var(--theme-elevation-600)',
                      alignItems: 'center',
                    }}
                  >
                    {STATUS_ORDER.map((s) => (
                      <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: STATUS_COLORS[s],
                          }}
                        />
                        {STATUS_LABEL[s]}: {counts[s]}
                      </span>
                    ))}
                    {fillPct !== null && (
                      <span
                        style={{
                          marginLeft: 'auto',
                          padding: '0.1rem 0.5rem',
                          borderRadius: '999px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          background: isHot
                            ? 'color-mix(in oklab, var(--theme-error-500) 18%, transparent)'
                            : 'color-mix(in oklab, var(--theme-success-500) 18%, transparent)',
                          color: isHot
                            ? 'var(--theme-error-500)'
                            : 'var(--theme-success-500)',
                        }}
                      >
                        {counts.going}/{event.rsvpCapacity} ({fillPct}%)
                      </span>
                    )}
                  </div>
                </li>
              )
            }),
          )}
        </ul>
      )}
    </div>
  )
}
