import type { AdminViewServerProps } from 'payload'

/**
 * Dashboard widget — quick action buttons (create new House/Event/News).
 */
export function QuickActions({ payload }: AdminViewServerProps) {
  void payload
  return <div className="dashboard-widget">QuickActions (TODO)</div>
}
