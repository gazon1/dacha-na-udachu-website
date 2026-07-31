import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload'
import { BlockRenderer } from '@/lib/blocks-registry'

// ISR: revalidate every 60s. adminOrPublished access controls visibility
// per-request via cookies, so we still keep dynamic-rendering semantics.
export const revalidate = 60

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'houses',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
  })
  const house = result.docs[0]
  if (!house) return {}
  return {
    title: house.title,
    description: house.summary,
  }
}

export default async function HousePage({ params }: Props) {
  const { slug } = await params
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'houses',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
  })
  const house = result.docs[0]
  if (!house) notFound()

  const heroUrl = (house as any).heroImage?.sizes?.hero?.url || (house as any).heroImage?.url

  return (
    <article>
      {heroUrl && (
        <div className="aspect-[21/9] bg-base-300 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroUrl} alt={(house as any).heroImage?.alt || house.title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-4">{house.title}</h1>
        {(house as any).summary && <p className="text-lg text-base-content/80 mb-6">{(house as any).summary}</p>}

        <div className="flex flex-wrap gap-4 mb-8 text-sm">
          {(house as any).capacity != null && <span className="badge">до {(house as any).capacity} гостей</span>}
          {(house as any).bedrooms != null && <span className="badge">{(house as any).bedrooms} спален</span>}
          {(house as any).address && <span className="badge">{(house as any).address}</span>}
          {(house as any).basePrice > 0 && <span className="badge badge-primary">от {Number((house as any).basePrice).toLocaleString('ru-RU')} ₽/ночь</span>}
        </div>

        {(house as any).bookingEnabled && (
          <a href={`/booking?house=${slug}`} className="btn btn-primary mb-8">
            Забронировать
          </a>
        )}

        <BlockRenderer blocks={(house as any).body as any} />
      </div>
    </article>
  )
}