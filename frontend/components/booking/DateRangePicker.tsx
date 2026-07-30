"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DayPicker } from "react-day-picker";
import { fetchAvailability, type DateRange } from "@/lib/booking";
import { useBookingStore } from "@/stores/booking";
import "react-day-picker/style.css";

function formatDisplay(dateStr: string | null): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
}

export function DateRangePicker() {
  const store = useBookingStore();
  const { selectedHouse, checkIn, checkOut } = store;
  const [hovered, setHovered] = useState<Date | undefined>();

  const { data: avail } = useQuery({
    queryKey: ["availability", selectedHouse?.id],
    queryFn: () =>
      selectedHouse ? fetchAvailability(selectedHouse.id) : Promise.resolve({ available: true, booked_dates: [] }),
    enabled: !!selectedHouse,
  });

  const disabledDays = (avail?.booked_dates ?? []).flatMap((r: DateRange) => {
    const start = new Date(r.start);
    const end = new Date(r.end);
    return { from: start, to: end };
  });

  const handleSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (!range?.from) return;
    if (!range?.to || range.from > range.to) {
      store.setDates(range.from.toISOString().split("T")[0], "");
      return;
    }
    store.setDates(range.from.toISOString().split("T")[0], range.to.toISOString().split("T")[0]);
  };

  const selectedRange = checkIn && checkOut
    ? { from: new Date(checkIn), to: new Date(checkOut) }
    : undefined;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white mb-1">Выберите даты</h2>
        {selectedHouse && (
          <p className="text-base-content/60 text-sm">{selectedHouse.title}</p>
        )}
      </div>

      <DayPicker
        mode="range"
        selected={selectedRange}
        onSelect={handleSelect}
        onDayMouseEnter={setHovered}
        disabled={[{ from: new Date(1900, 0, 1), to: new Date() }, ...disabledDays]}
        min={2}
        startMonth={new Date()}
      />

      {checkIn && (
        <div className="text-center">
          <p className="text-base-content/70">
            {checkOut ? (
              <>
                {formatDisplay(checkIn)} — {formatDisplay(checkOut)}&nbsp;
                <span className="text-primary font-semibold">
                  ({Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)} ночей)
                </span>
              </>
            ) : (
              <>Заезд: {formatDisplay(checkIn)} — выберите дату выезда</>
            )}
          </p>
        </div>
      )}

      <button
        onClick={() => store.setStep("house")}
        className="text-base-content/60 hover:text-white transition-colors text-sm flex items-center gap-1"
      >
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Назад к домам
      </button>
    </div>
  );
}
