import { getPayloadClient } from '@/lib/payload'

export const dynamic = 'force-dynamic'

export default async function EventsPage() {
  const payload = await getPayloadClient()
  const events = await payload.find({
    collection: 'events',
    sort: 'startDate',
    limit: 100,
    depth: 1,
  })

  const upcoming = events.docs.filter((e: any) => new Date(e.startDate) >= new Date())
  const past = events.docs.filter((e: any) => new Date(e.startDate) < new Date()).reverse()

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
            {upcoming.map((e: any) => (
              <a key={e.id} href={`/events/${e.slug}`} className="glass-card p-4 flex flex-col md:flex-row gap-4 group">
                <div className="md:w-32 shrink-0 text-center">
                  <p className="text-2xl font-bold text-primary">{new Date(e.startDate).getDate()}</p>
                  <p className="text-sm text-base-content/60">{new Date(e.startDate).toLocaleDateString('ru-RU', { month: 'short' })}</p>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{e.title}</h3>
                  {e.venue && <p className="text-sm text-base-content/70 mt-1">{e.venue}</p>}
                  {e.summary && <p className="text-sm mt-2 line-clamp-2">{e.summary}</p>}
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4">Прошедшие</h2>
          <div className="space-y-2 opacity-70">
            {past.slice(0, 10).map((e: any) => (
              <a key={e.id} href={`/events/${e.slug}`} className="block glass-card p-3">
                <p className="text-sm text-base-content/60">{new Date(e.startDate).toLocaleDateString('ru-RU')}</p>
                <p className="font-semibold">{e.title}</p>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}