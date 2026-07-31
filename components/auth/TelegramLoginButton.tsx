'use client'

import { useEffect, useState } from 'react'

/**
 * Telegram Login Widget button.
 *
 * Loads the official Telegram widget script and renders a Login Widget that
 * posts the verified payload to /api/users/telegram-login.
 *
 * Requires:
 * - NEXT_PUBLIC_TELEGRAM_BOT_NAME env var (bot username without @)
 * - TelegramLoginButton.tsx is mounted on a page that has access to the
 *   server actions (not from a Server Component static export).
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
  }
}

export function TelegramLoginButton() {
  const [botName] = useState(
    () => process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || '',
  )

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
    // Expose the global callback for the Telegram widget to call.
    ;(window as unknown as { onTelegramAuth: (u: Record<string, string>) => void }).onTelegramAuth =
      submitToBackend
    return () => {
      document.body.removeChild(script)
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
    const res = await fetch('/api/users/telegram-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      console.error('Telegram login failed', await res.text())
      return
    }
    // After login, refresh the page so server-rendered components see the
    // new session cookie.
    if (typeof window !== 'undefined') window.location.reload()
  } catch (err) {
    console.error('Telegram login network error', err)
  }
}
