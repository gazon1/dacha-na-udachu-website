import { getPayloadClient } from '@/lib/payload'
import { HousesGrid, type HouseCard } from '@/components/houses/HousesGrid'

// ISR: revalidate every 60s — listings don't need to be live.
export const revalidate = 60

export default async function HousesPage() {
  const payload = await getPayloadClient()
  const housesRes = await payload.find({
    collection: 'houses',
    sort: 'title',
    limit: 100,
    depth: 1,
  })

  const houses: HouseCard[] = housesRes.docs.map((h) => {
    const doc = h as {
      id: string | number
      slug: string
      title: string
      summary?: string
      capacity?: number
      bedrooms?: number
      basePrice?: number
      heroImage?: HouseCard['heroImage']
    }
    return {
      id: doc.id,
      slug: doc.slug,
      title: doc.title,
      summary: doc.summary,
      capacity: doc.capacity,
      bedrooms: doc.bedrooms,
      basePrice: doc.basePrice,
      heroImage: doc.heroImage,
    }
  })

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Наши дома</h1>
      <HousesGrid houses={houses} />
    </div>
  )
}
