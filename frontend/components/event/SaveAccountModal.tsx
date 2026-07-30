"use client";
import toast from "react-hot-toast";
import { TelegramLoginButton } from "@/components/auth/TelegramLoginButton";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "YourDachaBot";

interface SaveAccountModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export function SaveAccountModal({ onClose, onSaved }: SaveAccountModalProps) {
  const handleAuth = () => {
    toast.success("Аккаунт сохранён! Теперь ваш голос не потеряется.");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-surface-2 rounded-2xl p-6 w-full max-w-sm border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Сохранить аккаунт</h3>
          <button onClick={onClose} className="text-base-content/50 hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="text-base-content/60 text-sm mb-4">
          Войдите через Telegram, чтобы ваш голос не потерялся. Это быстро и безопасно.
        </p>
        <div className="flex flex-col items-center gap-4">
          <TelegramLoginButton botUsername={BOT_USERNAME} onAuth={handleAuth} />
          <button type="button" onClick={onClose} className="text-base-content/50 hover:text-white text-sm">
            Пропустить
          </button>
        </div>
      </div>
    </div>
  );
}
