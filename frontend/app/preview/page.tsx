import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchPreviewDraft } from "@/lib/wagtail";
import { BlockRenderer } from "@/components/blocks/registry";
import type { WagtailPage } from "@/lib/wagtail";

interface Props {
  searchParams: Promise<{ content_type?: string; token?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { content_type, token } = await searchParams;
  if (!content_type || !token) return {};

  const draft = await fetchPreviewDraft(content_type, token);
  if (!draft) return {};

  return { title: `[PREVIEW] ${draft.title}` };
}

export default async function PreviewPage({ searchParams }: Props) {
  const { content_type, token } = await searchParams;

  if (!content_type || !token) {
    notFound();
  }

  const draft = await fetchPreviewDraft(content_type, token);
  if (!draft) {
    notFound();
  }

  return (
    <div className="min-h-screen">
      <div className="bg-yellow-500/20 border-b border-yellow-500/40 px-4 py-2 text-sm text-yellow-200 flex items-center gap-2">
        <span className="font-bold">🔍 PREVIEW MODE</span>
        <span>{draft.title}</span>
        <span className="text-yellow-200/60">({draft.type})</span>
      </div>
      <div className="p-4">
        {/* Rendered via /api/v2/pages/{id}/ for full page content */}
      </div>
    </div>
  );
}
