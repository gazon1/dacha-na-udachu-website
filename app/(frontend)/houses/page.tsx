import { getPayloadClient } from '@/lib/payload'

// ISR: revalidate every 60s — listings don't need to be live.
export const revalidate = 60

export default async function HousesPage() {
  const payload = await getPayloadClient()
  const houses = await payload.find({
    collection: 'houses',
    sort: 'title',
    limit: 100,
    depth: 1,
  })

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Наши дома</h1>

      {houses.docs.length === 0 ? (
        <p className="text-base-content/60">Пока нет доступных домов.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {houses.docs.map((h: any) => {
            const heroUrl = h.heroImage?.sizes?.card?.url || h.heroImage?.url
            return (
              <a key={h.id} href={`/houses/${h.slug}`} className="glass-card overflow-hidden group hover:ring-2 hover:ring-primary/40">
                {heroUrl ? (
                  <div className="aspect-video bg-base-300 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={heroUrl} alt={h.heroImage.alt || h.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-5xl text-base-content/30">home</span>
                  </div>
                )}
                <div className="p-5">
                  <h3 className="text-xl font-bold text-white mb-2">{h.title}</h3>
                  {h.summary && <p className="text-sm text-base-content/70 mb-3 line-clamp-2">{h.summary}</p>}
                  <div className="flex flex-wrap gap-3 text-xs text-base-content/60">
                    {h.capacity != null && <span>до {h.capacity} гостей</span>}
                    {h.bedrooms != null && <span>{h.bedrooms} спален</span>}
                    {h.basePrice > 0 && <span className="ml-auto text-primary font-semibold">от {Number(h.basePrice).toLocaleString('ru-RU')} ₽/ночь</span>}
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}