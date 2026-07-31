export type Attendee = {
  id: string | number
  name: string
  status: 'going' | 'maybe' | 'not_going' | 'waiting'
  guestsCount: number
}

type Props = {
  attendees: Attendee[]
}

const STATUS_LABEL: Record<Attendee['status'], string> = {
  going: 'Идёт',
  maybe: 'Возможно',
  not_going: 'Не идёт',
  waiting: 'Лист ожидания',
}

const STATUS_CLASS: Record<Attendee['status'], string> = {
  going: 'bg-primary/20 text-primary',
  maybe: 'bg-warning/20 text-warning',
  not_going: 'bg-white/10 text-white/60',
  waiting: 'bg-white/10 text-white/60',
}

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

function fmtAttendeeSummary(name: string, guestsCount: number): string {
  if (guestsCount > 1) return `${name} + ${guestsCount - 1} ${pluralGuests(guestsCount - 1)}`
  return name
}

function pluralGuests(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return 'гостей'
  if (mod10 === 1) return 'гость'
  if (mod10 >= 2 && mod10 <= 4) return 'гостя'
  return 'гостей'
}

/**
 * Renders the list of confirmed/maybe attendees for an event.
 * Server component — receives `attendees` from the page so it stays SSR-friendly
 * and benefits from ISR. Hides people with `not_going` (they didn't opt in).
 */
export function AttendeesList({ attendees }: Props) {
  const visible = attendees.filter((a) => a.status !== 'not_going')

  if (visible.length === 0) {
    return (
      <p className="text-base-content/40 text-sm text-center py-4">
        Пока никто не записался
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {visible.map((a) => (
        <li
          key={a.id}
          className="flex items-center justify-between py-2 border-b border-base-300/50 last:border-0"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-base-300 flex items-center justify-center text-xs font-bold text-primary">
              {initial(a.name)}
            </div>
            <span className="text-white text-sm">
              {fmtAttendeeSummary(a.name, a.guestsCount)}
            </span>
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CLASS[a.status]}`}
          >
            {STATUS_LABEL[a.status]}
          </span>
        </li>
      ))}
    </ul>
  )
}
