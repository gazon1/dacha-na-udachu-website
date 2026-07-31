import { getPayloadClient } from '@/lib/payload'
import { NewsGrid, type NewsCard } from '@/components/news/NewsGrid'

// Force runtime render so the Docker build doesn't need a live DB.
// Trade-off: every request hits Postgres. Cheap for small sites; add
// CDN caching headers (Cache-Control) if traffic grows.
export const dynamic = 'force-dynamic'

export default async function NewsPage() {
  const payload = await getPayloadClient()
  const newsRes = await payload.find({
    collection: 'news',
    sort: '-date',
    limit: 50,
    depth: 1,
  })

  const items: NewsCard[] = newsRes.docs.map((n) => {
    const doc = n as {
      id: string | number
      slug: string
      title: string
      date?: string
      summary?: string
      mainImage?: NewsCard['mainImage']
    }
    return {
      id: doc.id,
      slug: doc.slug,
      title: doc.title,
      date: doc.date,
      summary: doc.summary,
      mainImage: doc.mainImage,
    }
  })

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-6">
      <h1 className="text-4xl font-bold mb-8">Новости</h1>
      <NewsGrid items={items} />
    </div>
  )
}
