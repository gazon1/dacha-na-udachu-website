"use client";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue } from "react";
import { useBookingStore } from "@/stores/booking";
import { fetchQuote } from "@/lib/booking";
import { HouseSelector } from "./HouseSelector";
import { DateRangePicker } from "./DateRangePicker";
import { BookingForm } from "./BookingForm";

export function BookingWizard() {
  const store = useBookingStore();
  const { selectedHouse, checkIn, checkOut, options, step, setQuote } = store;

  // Fetch quote when dates or options change (deferred to avoid blocking)
  const deferredOptions = useDeferredValue(options);
  const { data: quote } = useQuery({
    queryKey: ["quote", selectedHouse?.id, checkIn, checkOut, deferredOptions],
    queryFn: () => {
      if (!selectedHouse || !checkIn || !checkOut) return null;
      return fetchQuote(selectedHouse.id, checkIn, checkOut, deferredOptions);
    },
    enabled: !!selectedHouse && !!checkIn && !!checkOut,
  });

  // Sync quote to store
  useEffect(() => {
    if (quote) setQuote(quote);
  }, [quote, setQuote]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-white text-center mb-10">Бронирование</h1>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-10">
        {(["house", "dates", "form"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step === s ? "bg-primary text-[#213600]" :
                (s === "house" && step !== "house") || (s === "dates" && step === "form") ? "bg-primary/30 text-primary" :
                "bg-surface-3 text-base-content/40"
              }`}
            >
              {i + 1}
            </div>
            {i < 2 && (
              <div className={`w-8 h-0.5 ${step === "form" ? "bg-primary" : "bg-surface-3"}`} />
            )}
          </div>
        ))}
      </div>

      {step === "house" && (
        <section>
          <h2 className="text-xl font-semibold mb-6">Выберите дом</h2>
          <HouseSelector />
        </section>
      )}

      {step === "dates" && (
        <section className="bg-surface-2 rounded-2xl p-8 border border-stroke">
          <DateRangePicker />
        </section>
      )}

      {step === "form" && (
        <section>
          <BookingForm />
        </section>
      )}
    </div>
  );
}
