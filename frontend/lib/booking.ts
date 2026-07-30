/**
 * Booking API client — proxies Django Ninja endpoints.
 */

import { api } from "./api";

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

function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : "";
}

export async function fetchHouses(): Promise<House[]> {
  try {
    return await api.get<House[]>("/api/booking/houses/");
  } catch {
    return [];
  }
}

export async function fetchAvailability(
  houseId: number,
  checkIn?: string,
  checkOut?: string
): Promise<Availability> {
  const params = new URLSearchParams({ house: String(houseId) });
  if (checkIn) params.set("check_in", checkIn);
  if (checkOut) params.set("check_out", checkOut);

  try {
    return await api.get<Availability>(
      `/api/booking/availability/?${params}`
    );
  } catch {
    return { available: true, booked_dates: [] };
  }
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

  try {
    return await api.get<BookingQuote>(`/api/booking/quote/?${params}`);
  } catch {
    return null;
  }
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
  try {
    return await api.post<{ id: number }>(
      "/api/booking/submit/",
      data,
      { credentials: "include", headers: { "X-CSRFToken": getCsrfToken() } }
    );
  } catch (e) {
    return { error: (e as Error).message || "Ошибка бронирования" };
  }
}
