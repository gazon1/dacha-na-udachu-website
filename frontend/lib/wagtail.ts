/**
 * Wagtail API client for Next.js.
 * All page content comes from Django's /api/v2/pages/ endpoint.
 */

import { api, apiUrl } from "./api";

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
  const params = new URLSearchParams({ content_type: contentType, token });
  const res = await api.get<{ id: number; title: string; type: string; url: string }>(
    `/api/preview/draft/?${params}`,
    { next: { revalidate: 0 } }
  );
  return res ?? null;
}

/** Resolve a URL path to a Wagtail page detail URL. */
export async function resolvePage(
  path: string
): Promise<{ id: number; type: string; url: string } | null> {
  try {
    return await api.get<{ id: number; type: string; url: string }>(
      `/api/pages/resolve/?html_path=${encodeURIComponent(path)}`,
      // next.revalidate must NOT be set here — resolvePage is called from server
      // components during SSR, not as a cached fetch
    );
  } catch {
    return null;
  }
}

/** Fetch a single page by its detail URL. */
export async function fetchPage<T extends WagtailPage = WagtailPage>(
  detailUrl: string
): Promise<T | null> {
  // detailUrl is /api/v2/pages/N/ — prepend SITE_URL
  const url = detailUrl.startsWith("/") ? apiUrl(detailUrl) : detailUrl;
  try {
    return await api.get<T>(url, { next: { revalidate: 60 } });
  } catch {
    return null;
  }
}

/** Fetch a page by its numeric ID. */
export async function fetchPageById<
  T extends WagtailPage = WagtailPage
>(id: number): Promise<T | null> {
  return fetchPage<T>(`/api/v2/pages/${id}/`);
}

/** Fetch pages of a specific type. */
export async function fetchPagesByType<
  T extends WagtailPage = WagtailPage
>(
  type: string,
  options?: { fields?: string; limit?: number; offset?: number }
): Promise<{ items: T[]; total: number } | null> {
  const params = new URLSearchParams({ type });
  if (options?.fields) params.set("fields", options.fields);
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.offset) params.set("offset", String(options.offset));

  try {
    return await api.get<{ items: T[]; total: number }>(
      `/api/v2/pages/?${params}`,
      { next: { revalidate: 60 } }
    );
  } catch {
    return null;
  }
}

/** Fetch the site root page (homepage at /). */
export async function fetchRootPage<
  T extends WagtailPage = WagtailPage
>(): Promise<T | null> {
  const resolved = await resolvePage("/");
  if (!resolved) return null;
  return fetchPage<T>(resolved.url);
}
