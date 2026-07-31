import { getPayloadClient } from '@/lib/payload'
import { BlockRenderer } from '@/lib/blocks-registry'

export const dynamic = 'force-dynamic'

export default async function FaqPage() {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'faq',
    where: { slug: { equals: 'faq' } },
    limit: 1,
    depth: 2,
  })
  const faq = result.docs[0]

  if (!faq) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold">FAQ</h1>
        <p className="text-base-content/60 mt-4">Раздел FAQ ещё не заполнен.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-6">{faq.title}</h1>
      <BlockRenderer blocks={(faq as any).intro as any} />
      <div className="space-y-4 mt-6">
        {((faq as any).faqItems || []).map((item: any, i: number) => (
          <details key={i} className="glass-card p-4">
            <summary className="font-bold cursor-pointer">{item.question}</summary>
            <p className="mt-2 text-base-content/80 whitespace-pre-line">{item.answer}</p>
          </details>
        ))}
      </div>
    </div>
  )
}