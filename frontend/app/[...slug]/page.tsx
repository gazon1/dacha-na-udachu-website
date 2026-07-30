import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { resolvePage, fetchPage, type WagtailPage } from "@/lib/wagtail";
import { BlockRenderer } from "@/components/blocks/registry";

interface Props {
  params: Promise<{ slug: string[] }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const path = "/" + (slug ?? []).join("/");

  const resolved = await resolvePage(path);
  if (!resolved) return {};

  const page = await fetchPage<WagtailPage>(resolved.url);
  if (!page) return {};

  return {
    title: page.title,
    description: (page as unknown as Record<string, string>)["search_description"] ?? undefined,
    openGraph: {
      title: page.title,
      type: "article",
    },
  };
}

export default async function CatchAllPage({ params }: Props) {
  const { slug } = await params;
  const path = "/" + (slug ?? []).join("/");

  const resolved = await resolvePage(path);
  if (!resolved) notFound();

  const page = await fetchPage<WagtailPage & { body?: unknown[] }>(resolved.url);
  if (!page) notFound();

  const blocks = (page.body as Array<{ type: string; value: unknown }>) ?? [];

  return <BlockRenderer blocks={blocks} />;
}
