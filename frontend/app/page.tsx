import type { Metadata } from "next";
import { fetchRootPage, fetchPreviewDraft, type WagtailPage } from "@/lib/wagtail";
import { BlockRenderer } from "@/components/blocks/registry";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Evergreen Community — загородный клуб",
};

interface Props {
  searchParams: Promise<{ content_type?: string; token?: string }>;
}

export default async function HomePage({ searchParams }: Props) {
  const { content_type, token } = await searchParams;

  // Wagtail preview mode — handle ?content_type=...&token=...
  if (content_type && token) {
    const draft = await fetchPreviewDraft(content_type, token);
    if (!draft) {
      return (
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Preview не найден</h1>
          <p className="text-base-content/60">Токен истёк или недействителен.</p>
        </div>
      );
    }

    const page = await fetchRootPage<WagtailPage & { body?: unknown[] }>();
    const blocks = (page?.body as Array<{ type: string; value: unknown }>) ?? [];

    return (
      <div className="min-h-screen">
        <div className="bg-yellow-500/20 border-b border-yellow-500/40 px-4 py-2 text-sm text-yellow-200 flex items-center gap-2">
          <span className="font-bold">🔍 PREVIEW MODE</span>
          <span>{draft.title}</span>
          <span className="text-yellow-200/60">({draft.type})</span>
        </div>
        <div className="p-4">
          {blocks.length > 0 ? (
            <BlockRenderer blocks={blocks} />
          ) : (
            <p className="text-base-content/60 text-sm">Нет контента для превью.</p>
          )}
        </div>
      </div>
    );
  }

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
