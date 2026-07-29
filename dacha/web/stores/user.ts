import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TelegramIdentity {
  telegram_id: number;
  telegram_username?: string;
  telegram_first_name: string;
  telegram_last_name?: string;
  telegram_photo_url?: string;
}

interface UserState {
  identity: TelegramIdentity | null;
  setIdentity: (identity: TelegramIdentity) => void;
  clearIdentity: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      identity: null,
      setIdentity: (identity) => set({ identity }),
      clearIdentity: () => set({ identity: null }),
    }),
    {
      name: "dacha-user-identity",
      version: 2,
      // Migrate from old schema { name, phone, telegram, token } to new { identity }
      migrate: () => {
        return { state: { identity: null }, version: 2 };
      },
    }
  )
);
