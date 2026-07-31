'use client'

import { useEffect } from 'react'

/**
 * Telegram Login Widget button.
 *
 * Flow:
 *  1. Load the official Telegram widget script.
 *  2. On auth callback, POST the verified payload to
 *     /api/users/telegram-login → receive a base64 token + user info.
 *  3. POST { strategy: 'telegram', token } to /api/users/login — Payload's
 *     custom auth strategy (collections/strategies/telegram.ts) re-verifies
 *     the hash and returns the User, then Payload sets the auth cookie.
 *  4. Reload the page so server-rendered components see the session.
 *
 * Requires NEXT_PUBLIC_TELEGRAM_BOT_NAME env var (bot username without @).
 */
declare global {
  interface Window {
    Telegram?: {
      LoginWidget?: {
        auth: (
          options: { bot_id: string; request_access: 'write' },
          callback: (data: Record<string, string>) => void,
        ) => void
      }
    }
    onTelegramAuth?: (user: Record<string, string>) => void
  }
}

export function TelegramLoginButton() {
  const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || ''

  useEffect(() => {
    if (!botName) return
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', botName)
    script.setAttribute('data-size', 'medium')
    script.setAttribute('data-radius', '8')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    document.body.appendChild(script)
    window.onTelegramAuth = submitToBackend
    return () => {
      document.body.removeChild(script)
      delete window.onTelegramAuth
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botName])

  if (!botName) return null

  return (
    <button
      type="button"
      className="btn btn-primary btn-sm gap-2"
      onClick={() => openTelegramWidget(botName)}
      aria-label="Войти через Telegram"
    >
      <span className="material-symbols-outlined">send</span>
      <span className="hidden sm:inline">Войти</span>
    </button>
  )
}

function openTelegramWidget(botName: string) {
  if (typeof window === 'undefined') return
  if (window.Telegram?.LoginWidget) {
    window.Telegram.LoginWidget.auth(
      { bot_id: botName, request_access: 'write' },
      submitToBackend,
    )
  }
}

async function submitToBackend(data: Record<string, string>) {
  try {
    // Step 1: POST verified payload to /telegram-login to get a base64 token.
    const loginRes = await fetch('/api/users/telegram-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!loginRes.ok) {
      console.error('Telegram login failed', await loginRes.text())
      return
    }
    const { token } = await loginRes.json()
    if (!token) {
      console.error('No token returned from /telegram-login')
      return
    }

    // Step 2: POST { strategy: 'telegram', token } to /api/users/login.
    // Payload invokes our custom telegramStrategy.authenticate, which re-verifies
    // the hash, then sets the auth cookie.
    const sessionRes = await fetch('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ strategy: 'telegram', token }),
    })
    if (!sessionRes.ok) {
      console.error('Payload login failed', await sessionRes.text())
      return
    }

    // Refresh server components so they see the new session.
    if (typeof window !== 'undefined') window.location.reload()
  } catch (err) {
    console.error('Telegram login network error', err)
  }
}
