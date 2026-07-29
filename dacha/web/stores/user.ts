import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserIdentity {
  name: string;
  phone: string;
  telegram: string;
}

interface UserState {
  identity: UserIdentity | null;
  eventId: number | null;
  setIdentity: (name: string, phone: string, telegram: string) => void;
  clearIdentity: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      identity: null,
      eventId: null,
      setIdentity: (name, phone, telegram) =>
        set({ identity: { name, phone, telegram } }),
      clearIdentity: () => set({ identity: null }),
    }),
    { name: "dacha-user-identity" }
  )
);
