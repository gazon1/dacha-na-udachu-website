'use client'

import { useEffect, useRef } from 'react'

/**
 * Telegram Login Widget.
 *
 * Renders the official Telegram widget iframe at the call site. The script
 * is appended to a ref'd container (not `document.body`) so the button
 * always appears where this component is mounted.
 *
 * Flow:
 *  1. The script replaces itself with an iframe. Clicking the iframe opens
 *     the Telegram auth popup.
 *  2. On success the iframe calls `window.onTelegramAuth(user)`, which we
 *     set to `submitToBackend`.
 *  3. `submitToBackend` posts the verified payload to
 *     `/api/users/telegram-login`. The server verifies the HMAC, finds or
 *     creates the user, sets the `telegram-session` cookie, and returns
 *     the user info.
 *  4. Reload the page so server-rendered components see the session.
 *
 * Requires NEXT_PUBLIC_TELEGRAM_BOT_NAME env var (bot username without @).
 */
export function TelegramLoginButton() {
  const containerRef = useRef<HTMLDivElement>(null)
  const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || ''

  useEffect(() => {
    if (!botName || !containerRef.current) return
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', botName)
    script.setAttribute('data-size', 'medium')
    script.setAttribute('data-radius', '8')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    containerRef.current.appendChild(script)
    ;(window as unknown as { onTelegramAuth?: typeof submitToBackend }).onTelegramAuth = submitToBackend

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
      delete (window as unknown as { onTelegramAuth?: typeof submitToBackend }).onTelegramAuth
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botName])

  if (!botName) return null

  return (
    <div
      ref={containerRef}
      className="telegram-login-widget flex items-center justify-center"
      aria-label="Войти через Telegram"
    />
  )
}

async function submitToBackend(data: Record<string, string>) {
  try {
    // Step 1: POST verified payload to /telegram-login. The server verifies
    // the HMAC, finds/creates the user, sets the `telegram-session` cookie
    // and returns the user info. We do NOT call /api/users/login — that
    // would set `payload-token` and stomp on the admin session.
    const loginRes = await fetch('/api/users/telegram-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    })
    if (!loginRes.ok) {
      console.error('Telegram login failed', await loginRes.text())
      return
    }

    // Refresh server components so they see the new session.
    if (typeof window !== 'undefined') window.location.reload()
  } catch (err) {
    console.error('Telegram login network error', err)
  }
}
