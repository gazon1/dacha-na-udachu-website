import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload'
import { BlockRenderer } from '@/lib/blocks-registry'

// Force runtime render so the Docker build doesn't need a live DB.
// Access control honors publish/draft per request.
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'news',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
  })
  const news = result.docs[0]
  if (!news) return {}
  return {
    title: news.title,
    description: news.summary,
  }
}

export default async function NewsPage({ params }: Props) {
  const { slug } = await params
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'news',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
  })
  const news = result.docs[0]
  if (!news) notFound()

  const mainImage = (news as any).mainImage
  const imageUrl = mainImage?.sizes?.hero?.url || mainImage?.sizes?.card?.url || mainImage?.url

  return (
    <article>
      {imageUrl && (
        <div className="aspect-[21/9] bg-base-300 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={mainImage?.alt || news.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 text-sm text-base-content/60 mb-4">
          {(news as any).date && (
            <time dateTime={String((news as any).date)}>
              {new Date((news as any).date).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          )}
          {(news as any).author && (
            <>
              <span>·</span>
              <span>{(news as any).author}</span>
            </>
          )}
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight mb-6">
          {news.title}
        </h1>
        {(news as any).summary && (
          <p className="text-lg text-base-content/80 mb-8 leading-relaxed">
            {(news as any).summary}
          </p>
        )}
        <BlockRenderer blocks={(news as any).body as any} />
      </div>
    </article>
  )
}
