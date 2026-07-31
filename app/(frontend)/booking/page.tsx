import { getPayloadClient } from '@/lib/payload'
import { BookingWizard } from '@/components/booking/BookingWizard'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ house?: string }>
}

export default async function BookingPage({ searchParams }: Props) {
  const { house: preselectedHouseSlug } = await searchParams
  const payload = await getPayloadClient()
  const housesRes = await payload.find({
    collection: 'houses',
    where: { bookingEnabled: { equals: true } },
    limit: 50,
    sort: 'order',
    // Only the fields BookingWizard needs.
    depth: 0,
  })
  // Strip to lean shape so the client bundle stays small.
  const houses = housesRes.docs.map((d) => ({
    id: String(d.id),
    slug: String((d as { slug: string }).slug),
    title: String((d as { title: string }).title),
    basePrice: Number((d as { basePrice: number }).basePrice ?? 0),
    capacity: Number((d as { capacity: number }).capacity ?? 1),
  }))

  const extrasRes = await payload.find({
    collection: 'extra-services',
    where: { isActive: { equals: true } },
    limit: 50,
    sort: 'order',
    depth: 0,
  })
  const extras = extrasRes.docs.map((e) => ({
    slug: String((e as { slug: string }).slug),
    name: String((e as { name: string }).name),
    price: Number((e as { price: number }).price ?? 0),
  }))

  return (
    <div className="container-narrow py-12">
      <h1 className="text-4xl md:text-5xl font-serif font-bold mb-2">
        Бронирование
      </h1>
      <p className="text-base-content/70 mb-8">
        Выберите дом, даты и услуги. Всего 3 шага.
      </p>
      <BookingWizard
        houses={houses}
        extras={extras}
        preselectedHouseSlug={preselectedHouseSlug}
      />
    </div>
  )
}
