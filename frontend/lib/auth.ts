/**
 * Auth API client — Telegram Login Widget.
 *
 * Session token is stored in httpOnly cookie (set by POST /api/auth/telegram/).
 * This module does NOT store the token in localStorage.
 */
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : "";
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface TelegramWidgetUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export interface TelegramAuthResult {
  telegram_id: number;
  telegram_username?: string;
  telegram_first_name: string;
  telegram_last_name?: string;
  telegram_photo_url?: string;
  session_token: string;
}

/** The identity stored in zustand (never includes the session_token). */
export interface TelegramIdentity {
  telegram_id: number;
  telegram_username?: string;
  telegram_first_name: string;
  telegram_last_name?: string;
  telegram_photo_url?: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

/** POST /api/auth/telegram/ — verify HMAC, create/update account, set httpOnly cookie. */
export async function loginWithTelegram(
  widgetUser: TelegramWidgetUser
): Promise<TelegramAuthResult | { error: string }> {
  const res = await fetch(`${BASE}/api/auth/telegram/`, {
    method: "POST",
    credentials: "include", // required for httpOnly cookie
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCsrfToken(),
    },
    body: JSON.stringify(widgetUser),
  });

  if (res.ok) {
    const data = await res.json();
    return {
      telegram_id: data.telegram_id,
      telegram_username: data.telegram_username ?? undefined,
      telegram_first_name: data.telegram_first_name,
      telegram_last_name: data.telegram_last_name ?? undefined,
      telegram_photo_url: data.telegram_photo_url ?? undefined,
      session_token: data.session_token,
    };
  }

  return { error: "Ошибка авторизации через Telegram" };
}

/** GET /api/auth/me/ — fetch current user from session cookie. Returns null if not logged in. */
export async function fetchMe(): Promise<TelegramIdentity | null> {
  const res = await fetch(`${BASE}/api/auth/me/`, {
    credentials: "include", // required for httpOnly cookie
  });

  if (!res.ok) return null;

  const data = await res.json();
  return {
    telegram_id: data.telegram_id,
    telegram_username: data.telegram_username ?? undefined,
    telegram_first_name: data.telegram_first_name,
    telegram_last_name: data.telegram_last_name ?? undefined,
    telegram_photo_url: data.telegram_photo_url ?? undefined,
  };
}

/** POST /api/auth/logout/ — invalidate session token, clear httpOnly cookie. */
export async function logout(): Promise<void> {
  await fetch(`${BASE}/api/auth/logout/`, {
    method: "POST",
    credentials: "include",
    headers: { "X-CSRFToken": getCsrfToken() },
  });
}
