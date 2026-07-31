'use client'

import toast from 'react-hot-toast'
import { TelegramLoginButton } from '@/components/auth/TelegramLoginButton'

interface SaveAccountModalProps {
  onClose: () => void
  onSaved?: () => void
}

/**
 * Modal that prompts the anonymous user to log in via Telegram after
 * submitting an RSVP, so the vote persists across sessions.
 *
 * The `TelegramLoginButton` component handles the auth flow internally — it
 * reads `NEXT_PUBLIC_TELEGRAM_BOT_NAME` and posts the verified payload to
 * `/api/users/telegram-login`. We close the modal optimistically and
 * surface a success toast.
 */
export function SaveAccountModal({ onClose, onSaved }: SaveAccountModalProps) {
  const handleSkip = () => onClose()

  const handleLogin = () => {
    toast.success('Аккаунт сохраняется — изменения вступят в силу через пару секунд.')
    onSaved?.()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-account-title"
    >
      <div className="bg-base-200 rounded-2xl p-6 w-full max-w-sm border border-base-300">
        <div className="flex items-center justify-between mb-4">
          <h3 id="save-account-title" className="text-white font-semibold">
            Сохранить аккаунт
          </h3>
          <button
            type="button"
            onClick={handleSkip}
            className="text-base-content/50 hover:text-white"
            aria-label="Закрыть"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="text-base-content/60 text-sm mb-4">
          Войдите через Telegram, чтобы ваш голос не потерялся. Это быстро и безопасно.
        </p>
        <div className="flex flex-col items-center gap-4">
          <div onClick={handleLogin}>
            <TelegramLoginButton />
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="text-base-content/50 hover:text-white text-sm"
          >
            Пропустить
          </button>
        </div>
      </div>
    </div>
  )
}
