import type { Metadata } from "next";
import { fetchRootPage, type WagtailPage } from "@/lib/wagtail";
import { BlockRenderer } from "@/components/blocks/registry";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Evergreen Community — загородный клуб",
};

export default async function HomePage() {
  const page = await fetchRootPage<WagtailPage & { body?: unknown[] }>();
  if (!page) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Evergreen Community</h1>
        <p className="text-base-content/60">Добро пожаловать!</p>
      </div>
    );
  }

  const blocks = (page.body as Array<{ type: string; value: unknown }>) ?? [];
  return <BlockRenderer blocks={blocks} />;
}
