import Link from "next/link";
import type { WagtailPage } from "@/lib/wagtail";

interface HousesGridProps {
  houses: WagtailPage[];
}

interface HouseMeta {
  type: string;
  detail_url: string;
  html_url: string;
  slug: string;
  download_url?: string;
  [key: string]: unknown;
}

interface HouseImage {
  id: number;
  meta?: HouseMeta;
}

/**
 * Card grid for HousePage children fetched via Wagtail v2 ?child_of=<id>.
 *
 * Each item carries the fields we asked for: summary, capacity, bedrooms,
 * base_price. Image (hero_image) may not be in the projection — handle
 * gracefully.
 */
export function HousesGrid({ houses }: HousesGridProps) {
  if (houses.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center text-base-content/60">
        Пока нет доступных домов.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {houses.map((h) => {
          const summary = (h as { summary?: string }).summary ?? "";
          const capacity = (h as { capacity?: number }).capacity;
          const bedrooms = (h as { bedrooms?: number }).bedrooms;
          const basePrice = (h as { base_price?: string }).base_price;
          const heroImage = (h as { hero_image?: HouseImage }).hero_image;
          const imageUrl = heroImage?.meta?.download_url;

          return (
            <Link
              key={h.id}
              href={`/houses/${h.slug}`}
              className="glass-card overflow-hidden group hover:ring-2 hover:ring-primary/40 transition-all"
            >
              {imageUrl ? (
                <div className="aspect-video bg-base-300 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={h.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
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
                {summary && (
                  <p className="text-sm text-base-content/70 mb-3 line-clamp-2">
                    {summary}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-base-content/60">
                  {capacity != null && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">
                        group
                      </span>
                      до {capacity} гостей
                    </span>
                  )}
                  {bedrooms != null && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">
                        bed
                      </span>
                      {bedrooms} спален
                    </span>
                  )}
                  {basePrice != null && Number(basePrice) > 0 && (
                    <span className="flex items-center gap-1 ml-auto text-primary font-semibold">
                      от {Number(basePrice).toLocaleString("ru-RU")} ₽/ночь
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}