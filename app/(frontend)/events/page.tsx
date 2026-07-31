import { getPayloadClient } from '@/lib/payload'
import { EventCard, type EventCardData } from '@/components/event/EventCard'

// ISR: revalidate every 60s — listings don't need to be live.
export const revalidate = 60

export default async function EventsPage() {
  const payload = await getPayloadClient()
  const events = await payload.find({
    collection: 'events',
    sort: 'startDate',
    limit: 100,
    depth: 1,
  })

  const today = new Date()
  const upcoming: EventCardData[] = events.docs
    .filter((e) => new Date((e as { startDate: string }).startDate) >= today)
    .map(toCardData)
  const past: EventCardData[] = events.docs
    .filter((e) => new Date((e as { startDate: string }).startDate) < today)
    .reverse()
    .map(toCardData)

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-12">
      <section>
        <h1 className="text-4xl font-bold mb-8">События</h1>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Предстоящие</h2>
        {upcoming.length === 0 ? (
          <p className="text-base-content/60">Скоро здесь появятся события.</p>
        ) : (
          <div className="space-y-4">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} variant="row" />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4">Прошедшие</h2>
          <div className="space-y-2 opacity-70">
            {past.slice(0, 10).map((e) => (
              <a key={e.id} href={`/events/${e.slug}`} className="block glass-card p-3">
                <p className="text-sm text-base-content/60">
                  {new Date(e.startDate!).toLocaleDateString('ru-RU')}
                </p>
                <p className="font-semibold">{e.title}</p>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function toCardData(e: unknown): EventCardData {
  const doc = e as {
    id: string | number
    slug: string
    title: string
    startDate?: string
    startTime?: string
    venue?: string
    summary?: string
    heroImage?: EventCardData['heroImage']
  }
  return {
    id: doc.id,
    slug: doc.slug,
    title: doc.title,
    startDate: doc.startDate,
    startTime: doc.startTime,
    venue: doc.venue,
    summary: doc.summary,
    heroImage: doc.heroImage,
  }
}
