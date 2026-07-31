import { notFound } from "next/navigation";
import { fetchIndexBySlug, type WagtailPage } from "@/lib/wagtail";
import { BlockRenderer } from "@/components/blocks/registry";

export const dynamic = "force-dynamic";

interface PageBlock {
  type: string;
  value: unknown;
}

/**
 * /faq renders the FAQPage Wagtail page (id ~6 in current DB).
 * FAQPage already declares api_fields = [APIField("intro"), APIField("faq_items")],
 * and faq_items is rendered by the registered FaqBlock in the BlockRenderer.
 */
export default async function FaqPage() {
  const pageMaybe = await fetchIndexBySlug<WagtailPage & { body?: PageBlock[] }>(
    "faq.FAQPage",
    "faq",
    { fields: "intro,faq_items" }
  );
  if (!pageMaybe) notFound();
  const page = pageMaybe as WagtailPage & { body?: PageBlock[] };
  const blocks = page.body ?? [];
  return <BlockRenderer blocks={blocks} />;
}