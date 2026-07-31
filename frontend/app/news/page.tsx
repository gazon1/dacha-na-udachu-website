import { notFound } from "next/navigation";
import {
  fetchIndexBySlug,
  fetchChildren,
  type WagtailPage,
} from "@/lib/wagtail";
import { BlockRenderer } from "@/components/blocks/registry";
import { NewsGrid } from "@/components/news/NewsGrid";

export const dynamic = "force-dynamic";

interface IndexBlock {
  type: string;
  value: unknown;
}

export default async function NewsPage() {
  const indexMaybe = await fetchIndexBySlug<
    WagtailPage & { intro?: IndexBlock[] }
  >("news.NewsIndexPage", "news", { fields: "intro" });
  if (!indexMaybe) notFound();
  const index = indexMaybe as WagtailPage & { intro?: IndexBlock[]; id: number };

  const news = await fetchChildren<WagtailPage>(index.id, "news.NewsPage", {
    fields: "date,summary,main_image",
  });

  const intro = index.intro ?? [];

  return (
    <>
      {intro.length > 0 && <BlockRenderer blocks={intro} />}
      <NewsGrid items={news?.items ?? []} />
    </>
  );
}