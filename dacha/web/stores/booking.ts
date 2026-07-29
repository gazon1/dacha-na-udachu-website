import { create } from "zustand";
import type { House, BookingQuote } from "@/lib/booking";

type BookingStep = "house" | "dates" | "form";

interface BookingState {
  step: BookingStep;
  selectedHouse: House | null;
  checkIn: string | null;
  checkOut: string | null;
  quote: BookingQuote | null;
  options: Record<string, boolean>;
  setStep: (step: BookingStep) => void;
  selectHouse: (house: House) => void;
  setDates: (checkIn: string, checkOut: string) => void;
  setQuote: (quote: BookingQuote) => void;
  toggleOption: (key: string) => void;
  reset: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  step: "house",
  selectedHouse: null,
  checkIn: null,
  checkOut: null,
  quote: null,
  options: { banya: false, manhal: false, fishing: false },

  setStep: (step) => set({ step }),

  selectHouse: (house) =>
    set({ selectedHouse: house, step: "dates", checkIn: null, checkOut: null, quote: null }),

  setDates: (checkIn, checkOut) => set({ checkIn, checkOut }),

  setQuote: (quote) => set({ quote }),

  toggleOption: (key) =>
    set((state) => ({ options: { ...state.options, [key]: !state.options[key] } })),

  reset: () =>
    set({
      step: "house",
      selectedHouse: null,
      checkIn: null,
      checkOut: null,
      quote: null,
      options: { banya: false, manhal: false, fishing: false },
    }),
}));
