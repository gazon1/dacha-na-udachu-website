import Link from 'next/link'

type MainImage = {
  alt?: string
  url?: string
  sizes?: { card?: { url?: string } }
}

export type NewsCard = {
  id: string | number
  slug: string
  title: string
  date?: string
  summary?: string
  mainImage?: MainImage | null
}

type Props = {
  items: NewsCard[]
}

function imageUrl(n: NewsCard): string | undefined {
  return n.mainImage?.sizes?.card?.url || n.mainImage?.url
}

function fmtDate(date?: string): string | null {
  if (!date) return null
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Vertical card list for /news. Each row: optional image + date + title +
 * summary. Uses `<Link>` from next/link so navigation stays client-side.
 */
export function NewsGrid({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center text-base-content/60">
        Новостей пока нет.
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-6">
      {items.map((n) => {
        const url = imageUrl(n)
        const date = fmtDate(n.date)
        return (
          <Link
            key={n.id}
            href={`/news/${n.slug}`}
            className="glass-card overflow-hidden flex flex-col md:flex-row gap-4 group hover:ring-2 hover:ring-primary/40 transition-all p-4"
          >
            {url && (
              <div className="md:w-64 shrink-0 aspect-video md:aspect-square bg-base-300 overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={n.mainImage?.alt || n.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  loading="lazy"
                />
              </div>
            )}
            <div className="flex-1">
              {date && (
                <div className="text-xs text-base-content/50 mb-2">{date}</div>
              )}
              <h3 className="text-xl font-bold text-white mb-2">{n.title}</h3>
              {n.summary && (
                <p className="text-sm text-base-content/70 line-clamp-3">
                  {n.summary}
                </p>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
