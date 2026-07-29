/**
 * Booking API client — proxies Django Ninja endpoints.
 */

export interface House {
  id: number;
  title: string;
  summary: string;
  capacity: number;
  bedrooms: number;
  address: string;
  base_price: number;
  booking_enabled: boolean;
  hero_image_url: string | null;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface BookingQuote {
  nights: number;
  price_per_night: number;
  extras: Record<string, number>;
  extras_total: number;
  subtotal: number;
  total: number;
}

export interface Availability {
  available: boolean;
  booked_dates: DateRange[];
}

export async function fetchHouses(): Promise<House[]> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/booking/houses/`
  );
  if (!res.ok) return [];
  return res.json();
}

export async function fetchAvailability(
  houseId: number,
  checkIn?: string,
  checkOut?: string
): Promise<Availability> {
  const params = new URLSearchParams({ house: String(houseId) });
  if (checkIn) params.set("check_in", checkIn);
  if (checkOut) params.set("check_out", checkOut);

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/booking/availability/?${params}`
  );
  if (!res.ok) return { available: true, booked_dates: [] };
  return res.json();
}

export async function fetchQuote(
  houseId: number,
  checkIn: string,
  checkOut: string,
  options?: Record<string, boolean>
): Promise<BookingQuote | null> {
  const params = new URLSearchParams({
    house: String(houseId),
    check_in: checkIn,
    check_out: checkOut,
  });
  if (options) {
    Object.entries(options).forEach(([k, v]) => {
      if (v) params.set(k, "true");
    });
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/booking/quote/?${params}`
  );
  if (!res.ok) return null;
  return res.json();
}

export async function submitBooking(data: {
  house: number;
  check_in: string;
  check_out: string;
  name: string;
  phone: string;
  telegram?: string;
  guest_num: number;
  options?: Record<string, boolean>;
}): Promise<{ id?: number; error?: string }> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/booking/submit/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCsrfToken(),
      },
      credentials: "include",
      body: JSON.stringify(data),
    }
  );

  if (res.ok) {
    return (await res.json()) as { id: number };
  }
  const err = await res.json().catch(() => ({ error: "Ошибка" }));
  return { error: err.error ?? "Ошибка бронирования" };
}

function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : "";
}
