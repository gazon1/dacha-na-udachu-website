'use client'

import { useEffect, useMemo, useState } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import { ru } from 'date-fns/locale'
import { differenceInCalendarDays, parseISO, format } from 'date-fns'
import 'react-day-picker/style.css'

type Props = {
  houseSlug: string
  /** Initial range (e.g. when re-opening the wizard or restoring from URL). */
  initialRange?: { from: string; to: string }
  /** Called whenever the user finishes a selection (i.e. has both ends). */
  onChange: (range: { from: string; to: string } | null) => void
}

type BlockedRange = { from: string; to: string }

function isoToDate(s: string): Date {
  return parseISO(s)
}

function dateToIso(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

function toRange(value: DateRange | undefined): { from: string; to: string } | null {
  if (!value?.from || !value?.to) return null
  return { from: dateToIso(value.from), to: dateToIso(value.to) }
}

/**
 * Two-month calendar range picker used on /booking.
 *
 * Behaviour:
 *  - Fetches blocked ranges from /api/bookings/blocked?house=...
 *  - Disables past dates and any date inside a blocked range
 *  - Range selection: click start, then click end. The range preview is
 *    highlighted on hover so the user always sees what they're picking.
 *  - Calls `onChange` only once the user has picked both ends.
 *  - Russian locale + daisyUI-aligned theme via --rdp-* CSS variables
 *    (see globals.css).
 */
export function DateRangePicker({ houseSlug, initialRange, onChange }: Props) {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const [blocked, setBlocked] = useState<BlockedRange[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<DateRange | undefined>(() => {
    if (initialRange?.from && initialRange?.to) {
      return { from: isoToDate(initialRange.from), to: isoToDate(initialRange.to) }
    }
    return undefined
  })

  // Fetch blocked ranges whenever the house changes.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/bookings/blocked?house=${encodeURIComponent(houseSlug)}`)
      .then((r) => r.json())
      .then((data: { ranges?: BlockedRange[] }) => {
        if (cancelled) return
        setBlocked(data.ranges ?? [])
      })
      .catch(() => {
        if (!cancelled) setBlocked([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [houseSlug])

  // Disable past dates and any date inside a blocked range.
  // DayPicker's `disabled` prop accepts a matcher array — we use both
  // `before:today` and an array of DateRange matchers for the bookings.
  const disabled = useMemo(() => {
    const todayStart = new Date(today)
    return [
      { before: todayStart },
      ...blocked.map((r) => ({
        from: isoToDate(r.from),
        to: isoToDate(r.to),
      })),
    ]
  }, [blocked, today])

  const nights = useMemo(() => {
    if (!selected?.from || !selected?.to) return 0
    return Math.max(1, differenceInCalendarDays(selected.to, selected.from))
  }, [selected])

  const handleSelect = (range: DateRange | undefined) => {
    setSelected(range)
    onChange(toRange(range))
  }

  return (
    <div className="rdp-shell">
      {loading && (
        <p className="text-sm text-base-content/60 mb-2 flex items-center gap-2">
          <span className="loading loading-spinner loading-xs" />
          Загружаем занятые даты…
        </p>
      )}

      <DayPicker
        mode="range"
        numberOfMonths={2}
        selected={selected}
        onSelect={handleSelect}
        disabled={disabled}
        locale={ru}
        showOutsideDays
        fixedWeeks
        startMonth={today}
        endMonth={(() => {
          // Allow booking up to 18 months ahead — generous, prevents
          // unbounded calendars and keeps the bundle small.
          const d = new Date(today)
          d.setMonth(d.getMonth() + 18)
          return d
        })()}
      />

      <div className="mt-4 text-sm">
        {!selected?.from && (
          <p className="text-base-content/60">Выберите дату заезда</p>
        )}
        {selected?.from && !selected?.to && (
          <p className="text-base-content/60">Теперь выберите дату выезда</p>
        )}
        {selected?.from && selected?.to && (
          <p className="flex flex-wrap gap-x-4 gap-y-1 items-center">
            <span>
              <span className="text-base-content/60">Заезд:</span>{' '}
              <span className="font-medium">
                {format(selected.from, 'd MMMM yyyy', { locale: ru })}
              </span>
            </span>
            <span>
              <span className="text-base-content/60">Выезд:</span>{' '}
              <span className="font-medium">
                {format(selected.to, 'd MMMM yyyy', { locale: ru })}
              </span>
            </span>
          </p>
        )}
      </div>
    </div>
  )
}
