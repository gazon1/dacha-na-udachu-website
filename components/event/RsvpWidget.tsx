'use client'

import { useEffect, useState } from 'react'

type Status = 'going' | 'maybe' | 'not_going' | 'waiting'

const STATUS_LABEL: Record<Status, string> = {
  going: 'Идёте',
  maybe: 'Возможно',
  not_going: 'Не идёте',
  waiting: 'Лист ожидания',
}

const STATUS_BADGE: Record<Status, string> = {
  going: 'badge-success',
  maybe: 'badge-warning',
  not_going: 'badge-ghost',
  waiting: 'badge-info',
}

type ExistingRsvp = {
  id: string | number
  name: string
  status: Status
  guestsCount: number
  secretKey: string
}

type Props = {
  eventId: string | number
  eventSlug: string
}

function storageKey(eventId: string | number): string {
  return `rsvp-${eventId}`
}

/**
 * RSVP widget with three states:
 *   1. No vote yet     → show form directly
 *   2. Has vote        → show summary card + "Change vote" button
 *   3. Editing         → show form pre-filled with current values
 *
 * Persistence: the server returns a `secretKey` on submit, which we store
 * in localStorage. On mount we read it and fetch the existing RSVP via
 * /api/event-rsvps/by-secret/:secretKey. Updates go through the same
 * /cancel/:secretKey endpoint (status + name + guestsCount).
 */
export function RsvpWidget({ eventId, eventSlug }: Props) {
  const eventIdStr = String(eventId)
  const [existing, setExisting] = useState<ExistingRsvp | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // On mount: try to restore previous RSVP from localStorage.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const key = storageKey(eventIdStr)
    const secretKey = localStorage.getItem(key)
    if (!secretKey) {
      setLoading(false)
      return
    }
    let cancelled = false
    fetch(`/api/event-rsvps/by-secret/${encodeURIComponent(secretKey)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((rsvp: ExistingRsvp | null) => {
        if (cancelled) return
        if (rsvp) {
          setExisting({ ...rsvp, secretKey })
          setEditing(false)
        } else {
          // Stale key — clear it.
          localStorage.removeItem(key)
        }
      })
      .catch(() => {
        if (!cancelled) localStorage.removeItem(key)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [eventIdStr])

  const handleSuccess = (rsvp: ExistingRsvp) => {
    localStorage.setItem(storageKey(eventIdStr), rsvp.secretKey)
    setExisting(rsvp)
    setEditing(false)
    setError(null)
  }

  if (loading) {
    return (
      <div className="glass-card p-6">
        <p className="text-sm text-base-content/60">Загружаем…</p>
      </div>
    )
  }

  // ---- State 2: voted → summary card ----
  if (existing && !editing) {
    return (
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-xl font-serif font-bold">Ваш ответ</h3>
        <div className="flex items-center gap-2">
          <span className={`badge ${STATUS_BADGE[existing.status]}`}>
            {STATUS_LABEL[existing.status]}
          </span>
          <span className="text-base-content/80">{existing.name}</span>
          {existing.guestsCount > 1 && (
            <span className="text-sm text-base-content/60">
              + {existing.guestsCount - 1} {pluralGuests(existing.guestsCount - 1)}
            </span>
          )}
        </div>
        <p className="text-sm text-base-content/60">
          Планы изменились? Можно обновить голос.
        </p>
        <button
          type="button"
          className="btn btn-outline btn-sm w-full"
          onClick={() => setEditing(true)}
        >
          <span className="material-symbols-outlined text-base">edit</span>
          Изменить голос
        </button>
      </div>
    )
  }

  // ---- State 1 + 3: form (initial OR editing) ----
  return (
    <RsvpForm
      eventId={eventId}
      eventSlug={eventSlug}
      existing={existing}
      onSuccess={handleSuccess}
      onCancel={existing ? () => setEditing(false) : undefined}
      error={error}
      setError={setError}
    />
  )
}

// ---------- form ----------

function RsvpForm({
  eventId,
  eventSlug,
  existing,
  onSuccess,
  onCancel,
  error,
  setError,
}: {
  eventId: string | number
  eventSlug: string
  existing: ExistingRsvp | null
  onSuccess: (rsvp: ExistingRsvp) => void
  onCancel?: () => void
  error: string | null
  setError: (e: string | null) => void
}) {
  const [name, setName] = useState(existing?.name ?? '')
  const [guests, setGuests] = useState(existing?.guestsCount ?? 1)
  const [status, setStatus] = useState<Status>(existing?.status ?? 'going')
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const isUpdate = existing != null
      const url = isUpdate
        ? `/api/event-rsvps/cancel/${encodeURIComponent(existing!.secretKey)}`
        : '/api/event-rsvps/submit'
      const body = isUpdate
        ? { status, guestsCount: guests, name }
        : { event: eventSlug, name, guestsCount: guests, status }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'submit_failed')
        return
      }
      const data = await res.json()
      const secretKey = isUpdate
        ? existing!.secretKey
        : (data.secretKey as string)
      onSuccess({
        id: data.id ?? existing!.id,
        secretKey,
        name,
        guestsCount: guests,
        status,
      })
    } catch {
      setError('network_error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="glass-card p-6 space-y-4">
      <h3 className="text-xl font-serif font-bold">
        {existing ? 'Изменить голос' : 'Идёте на событие?'}
      </h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="form-control">
          <span className="label-text">Имя</span>
          <input
            type="text"
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input input-bordered"
          />
        </label>
        <label className="form-control">
          <span className="label-text">Гостей</span>
          <input
            type="number"
            min={1}
            max={50}
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="input input-bordered"
          />
        </label>
      </div>
      <div className="join">
        {(['going', 'maybe', 'not_going'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`btn join-item flex-1 ${
              status === s ? 'btn-primary' : 'btn-ghost'
            }`}
          >
            {s === 'going' ? 'Иду' : s === 'maybe' ? 'Возможно' : 'Не иду'}
          </button>
        ))}
      </div>
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        className="absolute opacity-0 -left-[9999px] w-0 h-0"
        aria-hidden="true"
        name="website"
      />
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}
      <div className="flex gap-2">
        {existing && onCancel && (
          <button
            type="button"
            className="btn btn-ghost flex-1"
            onClick={() => {
              setError(null)
              onCancel()
            }}
          >
            Отмена
          </button>
        )}
        <button
          type="submit"
          className="btn btn-primary flex-1"
          disabled={submitting || !name}
        >
          {submitting ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            'Подтвердить'
          )}
        </button>
      </div>
    </form>
  )
}

function pluralGuests(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return 'гостей'
  if (mod10 === 1) return 'гость'
  if (mod10 >= 2 && mod10 <= 4) return 'гостя'
  return 'гостей'
}
