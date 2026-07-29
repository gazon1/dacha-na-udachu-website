import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserIdentity {
  name: string;
  phone: string;
  telegram: string;
  token?: string;
}

interface UserState {
  identity: UserIdentity | null;
  setIdentity: (name: string, phone: string, telegram: string, token?: string) => void;
  clearIdentity: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      identity: null,
      setIdentity: (name, phone, telegram, token) =>
        set((state) => ({
          identity: { name, phone, telegram, token: token ?? state.identity?.token },
        })),
      clearIdentity: () => set({ identity: null }),
    }),
    { name: "dacha-user-identity" }
  )
);
