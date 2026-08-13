'use client'

import { useEffect, useState } from 'react'

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
    return (
      <div className="w-8 h-8 rounded-full bg-base-300 animate-pulse" />
    )
  }

  if (!user) {
    // Not logged in — show Telegram login button
    return <TelegramLoginButton />
  }

  // Logged in — show user menu
  return <UserDropdown user={user} onLogout={() => setUser(null)} />
}

function TelegramLoginButton() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME
    if (!botName) return

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', botName)
    script.setAttribute('data-size', 'medium')
    script.setAttribute('data-radius', '8')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    document.body.appendChild(script)
    ;(window as any).onTelegramAuth = submitToBackend
    return () => {
      document.body.removeChild(script)
      delete (window as any).onTelegramAuth
    }
  }, [])

  async function submitToBackend(data: Record<string, string>) {
    try {
      const loginRes = await fetch('/api/users/telegram-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!loginRes.ok) return
      const { token } = await loginRes.json()
      if (!token) return

      const sessionRes = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ strategy: 'telegram', token }),
      })
      if (!sessionRes.ok) return
      window.location.reload()
    } catch (err) {
      console.error('Telegram login error', err)
    }
  }

  const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME
  if (!botName) return null

  return (
    <button
      type="button"
      className="btn btn-primary btn-sm gap-2"
      onClick={() => {
        if (typeof window !== 'undefined' && (window as any).Telegram?.LoginWidget) {
          ;(window as any).Telegram.LoginWidget.auth(
            { bot_id: botName, request_access: 'write' },
            submitToBackend,
          )
        }
      }}
      aria-label="Войти через Telegram"
    >
      <svg height="20" width="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.248-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.44-.751-.245-1.349-.374-1.297-.789.027-.216.324-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.121.099.154.232.17.325.015.093.034.306.019.471z"/>
      </svg>
      <span className="hidden sm:inline">Войти</span>
    </button>
  )
}

function UserDropdown({ user, onLogout }: { user: UserData; onLogout: () => void }) {
  const [open, setOpen] = useState(false)

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
      <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
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
      </label>
      <ul tabIndex={0} className="mt-3 z-50 shadow-lg menu menu-sm dropdown-content bg-base-200 rounded-box w-52 border border-base-300">
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
            {user.role === 'admin' && (
              <span className="badge badge-primary badge-sm mt-1">Админ</span>
            )}
          </div>
        </li>
        <li>
          <button onClick={handleLogout} className="text-error">
            Выйти
          </button>
        </li>
      </ul>
    </div>
  )
}
