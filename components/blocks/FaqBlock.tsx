type FAQItem = {
  question?: string
  answer?: string
}

type Props = {
  value?: FAQItem | { faqItems?: FAQItem[]; items?: FAQItem[] }
}

export function FaqBlock({ value }: Props) {
  if (!value) return null

  // Single item shape (FAQItemBlock / FAQPage.faqItems[i])
  if ('question' in value && value.question) {
    return (
      <details className="glass-card p-4 my-2">
        <summary className="font-bold cursor-pointer">{value.question}</summary>
        <p className="mt-2 text-base-content/80 whitespace-pre-line">{value.answer}</p>
      </details>
    )
  }

  // Array shape (legacy)
  const items = (value as { faqItems?: FAQItem[]; items?: FAQItem[] }).faqItems
    ?? (value as { items?: FAQItem[] }).items
  if (!items?.length) return null
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <details key={i} className="glass-card p-4">
          <summary className="font-bold cursor-pointer">{item.question}</summary>
          <p className="mt-2 text-base-content/80 whitespace-pre-line">{item.answer}</p>
        </details>
      ))}
    </div>
  )
}