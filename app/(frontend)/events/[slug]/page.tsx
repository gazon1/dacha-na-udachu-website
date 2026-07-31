import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload'
import { BlockRenderer } from '@/lib/blocks-registry'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ slug: string }>
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'events',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
  })
  const event = result.docs[0]
  if (!event) notFound()

  return (
    <article className="max-w-4xl mx-auto px-4 py-12">
      <header className="mb-8">
        <p className="text-sm text-base-content/60">
          {new Date((event as any).startDate).toLocaleDateString('ru-RU', {
            day: 'numeric', month: 'long', year: 'numeric',
          })}
          {(event as any).startTime && `, ${(event as any).startTime}`}
        </p>
        <h1 className="text-4xl font-bold mt-2">{event.title}</h1>
        {(event as any).venue && <p className="text-lg text-base-content/80 mt-2">📍 {(event as any).venue}</p>}
        {(event as any).summary && <p className="text-base-content/70 mt-4">{(event as any).summary}</p>}

        {/* TODO: add RSVP widget, carpool sidebar, attendees list */}
        <p className="mt-4 text-sm text-base-content/50 italic">
          (RSVP, carpool, attendees UI — портируется отдельно из старого /components/event/)
        </p>
      </header>

      <BlockRenderer blocks={(event as any).body as any} />
    </article>
  )
}