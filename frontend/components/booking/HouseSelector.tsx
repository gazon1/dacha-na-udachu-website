"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchHouses } from "@/lib/booking";
import { useBookingStore } from "@/stores/booking";

export function HouseSelector() {
  const { data: houses, isLoading } = useQuery({
    queryKey: ["houses"],
    queryFn: fetchHouses,
  });
  const selectHouse = useBookingStore((s) => s.selectHouse);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface-2 rounded-2xl p-6 border border-stroke animate-pulse h-64" />
        ))}
      </div>
    );
  }

  if (!houses?.length) {
    return (
      <div className="text-center py-16">
        <span className="material-symbols-outlined text-5xl text-base-content/30 mb-4">cottage</span>
        <p className="text-base-content/60">Сейчас нет доступных домов для бронирования.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {houses.map((house) => (
        <button
          key={house.id}
          onClick={() => selectHouse(house)}
          className="text-left bg-surface-2 rounded-2xl p-6 border border-stroke hover:border-primary/50 transition-all cursor-pointer"
        >
          {house.hero_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={house.hero_image_url} alt={house.title} className="w-full h-48 object-cover rounded-xl mb-4" />
          ) : (
            <div className="w-full h-48 bg-surface rounded-xl mb-4 flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-base-content/30">cottage</span>
            </div>
          )}
          <h3 className="text-lg font-semibold text-white mb-2">{house.title}</h3>
          {house.summary && <p className="text-base-content/70 text-sm mb-3 line-clamp-2">{house.summary}</p>}
          <div className="flex items-center gap-4 text-sm text-base-content/60 mb-3">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-base">group</span>
              до {house.capacity} гостей
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-base">bed</span>
              {house.bedrooms} спален
            </span>
          </div>
          <div className="text-primary font-semibold">
            {house.base_price.toLocaleString("ru-RU")} ₽
            <span className="text-base-content/60 font-normal"> / ночь</span>
          </div>
        </button>
      ))}
    </div>
  );
}
