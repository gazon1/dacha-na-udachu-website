import Link from 'next/link'

type HeroImage = {
  alt?: string
  url?: string
  sizes?: { card?: { url?: string } }
}

export type HouseCard = {
  id: string | number
  slug: string
  title: string
  summary?: string
  capacity?: number
  bedrooms?: number
  basePrice?: number
  heroImage?: HeroImage | null
}

type Props = {
  houses: HouseCard[]
}

function heroUrl(h: HouseCard): string | undefined {
  return h.heroImage?.sizes?.card?.url || h.heroImage?.url
}

/**
 * Card grid for the /houses listing page. Each card links to the house
 * detail page and shows image, title, summary, capacity, bedrooms and price.
 */
export function HousesGrid({ houses }: Props) {
  if (houses.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center text-base-content/60">
        Пока нет доступных домов.
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {houses.map((h) => {
          const url = heroUrl(h)
          return (
            <Link
              key={h.id}
              href={`/houses/${h.slug}`}
              className="glass-card overflow-hidden group hover:ring-2 hover:ring-primary/40 transition-all"
            >
              {url ? (
                <div className="aspect-video bg-base-300 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={h.heroImage?.alt || h.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-5xl text-base-content/30">
                    home
                  </span>
                </div>
              )}
              <div className="p-5">
                <h3 className="text-xl font-bold text-white mb-2">{h.title}</h3>
                {h.summary && (
                  <p className="text-sm text-base-content/70 mb-3 line-clamp-2">
                    {h.summary}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-base-content/60">
                  {h.capacity != null && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">
                        group
                      </span>
                      до {h.capacity} гостей
                    </span>
                  )}
                  {h.bedrooms != null && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">
                        bed
                      </span>
                      {h.bedrooms} спален
                    </span>
                  )}
                  {h.basePrice != null && h.basePrice > 0 && (
                    <span className="flex items-center gap-1 ml-auto text-primary font-semibold">
                      от {h.basePrice.toLocaleString('ru-RU')} ₽/ночь
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
