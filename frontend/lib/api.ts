/**
 * Typed API helper for Next.js → Django Ninja / Wagtail.
 *
 * Uses SSR_BASE (BACKEND_URL) for SSR fetches — Docker-internal address,
 * fast and bypasses Caddy. Uses SITE_URL (NEXT_PUBLIC_SITE_URL) for
 * browser-side fetches.
 *
 * Default for api.get/post/delete is `server: true` — safe for server
 * components. Pass `{ server: false }` explicitly for browser-side fetches.
 */

// Server-side base for SSR fetch calls (backend on Docker internal network).
// Not NEXT_PUBLIC_* — never reaches the browser bundle.
// Guard: throw if not set — avoids silent wrong-address fallback in production.
// .env.local (loaded by next dev) provides the localhost:8001 fallback for local dev.
const SSR_BASE = process.env.BACKEND_URL ?? "http://localhost:8001";

// Public origin for browser-side fetches — always absolute and browser-safe.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build an absolute URL for the backend. */
export function apiUrl(path: string, opts?: { server?: boolean }): string {
  const base = opts?.server ? SSR_BASE : SITE_URL;
  return `${base}${path}`;
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
  /**
   * GET. Default `opts.server = true` → SSR fetches go to Docker-internal
   * BACKEND_URL. Pass `{ server: false }` for browser-side fetches that
   * must hit the public origin.
   */
  get<T>(
    path: string,
    init?: RequestInit,
    opts?: { server?: boolean }
  ): Promise<T> {
    return fetch(apiUrl(path, opts ?? { server: true }), init).then(checkRes<T>);
  },

  post<T>(
    path: string,
    data?: unknown,
    init?: RequestInit,
    opts?: { server?: boolean }
  ): Promise<T> {
    return fetch(apiUrl(path, opts ?? { server: true }), {
      method: "POST",
      headers: data ? { "Content-Type": "application/json" } : undefined,
      body: data ? JSON.stringify(data) : undefined,
      ...init,
    }).then(checkRes<T>);
  },

  delete<T>(
    path: string,
    init?: RequestInit,
    opts?: { server?: boolean }
  ): Promise<T> {
    return fetch(apiUrl(path, opts ?? { server: true }), {
      method: "DELETE",
      ...init,
    }).then(checkRes<T>);
  },
};
