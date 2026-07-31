import { notFound } from "next/navigation";
import {
  fetchIndexBySlug,
  fetchChildren,
  type WagtailPage,
} from "@/lib/wagtail";
import { BlockRenderer } from "@/components/blocks/registry";
import { HousesGrid } from "@/components/houses/HousesGrid";

export const dynamic = "force-dynamic";

interface IndexBlock {
  type: string;
  value: unknown;
}

export default async function HousesPage() {
  // Resolve the index page by its URL slug (not numeric id) — robust to
  // page deletions / id shifts.
  const indexMaybe = await fetchIndexBySlug<
    WagtailPage & { intro?: IndexBlock[] }
  >("houses.HousesIndexPage", "houses", { fields: "intro" });
  if (!indexMaybe) notFound();
  // The notFound() above throws; cast narrows the type for the rest of
  // the function. Works in any Next.js version (some don't type notFound
  // as `never`).
  const index = indexMaybe as WagtailPage & { intro?: IndexBlock[]; id: number };

  // List of HousePage children via Wagtail's built-in child_of filter.
  const houses = await fetchChildren<WagtailPage>(
    index.id,
    "houses.HousePage",
    { fields: "summary,capacity,bedrooms,base_price" }
  );

  const intro = index.intro ?? [];

  return (
    <>
      {intro.length > 0 && <BlockRenderer blocks={intro} />}
      <HousesGrid houses={houses?.items ?? []} />
    </>
  );
}