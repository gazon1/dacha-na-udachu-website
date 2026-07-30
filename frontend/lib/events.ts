/**
 * Events API client — proxies Django Ninja /api/events/ endpoints.
 */

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

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : "";
}

async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const isMutation = options?.method && options.method !== "GET";
  return fetch(`${BASE}${path}`, {
    ...options,
    credentials: "include", // session cookie sent automatically
    headers: {
      "Content-Type": "application/json",
      ...(isMutation ? { "X-CSRFToken": getCsrfToken() } : {}),
      ...(options?.headers ?? {}),
    },
  });
}

/** Extract error message from any Django Ninja response shape. */
async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    // Status(400, {error: "..."}) → serialized as {status_code: N, value: {...}}
    if (body?.value?.error) return body.value.error;
    // Plain {error: "..."}
    if (body?.error) return body.error;
    // Fallback: show status text
    return res.statusText || `Ошибка ${res.status}`;
  } catch {
    return res.statusText || `Ошибка ${res.status}`;
  }
}

// ── Events listing ─────────────────────────────────────────────────────────────

export async function fetchEvents(upcoming = true): Promise<Event[]> {
  const res = await fetch(`${BASE}/api/events/?upcoming=${upcoming}`, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchEvent(id: number): Promise<Event | null> {
  const res = await fetch(`${BASE}/api/events/${id}/`, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  return res.json();
}

// ── RSVP ───────────────────────────────────────────────────────────────────────

export async function fetchMyRSVP(eventId: number): Promise<RSVPState> {
  const res = await apiFetch(`/api/events/${eventId}/rsvp/me`);
  if (!res.ok) return { voted: false };
  return res.json();
}

export async function submitRSVP(eventId: number, data: {
  name: string;
  status: string;
  guests_count: number;
  secret_key?: string;
}): Promise<{ id?: number; name?: string; status?: string; error?: string }> {
  const res = await apiFetch(`/api/events/${eventId}/rsvp/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (res.ok) return res.json();
  return { error: await parseError(res) };
}

export async function cancelRSVP(eventId: number): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/events/${eventId}/rsvp/cancel/`, { method: "POST" });
  if (res.ok) return {};
  return { error: await parseError(res) };
}

export async function claimRSVP(eventId: number, secretKey: string): Promise<{
  id?: number;
  name?: string;
  status?: string;
  error?: string;
}> {
  const res = await apiFetch(`/api/events/${eventId}/rsvp/claim/`, {
    method: "POST",
    body: JSON.stringify({ secret_key: secretKey }),
  });
  if (res.ok) return res.json();
  return { error: await parseError(res) };
}

// ── Attendees ─────────────────────────────────────────────────────────────────

export async function fetchAttendees(eventId: number): Promise<Attendee[]> {
  const res = await apiFetch(`/api/events/${eventId}/attendees/`);
  if (!res.ok) return [];
  return res.json();
}

// ── Carpool ───────────────────────────────────────────────────────────────────

export async function fetchCarpoolSection(eventId: number): Promise<CarpoolSection> {
  const res = await apiFetch(`/api/events/${eventId}/carpool/`);
  if (!res.ok) return { drivers: [], carpool_requests: [], taxi_pools: [] };
  return res.json();
}

export async function addDriver(eventId: number, data: Omit<Driver, "id" | "seats_taken" | "seats_available" | "is_cancelled" | "is_verified" | "cancel_token" | "created_at">): Promise<Driver | { error: string }> {
  const res = await apiFetch(`/api/events/${eventId}/carpool/drivers/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (res.ok) return res.json();
  return { error: await parseError(res) };
}

export async function addCarpoolRequest(eventId: number, data: Omit<CarpoolRequest, "id" | "is_active" | "created_at">): Promise<CarpoolRequest | { error: string }> {
  const res = await apiFetch(`/api/events/${eventId}/carpool/requests/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (res.ok) return res.json();
  return { error: await parseError(res) };
}

export async function addTaxiPool(eventId: number, data: Omit<TaxiPool, "id" | "passengers_count" | "spots_left" | "is_active" | "created_at">): Promise<TaxiPool | { error: string }> {
  const res = await apiFetch(`/api/events/${eventId}/carpool/taxi-pools/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (res.ok) return res.json();
  return { error: await parseError(res) };
}

export async function joinRide(eventId: number, driverId: number, data: {
  name: string;
  phone: string;
  telegram?: string;
  pickup_location: string;
  seats: number;
  notes?: string;
}): Promise<TaxiPassenger | { error: string }> {
  const res = await apiFetch(`/api/events/${eventId}/drivers/${driverId}/join`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (res.ok) return res.json();
  return { error: await parseError(res) };
}

export async function joinTaxi(eventId: number, poolId: number, data: {
  name: string;
  phone: string;
  telegram?: string;
  seats: number;
  notes?: string;
}): Promise<TaxiPassenger | { error: string }> {
  const res = await apiFetch(`/api/events/${eventId}/taxi-pools/${poolId}/join`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (res.ok) return res.json();
  return { error: await parseError(res) };
}

export async function cancelDriver(eventId: number, driverId: number, token = ""): Promise<Driver | { error: string }> {
  const res = await apiFetch(`/api/events/${eventId}/drivers/${driverId}/cancel?token=${token}`, { method: "POST" });
  if (res.ok) return res.json();
  return { error: await parseError(res) };
}
