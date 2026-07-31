import Link from 'next/link'

type HeroImage = {
  alt?: string
  url?: string
  sizes?: { card?: { url?: string } }
}

export type EventCardData = {
  id: string | number
  slug: string
  title: string
  startDate?: string
  startTime?: string
  venue?: string
  summary?: string
  heroImage?: HeroImage | null
}

type Variant = 'compact' | 'row'

type Props = {
  event: EventCardData
  variant?: Variant
}

function heroUrl(e: EventCardData): string | undefined {
  return e.heroImage?.sizes?.card?.url || e.heroImage?.url
}

function fmtDate(iso?: string): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function fmtDayBlock(iso?: string): { day: string; month: string } | null {
  if (!iso) return null
  const d = new Date(iso)
  return {
    day: String(d.getDate()),
    month: d.toLocaleDateString('ru-RU', { month: 'short' }),
  }
}

/**
 * Compact event card with hero image + summary.
 *
 * Two variants:
 *  - `compact` — image on top, used in homepage grids (3-up)
 *  - `row`     — date block on left, image in middle, content on right
 *               used in the /events listing for a tighter, more
 *               information-dense layout
 */
export function EventCard({ event, variant = 'compact' }: Props) {
  if (variant === 'row') return <RowCard event={event} />
  return <CompactCard event={event} />
}

function CompactCard({ event }: { event: EventCardData }) {
  const url = heroUrl(event)
  const date = fmtDate(event.startDate)
  return (
    <Link
      href={`/events/${event.slug}`}
      className="glass-card overflow-hidden group hover:ring-2 hover:ring-primary/40 transition-all flex flex-col"
    >
      {url ? (
        <div className="aspect-video bg-base-300 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={event.heroImage?.alt || event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-5xl text-base-content/30">
            event
          </span>
        </div>
      )}
      <div className="p-4 flex-1 flex flex-col gap-1">
        {date && (
          <p className="text-xs text-base-content/60">
            {date}
            {event.startTime && `, ${event.startTime}`}
          </p>
        )}
        <h3 className="text-lg font-bold text-white line-clamp-2">{event.title}</h3>
        {event.venue && (
          <p className="text-sm text-base-content/70 flex items-center gap-1">
            <span className="material-symbols-outlined text-base">location_on</span>
            {event.venue}
          </p>
        )}
        {event.summary && (
          <p className="text-sm text-base-content/60 mt-2 line-clamp-2">
            {event.summary}
          </p>
        )}
      </div>
    </Link>
  )
}

function RowCard({ event }: { event: EventCardData }) {
  const url = heroUrl(event)
  const day = fmtDayBlock(event.startDate)
  const date = fmtDate(event.startDate)
  return (
    <Link
      href={`/events/${event.slug}`}
      className="glass-card overflow-hidden flex flex-col md:flex-row gap-4 group hover:ring-2 hover:ring-primary/40 transition-all p-4"
    >
      {day && (
        <div className="md:w-20 shrink-0 text-center">
          <p className="text-3xl font-bold text-primary leading-none">{day.day}</p>
          <p className="text-xs text-base-content/60 uppercase tracking-wide mt-1">
            {day.month}
          </p>
        </div>
      )}
      {url ? (
        <div className="md:w-48 shrink-0 aspect-video bg-base-300 overflow-hidden rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={event.heroImage?.alt || event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="md:w-48 shrink-0 aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg flex items-center justify-center">
          <span className="material-symbols-outlined text-4xl text-base-content/30">
            event
          </span>
        </div>
      )}
      <div className="flex-1">
        {date && (
          <p className="text-xs text-base-content/50 mb-1">
            {date}
            {event.startTime && `, ${event.startTime}`}
          </p>
        )}
        <h3 className="text-xl font-bold text-white">{event.title}</h3>
        {event.venue && (
          <p className="text-sm text-base-content/70 mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-base">location_on</span>
            {event.venue}
          </p>
        )}
        {event.summary && (
          <p className="text-sm text-base-content/60 mt-2 line-clamp-2">
            {event.summary}
          </p>
        )}
      </div>
    </Link>
  )
}
