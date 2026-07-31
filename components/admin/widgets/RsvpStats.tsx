import type { AdminViewServerProps } from 'payload'

/**
 * Dashboard widget — RSVP stats (going / maybe / not_going) for upcoming events.
 */
export default function RsvpStats({ payload }: AdminViewServerProps) {
  void payload
  return <div className="dashboard-widget">RsvpStats (TODO)</div>
}
