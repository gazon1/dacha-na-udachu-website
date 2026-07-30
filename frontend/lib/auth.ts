/**
 * Auth API client — Telegram Login Widget.
 *
 * Session token is stored in httpOnly cookie (set by POST /api/auth/telegram/).
 * This module does NOT store the token in localStorage.
 */

import { api, apiUrl } from "./api";

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

function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : "";
}

// ─── API calls ────────────────────────────────────────────────────────────────

/** POST /api/auth/telegram/ — verify HMAC, create/update account, set httpOnly cookie. */
export async function loginWithTelegram(
  widgetUser: TelegramWidgetUser
): Promise<TelegramAuthResult | { error: string }> {
  try {
    return await api.post<TelegramAuthResult>(
      "/api/auth/telegram/",
      widgetUser,
      { credentials: "include", headers: { "X-CSRFToken": getCsrfToken() } }
    );
  } catch (e) {
    return { error: (e as Error).message || "Ошибка авторизации через Telegram" };
  }
}

/** GET /api/auth/me/ — fetch current user from session cookie. Returns null if not logged in. */
export async function fetchMe(): Promise<TelegramIdentity | null> {
  try {
    return await api.get<TelegramIdentity>("/api/auth/me/", {
      credentials: "include",
    });
  } catch {
    return null;
  }
}

/** POST /api/auth/logout/ — invalidate session token, clear httpOnly cookie. */
export async function logout(): Promise<void> {
  await fetch(apiUrl("/api/auth/logout/"), {
    method: "POST",
    credentials: "include",
    headers: { "X-CSRFToken": getCsrfToken() },
  });
}
