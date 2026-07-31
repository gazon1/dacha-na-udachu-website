'use client'

import { useState } from 'react'

type Props = {
  eventId: string | number
  eventSlug: string
}

/**
 * RSVP widget — name + guests + status, posts to /api/event-rsvps/submit.
 * On success, sets a cookie with the secretKey so the user can cancel later.
 */
export function RsvpWidget({ eventId, eventSlug }: Props) {
  const [name, setName] = useState('')
  const [guests, setGuests] = useState(1)
  const [status, setStatus] = useState<'going' | 'maybe' | 'not_going'>(
    'going',
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/event-rsvps/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          event: eventSlug || eventId,
          name,
          guestsCount: guests,
          status,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'submit_failed')
        return
      }
      setSuccess(true)
    } catch {
      setError('network_error')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="alert alert-success">
        <span className="material-symbols-outlined">check_circle</span>
        <div>
          <h3 className="font-semibold">Спасибо!</h3>
          <p className="text-sm">
            Мы записали ваш ответ. Если планы изменятся — вернитесь на эту
            страницу, и cookie сохранит ваш выбор.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="glass-card p-6 space-y-4">
      <h3 className="text-xl font-serif font-bold">Идёте на событие?</h3>
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
            {s === 'going'
              ? 'Иду'
              : s === 'maybe'
              ? 'Возможно'
              : 'Не иду'}
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
      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={submitting || !name}
      >
        {submitting ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          'Подтвердить'
        )}
      </button>
    </form>
  )
}
