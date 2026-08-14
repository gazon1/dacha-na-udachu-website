'use client'

import { useEffect } from 'react'

const BOT_NAME =
  typeof process !== 'undefined'
    ? process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME
    : undefined


interface TelegramAuthUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

/**
 * Telegram Login Widget for the Payload admin login page.
 *
 * Renders under the standard email/password form via
 * admin.components.afterLogin in payload.config.ts.
 *
 * When Telegram authentication succeeds, it posts to /api/users/telegram-login
 * (the same endpoint used by the frontend widget), receives a payload-token
 * JWT, and redirects to /admin so Payload's JWTAuthentication picks it up.
 */
export function TelegramLoginWidget() {
  useEffect(() => {
    if (!BOT_NAME) return

    // Telegram widget callback — receives the verified Telegram auth payload.
    // Use a uniquely-named property to avoid clashing with other components
    // (UserMenu, TelegramLoginButton) that also assign window.onTelegramAuth.
    const callbackName = '__dachaAdminTelegramAuth'
    ;(window as unknown as Record<string, unknown>)[callbackName] = async (
      user: TelegramAuthUser,
    ) => {
      try {
        const res = await fetch('/api/users/telegram-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(user),
        })

        if (res.ok) {
          window.location.assign('/admin')
        } else {
          console.error('[TelegramLoginWidget] login failed:', res.status)
        }
      } catch (err) {
        console.error('[TelegramLoginWidget] network error:', err)
      }
    }

    // Load the official Telegram widget SDK.
    const existing = document.getElementById('telegram-widget-sdk')
    if (!existing) {
      const script = document.createElement('script')
      script.id = 'telegram-widget-sdk'
      script.src = 'https://telegram.org/js/telegram-widget.js?22'
      script.setAttribute('data-telegram-login', BOT_NAME)
      script.setAttribute('data-size', 'large')
      script.setAttribute('data-onauth', `${callbackName}(user)`)
      script.setAttribute('data-request-access', 'write')
      script.async = true
      document.head.appendChild(script)
    }
  }, [])

  if (!BOT_NAME) {
    return (
      <div
        style={{
          marginTop: '1rem',
          padding: '0.75rem',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          color: 'rgba(255,255,255,0.5)',
          textAlign: 'center',
        }}
      >
        Telegram-логин не настроен. Установите NEXT_PUBLIC_TELEGRAM_BOT_NAME в .env.
      </div>
    )
  }

  return (
    <div
      style={{
        marginTop: '1rem',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      {/* The SDK replaces this div with the actual button */}
      <div id="telegram-login-placeholder" />
    </div>
  )
}
