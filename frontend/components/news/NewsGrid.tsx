import Link from "next/link";
import type { WagtailPage } from "@/lib/wagtail";

interface NewsGridProps {
  items: WagtailPage[];
}

interface NewsMeta {
  type: string;
  detail_url: string;
  html_url: string;
  slug: string;
  download_url?: string;
  [key: string]: unknown;
}

interface NewsImage {
  id: number;
  meta?: NewsMeta;
}

/**
 * Card grid for NewsPage children fetched via Wagtail v2 ?child_of=<id>.
 *
 * Each item carries: date, summary, main_image.
 */
export function NewsGrid({ items }: NewsGridProps) {
  if (items.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center text-base-content/60">
        Новостей пока нет.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-6">
      {items.map((n) => {
        const date = (n as { date?: string }).date;
        const summary = (n as { summary?: string }).summary ?? "";
        const mainImage = (n as { main_image?: NewsImage }).main_image;
        const imageUrl = mainImage?.meta?.download_url;
        const formattedDate = date
          ? new Date(date).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : null;

        return (
          <Link
            key={n.id}
            href={`/news/${n.slug}`}
            className="glass-card overflow-hidden flex flex-col md:flex-row gap-4 group hover:ring-2 hover:ring-primary/40 transition-all p-4"
          >
            {imageUrl && (
              <div className="md:w-64 shrink-0 aspect-video md:aspect-square bg-base-300 overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={n.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
            )}
            <div className="flex-1">
              {formattedDate && (
                <div className="text-xs text-base-content/50 mb-2">
                  {formattedDate}
                </div>
              )}
              <h3 className="text-xl font-bold text-white mb-2">{n.title}</h3>
              {summary && (
                <p className="text-sm text-base-content/70 line-clamp-3">
                  {summary}
                </p>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}