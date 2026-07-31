'use client'

import { useState } from 'react'

type Props = {
  eventId: string | number
  eventSlug: string
}

/**
 * Carpool section — three forms:
 *  1. Become a driver (POST /api/event-drivers — TODO endpoint)
 *  2. Find a ride (POST /api/carpool-requests — TODO endpoint)
 *  3. Join a shared taxi (POST /api/taxi-pools — TODO endpoint)
 *
 * For now the forms are UI-only and use fetch with placeholder paths.
 * The shapes match the Phase 4 endpoints; actual driver/passenger/taxi
 * endpoints will be added in a follow-up.
 */
export function CarpoolSection({ eventId, eventSlug }: Props) {
  return (
    <section className="space-y-6">
      <div className="glass-card p-6">
        <h3 className="text-xl font-serif font-bold mb-2">
          <span className="material-symbols-outlined align-middle mr-2">
            directions_car
          </span>
          Подвезу
        </h3>
        <p className="text-sm text-base-content/60 mb-4">
          Готовы взять пассажиров? Заполните форму — с вами свяжутся.
        </p>
        <FormDriver eventSlug={eventSlug} />
      </div>

      <div className="glass-card p-6">
        <h3 className="text-xl font-serif font-bold mb-2">
          <span className="material-symbols-outlined align-middle mr-2">
            search
          </span>
          Ищу попутку
        </h3>
        <p className="text-sm text-base-content/60 mb-4">
          Не можете быть водителем? Оставьте заявку — кто-нибудь из водителей
          вас подвезёт.
        </p>
        <FormCarpoolRequest eventSlug={eventSlug} />
      </div>

      <div className="glass-card p-6">
        <h3 className="text-xl font-serif font-bold mb-2">
          <span className="material-symbols-outlined align-middle mr-2">
            local_taxi
          </span>
          Заказать такси
        </h3>
        <p className="text-sm text-base-content/60 mb-4">
          Скооперируйтесь с другими участниками, чтобы заказать совместное
          такси.
        </p>
        <FormTaxiPool eventSlug={eventSlug} />
      </div>
    </section>
  )
}

function useSimpleForm(path: string) {
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const form = e.target as HTMLFormElement
      const body = Object.fromEntries(new FormData(form).entries())
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'submit_failed')
        return
      }
      setDone(true)
    } catch {
      setError('network_error')
    } finally {
      setSubmitting(false)
    }
  }
  return { submit, submitting, done, error }
}

function FormDriver({ eventSlug }: { eventSlug: string }) {
  const { submit, submitting, done, error } = useSimpleForm(
    '/api/event-drivers',
  )
  if (done) {
    return (
      <p className="text-sm text-success">
        <span className="material-symbols-outlined align-middle">
          check_circle
        </span>{' '}
        Спасибо! Вы записаны как водитель.
      </p>
    )
  }
  return (
    <form onSubmit={submit} className="grid gap-3">
      <input type="hidden" name="event" value={eventSlug} />
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          name="name"
          required
          maxLength={100}
          placeholder="Имя"
          className="input input-bordered"
        />
        <input
          name="telegram"
          placeholder="Telegram"
          maxLength={100}
          className="input input-bordered"
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          name="carModel"
          placeholder="Модель авто"
          maxLength={100}
          className="input input-bordered"
        />
        <input
          name="seatsTotal"
          type="number"
          min={1}
          max={50}
          defaultValue={4}
          placeholder="Мест"
          className="input input-bordered"
        />
      </div>
      <input
        name="departureLocation"
        required
        placeholder="Откуда"
        maxLength={200}
        className="input input-bordered"
      />
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}
      <button
        type="submit"
        className="btn btn-primary"
        disabled={submitting}
      >
        {submitting ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          'Готов подвезти'
        )}
      </button>
    </form>
  )
}

function FormCarpoolRequest({ eventSlug }: { eventSlug: string }) {
  const { submit, submitting, done, error } = useSimpleForm(
    '/api/carpool-requests',
  )
  if (done) {
    return (
      <p className="text-sm text-success">
        <span className="material-symbols-outlined align-middle">
          check_circle
        </span>{' '}
        Заявка создана.
      </p>
    )
  }
  return (
    <form onSubmit={submit} className="grid gap-3">
      <input type="hidden" name="event" value={eventSlug} />
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          name="name"
          required
          maxLength={100}
          placeholder="Имя"
          className="input input-bordered"
        />
        <input
          name="telegram"
          placeholder="Telegram"
          maxLength={100}
          className="input input-bordered"
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          name="pickupLocation"
          placeholder="Где забрать"
          maxLength={200}
          className="input input-bordered"
        />
        <input
          name="seatsNeeded"
          type="number"
          min={1}
          max={50}
          defaultValue={1}
          placeholder="Мест"
          className="input input-bordered"
        />
      </div>
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}
      <button
        type="submit"
        className="btn btn-primary"
        disabled={submitting}
      >
        {submitting ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          'Ищу попутку'
        )}
      </button>
    </form>
  )
}

function FormTaxiPool({ eventSlug }: { eventSlug: string }) {
  const { submit, submitting, done, error } = useSimpleForm('/api/taxi-pools')
  if (done) {
    return (
      <p className="text-sm text-success">
        <span className="material-symbols-outlined align-middle">
          check_circle
        </span>{' '}
        Заявка на такси создана.
      </p>
    )
  }
  return (
    <form onSubmit={submit} className="grid gap-3">
      <input type="hidden" name="event" value={eventSlug} />
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          name="organizer"
          required
          maxLength={100}
          placeholder="Ваше имя"
          className="input input-bordered"
        />
        <input
          name="telegram"
          placeholder="Telegram"
          maxLength={100}
          className="input input-bordered"
        />
      </div>
      <input
        name="pickupLocation"
        required
        placeholder="Где забрать"
        maxLength={200}
        className="input input-bordered"
      />
      <input
        name="maxPassengers"
        type="number"
        min={1}
        max={50}
        defaultValue={4}
        placeholder="Сколько мест"
        className="input input-bordered"
      />
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}
      <button
        type="submit"
        className="btn btn-primary"
        disabled={submitting}
      >
        {submitting ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          'Заказать такси'
        )}
      </button>
    </form>
  )
}
