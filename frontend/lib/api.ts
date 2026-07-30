/**
 * Typed API helper for Next.js → Django Ninja / Wagtail.
 *
 * Uses SITE_URL as base so fetch works in both browser AND SSR (undici) contexts.
 * NEXT_PUBLIC_SITE_URL is browser-baked at build time to the public frontend origin,
 * so it resolves correctly everywhere.
 */

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build an absolute URL for the backend. */
export function apiUrl(path: string): string {
  return `${SITE_URL}${path}`;
}

/** Check HTTP response and parse JSON. Throws on non-2xx. */
export async function checkRes<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `HTTP ${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.value?.error) msg = body.value.error;
      else if (body?.error) msg = body.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// ─── Generic fetch helpers ────────────────────────────────────────────────────

export const api = {
  get<T>(path: string, init?: RequestInit): Promise<T> {
    return fetch(apiUrl(path), init).then(checkRes<T>);
  },

  post<T>(
    path: string,
    data?: unknown,
    init?: RequestInit
  ): Promise<T> {
    return fetch(apiUrl(path), {
      method: "POST",
      headers: data ? { "Content-Type": "application/json" } : undefined,
      body: data ? JSON.stringify(data) : undefined,
      ...init,
    }).then(checkRes<T>);
  },

  delete<T>(path: string, init?: RequestInit): Promise<T> {
    return fetch(apiUrl(path), { method: "DELETE", ...init }).then(checkRes<T>);
  },
};
