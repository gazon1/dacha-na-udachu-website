/**
 * Wagtail API client for Next.js.
 * All page content comes from Django's /api/v2/pages/ endpoint.
 */

const API_BASE = process.env.NEXT_PUBLIC_WAGTAIL_API_URL ?? "http://localhost:8000/api/v2";

export interface WagtailPage {
  id: number;
  meta: {
    type: string;
    detail_url: string;
    html_url: string;
    slug: string;
    first_published_at: string | null;
    last_published_at: string | null;
    [key: string]: unknown;
  };
  title: string;
  slug: string;
  [key: string]: unknown;
}

/** Fetch a draft page preview by content_type + token from wagtail-headless-preview. */
export async function fetchPreviewDraft(
  contentType: string,
  token: string
): Promise<{ id: number; title: string; type: string; url: string } | null> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const params = new URLSearchParams({ content_type: contentType, token });
  const res = await fetch(`${base}/api/preview/draft/?${params}`, {
    next: { revalidate: 0 }, // always fetch fresh draft
  });
  if (!res.ok) return null;
  return res.json();
}

/** Resolve a URL path to a Wagtail page detail URL. */
export async function resolvePage(path: string): Promise<{ id: number; type: string; url: string } | null> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/pages/resolve/?html_path=${encodeURIComponent(path)}`,
    { next: { revalidate: 60 } }
  );
  if (!res.ok) return null;
  return res.json();
}

/** Fetch a single page by its detail URL. */
export async function fetchPage<T extends WagtailPage = WagtailPage>(detailUrl: string): Promise<T | null> {
  // detailUrl from resolvePage is /api/v2/pages/N/ — already the path under API_BASE.
  // Prepend origin only; do NOT double-prepend the /api/v2 prefix.
  const origin = API_BASE.replace(/\/api\/v2$/, "");
  const url = detailUrl.startsWith("/") ? `${origin}${detailUrl}` : detailUrl;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  return res.json();
}

/** Fetch a page by its numeric ID. */
export async function fetchPageById<T extends WagtailPage = WagtailPage>(id: number): Promise<T | null> {
  return fetchPage<T>(`${API_BASE}/pages/${id}/`);
}

/** Fetch pages of a specific type. */
export async function fetchPagesByType<T extends WagtailPage = WagtailPage>(
  type: string,
  options?: { fields?: string; limit?: number; offset?: number }
): Promise<{ items: T[]; total: number } | null> {
  const params = new URLSearchParams({ type });
  if (options?.fields) params.set("fields", options.fields);
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.offset) params.set("offset", String(options.offset));

  const res = await fetch(`${API_BASE}/pages/?${params}`, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  return res.json();
}

/** Fetch the site root page (homepage at /). */
export async function fetchRootPage<T extends WagtailPage = WagtailPage>(): Promise<T | null> {
  // Use resolve endpoint to find the homepage, since Wagtail root is not page ID 1
  const resolved = await resolvePage("/");
  if (!resolved) return null;
  return fetchPage<T>(resolved.url);
}
