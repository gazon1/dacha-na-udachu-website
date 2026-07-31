import { getPayloadClient } from '@/lib/payload'

export const dynamic = 'force-dynamic'

export default async function NewsPage() {
  const payload = await getPayloadClient()
  const news = await payload.find({
    collection: 'news',
    sort: '-date',
    limit: 50,
    depth: 1,
  })

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-6">
      <h1 className="text-4xl font-bold mb-8">Новости</h1>
      {news.docs.length === 0 ? (
        <p className="text-base-content/60">Новостей пока нет.</p>
      ) : (
        news.docs.map((n: any) => {
          const imageUrl = n.mainImage?.sizes?.card?.url || n.mainImage?.url
          return (
            <a key={n.id} href={`/news/${n.slug}`} className="glass-card p-4 flex flex-col md:flex-row gap-4 group hover:ring-2 hover:ring-primary/40">
              {imageUrl && (
                <div className="md:w-64 shrink-0 aspect-video md:aspect-square bg-base-300 overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt={n.mainImage.alt || n.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1">
                {n.date && <p className="text-xs text-base-content/50 mb-2">{new Date(n.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
                <h3 className="text-xl font-bold">{n.title}</h3>
                {n.summary && <p className="text-sm text-base-content/70 line-clamp-3 mt-1">{n.summary}</p>}
              </div>
            </a>
          )
        })
      )}
    </div>
  )
}