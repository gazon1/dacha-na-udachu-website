import { notFound } from "next/navigation";
import { fetchPageById, type WagtailPage } from "@/lib/wagtail";
import { BlockRenderer } from "@/components/blocks/registry";

export const dynamic = "force-dynamic";

export default async function HousesPage() {
  const page = await fetchPageById<WagtailPage & { body?: unknown[] }>(2);
  if (!page) notFound();
  const blocks = (page.body as Array<{ type: string; value: unknown }>) ?? [];
  return <BlockRenderer blocks={blocks} />;
}
