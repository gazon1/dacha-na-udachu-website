import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload'
import { BlockRenderer } from '@/lib/blocks-registry'
import { EventCard, type EventCardData } from '@/components/event/EventCard'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const payload = await getPayloadClient()

  // The homepage is the FAQ collection (single doc with slug 'faq') for now.
  // Real "home" content is the Houses list (top-level) plus FAQ intro.
  // A dedicated "Pages" collection with a `home` global can be added later.
  const faq = await payload.find({
    collection: 'faq',
    where: { slug: { equals: 'faq' } },
    limit: 1,
    depth: 2,
  })

  // Featured houses
  const houses = await payload.find({
    collection: 'houses',
    where: { bookingEnabled: { equals: true } },
    limit: 6,
    sort: '-createdAt',
  })

  // Upcoming events
  const events = await payload.find({
    collection: 'events',
    where: { startDate: { greater_than: new Date().toISOString() } },
    limit: 3,
    sort: 'startDate',
  })

  return (
    <div>
      {/* Hero — for now, show a static hero. Real version: use a Pages collection or home global */}
      <section className="hero min-h-[60vh] bg-gradient-to-br from-primary/30 to-base-200 flex items-center">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <h1 className="text-5xl font-bold text-white mb-4">
            Дача на удачу — загородный клуб
          </h1>
          <p className="text-xl text-base-content/80 mb-8">
            Уютное пространство для встреч, мероприятий и отдыха
          </p>
          <a href="/houses" className="btn btn-primary">
            Смотреть дома
          </a>
        </div>
      </section>

      {/* Houses preview */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-6">Наши дома</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {houses.docs.map((h: any) => (
            <a key={h.id} href={`/houses/${h.slug}`} className="glass-card p-4">
              {h.heroImage?.url && (
                <img src={h.heroImage.url} alt={h.heroImage.alt || h.title} className="rounded" />
              )}
              <h3 className="text-xl font-bold mt-3">{h.title}</h3>
              <p className="text-sm text-base-content/70">{h.summary}</p>
              <p className="text-primary font-bold mt-2">от {h.basePrice} ₽/ночь</p>
            </a>
          ))}
        </div>
      </section>

      {/* Events preview */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-6">Ближайшие события</h2>
        {events.docs.length === 0 ? (
          <p className="text-base-content/60">Скоро здесь появятся события.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {events.docs.map((e) => {
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
              const card: EventCardData = {
                id: doc.id,
                slug: doc.slug,
                title: doc.title,
                startDate: doc.startDate,
                startTime: doc.startTime,
                venue: doc.venue,
                summary: doc.summary,
                heroImage: doc.heroImage,
              }
              return <EventCard key={card.id} event={card} variant="compact" />
            })}
          </div>
        )}
      </section>

      {/* FAQ */}
      {faq.docs[0] && (
        <section className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-3xl font-bold mb-6">{faq.docs[0].title}</h2>
          <BlockRenderer blocks={faq.docs[0].intro as any} />
          <div className="space-y-4 mt-6">
            {faq.docs[0].faqItems?.map((item: any, i: number) => (
              <details key={i} className="glass-card p-4">
                <summary className="font-bold cursor-pointer">{item.question}</summary>
                <p className="mt-2 text-base-content/80">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}