/**
 * Events API client — proxies Django Ninja /api/events/ endpoints.
 */

import { api } from "./api";

export interface Event {
  id: number;
  title: string;
  slug: string;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  venue: string;
  venue_notes: string;
  map_link: string;
  summary: string;
  show_countdown: boolean;
  expected_temperature: string;
  weather_note: string;
  special_tag: string;
  rsvp_capacity: number | null;
  going_count: number;
  maybe_count: number;
  total_attending: number;
  url: string | null;
}

export interface Attendee {
  id: number;
  name: string;
  status: string;
  guests_count: number;
}

export interface Driver {
  id: number;
  name: string;
  telegram: string | null;
  phone: string | null;
  car_model: string;
  car_type: string;
  seats_total: number;
  seats_taken: number;
  seats_available: number;
  departure_date: string;
  departure_time: string | null;
  departure_location: string;
  return_date: string;
  return_time: string | null;
  notes: string;
  contact_preference: string;
  is_cancelled: boolean;
  is_verified: boolean;
  cancel_token: string;
  created_at: string;
}

export interface CarpoolRequest {
  id: number;
  name: string;
  telegram: string | null;
  phone: string | null;
  pickup_location: string;
  seats_needed: number;
  can_share_gas: boolean;
  flexible_time: boolean;
  notes: string;
  is_active: boolean;
  created_at: string;
}

export interface TaxiPool {
  id: number;
  organizer: string;
  telegram: string | null;
  pickup_location: string;
  departure_date: string;
  departure_time: string;
  max_passengers: number;
  passengers_count: number;
  spots_left: number;
  estimated_price: number;
  service: string;
  notes: string;
  is_active: boolean;
  created_at: string;
}

export interface TaxiPassenger {
  id: number;
  name: string;
  telegram: string | null;
  phone: string | null;
  seats: number;
  notes: string;
  is_active: boolean;
  created_at: string;
}

export interface CarpoolSection {
  drivers: Driver[];
  carpool_requests: CarpoolRequest[];
  taxi_pools: TaxiPool[];
}

export interface RSVPState {
  voted: boolean;
  id?: number;
  name?: string;
  status?: string;
  secret_key?: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : "";
}

/** Auth-aware fetch for mutations — sends CSRF token and session cookie. */
async function apiMut<T>(
  path: string,
  data?: unknown
): Promise<T> {
  return api.post<T>(path, data, {
    credentials: "include",
    headers: { "X-CSRFToken": getCsrfToken() },
  });
}

/** Auth-aware fetch for reads — sends session cookie. */
async function apiAuth<T>(path: string): Promise<T> {
  return api.get<T>(path, { credentials: "include" });
}

// ─── Events listing ────────────────────────────────────────────────────────────

export async function fetchEvents(upcoming = true): Promise<Event[]> {
  try {
    return await api.get<Event[]>(
      `/api/events/?upcoming=${upcoming}`,
      {
        // 5 min TTL safety net; primary invalidation via the webhook from
        // /workspace/backend/dacha/signals.py → /api/revalidate.
        next: { revalidate: 300, tags: ["wagtail:events"] },
      }
    );
  } catch {
    return [];
  }
}

export async function fetchEvent(id: number): Promise<Event | null> {
  try {
    return await api.get<Event>(`/api/events/${id}/`, {
      // Tag both the broad events tag and the per-event tag so revalidation
      // can target one event without nuking the whole list.
      next: { revalidate: 300, tags: ["wagtail:events", `wagtail:event:${id}`] },
    });
  } catch {
    return null;
  }
}

// ─── RSVP ─────────────────────────────────────────────────────────────────────

export async function fetchMyRSVP(eventId: number): Promise<RSVPState> {
  try {
    return await apiAuth<RSVPState>(`/api/events/${eventId}/rsvp/me`);
  } catch {
    return { voted: false };
  }
}

export async function submitRSVP(
  eventId: number,
  data: {
    name: string;
    status: string;
    guests_count: number;
    secret_key?: string;
  }
): Promise<{ id?: number; name?: string; status?: string; error?: string }> {
  try {
    return await apiMut<{
      id: number;
      name?: string;
      status?: string;
    }>(`/api/events/${eventId}/rsvp/`, data);
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function cancelRSVP(
  eventId: number
): Promise<{ error?: string }> {
  try {
    await apiMut(`/api/events/${eventId}/rsvp/cancel/`);
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function claimRSVP(
  eventId: number,
  secretKey: string
): Promise<{ id?: number; name?: string; status?: string; error?: string }> {
  try {
    return await apiMut<{ id: number; name?: string; status?: string }>(
      `/api/events/${eventId}/rsvp/claim/`,
      { secret_key: secretKey }
    );
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ─── Attendees ───────────────────────────────────────────────────────────────

export async function fetchAttendees(eventId: number): Promise<Attendee[]> {
  try {
    return await apiAuth<Attendee[]>(`/api/events/${eventId}/attendees/`);
  } catch {
    return [];
  }
}

// ─── Carpool ─────────────────────────────────────────────────────────────────

export async function fetchCarpoolSection(
  eventId: number
): Promise<CarpoolSection> {
  try {
    return await apiAuth<CarpoolSection>(`/api/events/${eventId}/carpool/`);
  } catch {
    return { drivers: [], carpool_requests: [], taxi_pools: [] };
  }
}

export async function addDriver(
  eventId: number,
  data: Omit<
    Driver,
    | "id"
    | "seats_taken"
    | "seats_available"
    | "is_cancelled"
    | "is_verified"
    | "cancel_token"
    | "created_at"
  >
): Promise<Driver | { error: string }> {
  try {
    return await apiMut<Driver>(`/api/events/${eventId}/carpool/drivers/`, data);
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function addCarpoolRequest(
  eventId: number,
  data: Omit<CarpoolRequest, "id" | "is_active" | "created_at">
): Promise<CarpoolRequest | { error: string }> {
  try {
    return await apiMut<CarpoolRequest>(
      `/api/events/${eventId}/carpool/requests/`,
      data
    );
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function addTaxiPool(
  eventId: number,
  data: Omit<
    TaxiPool,
    | "id"
    | "passengers_count"
    | "spots_left"
    | "is_active"
    | "created_at"
  >
): Promise<TaxiPool | { error: string }> {
  try {
    return await apiMut<TaxiPool>(
      `/api/events/${eventId}/carpool/taxi-pools/`,
      data
    );
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function joinRide(
  eventId: number,
  driverId: number,
  data: {
    name: string;
    phone: string;
    telegram?: string;
    pickup_location: string;
    seats: number;
    notes?: string;
  }
): Promise<TaxiPassenger | { error: string }> {
  try {
    return await apiMut<TaxiPassenger>(
      `/api/events/${eventId}/drivers/${driverId}/join`,
      data
    );
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function joinTaxi(
  eventId: number,
  poolId: number,
  data: {
    name: string;
    phone: string;
    telegram?: string;
    seats: number;
    notes?: string;
  }
): Promise<TaxiPassenger | { error: string }> {
  try {
    return await apiMut<TaxiPassenger>(
      `/api/events/${eventId}/taxi-pools/${poolId}/join`,
      data
    );
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function cancelDriver(
  eventId: number,
  driverId: number,
  token = ""
): Promise<Driver | { error: string }> {
  try {
    return await apiMut<Driver>(
      `/api/events/${eventId}/drivers/${driverId}/cancel${token ? `?token=${token}` : ""}`
    );
  } catch (e) {
    return { error: (e as Error).message };
  }
}
