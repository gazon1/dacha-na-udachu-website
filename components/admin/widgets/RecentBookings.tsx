import type { AdminViewServerProps } from 'payload'

/**
 * Dashboard widget — shows recent bookings.
 * Renders server-side on the dashboard page.
 */
export function RecentBookings({ payload }: AdminViewServerProps) {
  // The shape param includes payload context — we have full read access here.
  void payload
  return <div className="dashboard-widget">RecentBookings (TODO)</div>
}
