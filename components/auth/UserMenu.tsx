'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

export type UserData = {
  id: string | number
  telegramId?: string | null
  firstName?: string | null
  lastName?: string | null
  telegramUsername?: string | null
  telegramPhotoUrl?: string | null
  role?: string
}

export function UserMenu() {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setUser(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-base-300 animate-pulse" />
  }

  if (!user) {
    // Not logged in — render the official Telegram widget iframe here.
    // The script below replaces itself with an <iframe> at the same DOM
    // position, so the button visually appears in the top-right corner.
    return <TelegramLoginWidget />
  }

  // Logged in — show user menu
  return <UserDropdown user={user} onLogout={() => setUser(null)} />
}

function TelegramLoginWidget() {
  const containerRef = useRef<HTMLDivElement>(null)
  const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME

  useEffect(() => {
    if (typeof window === 'undefined' || !botName || !containerRef.current) return

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', botName)
    script.setAttribute('data-size', 'medium')
    script.setAttribute('data-radius', '8')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    containerRef.current.appendChild(script)
    ;(window as Window & { onTelegramAuth?: typeof submitToBackend }).onTelegramAuth = submitToBackend

    return () => {
      // The script is replaced by the iframe, so we have to remove the
      // iframe itself on unmount.
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
      delete (window as Window & { onTelegramAuth?: typeof submitToBackend }).onTelegramAuth
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botName])

  if (!botName) return null

  return (
    <div
      ref={containerRef}
      className="telegram-login-widget flex items-center"
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

function UserDropdown({ user, onLogout }: { user: UserData; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const isAdmin = user.role === 'admin'

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      onLogout()
      window.location.reload()
    } catch (err) {
      console.error('Logout error', err)
    }
  }

  return (
    <div className="dropdown dropdown-end">
      <label tabIndex={0} className="btn btn-ghost btn-circle avatar relative">
        <div className="w-8 h-8 rounded-full bg-base-300 overflow-hidden ring ring-primary ring-offset-base-100 ring-offset-1">
          {user.telegramPhotoUrl ? (
            <img
              src={user.telegramPhotoUrl}
              alt={user.firstName || 'User'}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm font-bold">
              {user.firstName?.[0] || '?'}
            </div>
          )}
        </div>
        {isAdmin && (
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary ring-2 ring-base-100"
            aria-label="Админ"
            title="Админ"
          />
        )}
      </label>
      <ul
        tabIndex={0}
        className="mt-3 z-50 shadow-lg menu menu-sm dropdown-content bg-base-200 rounded-box w-56 border border-base-300"
      >
        <li className="menu-title px-4 py-2 border-b border-base-300">
          <div className="flex flex-col">
            <span className="font-medium">
              {user.firstName} {user.lastName}
            </span>
            {user.telegramUsername && (
              <span className="text-xs text-base-content/60">
                @{user.telegramUsername}
              </span>
            )}
            {isAdmin && (
              <span className="badge badge-primary badge-sm mt-1 self-start">Админ</span>
            )}
          </div>
        </li>
        {isAdmin && (
          <li>
            <Link
              href="/admin"
              className="text-primary font-medium flex items-center gap-2"
              onClick={() => setOpen(false)}
            >
              <span className="material-symbols-outlined text-base">admin_panel_settings</span>
              Админ-панель
            </Link>
          </li>
        )}
        <li>
          <button onClick={handleLogout} className="text-error">
            Выйти
          </button>
        </li>
      </ul>
    </div>
  )
}
