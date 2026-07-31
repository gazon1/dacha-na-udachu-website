'use client'

import { useState } from 'react'

type Props = {
  eventId: string | number
  eventSlug: string
}

type TabKey = 'driver' | 'request' | 'taxi'

const TABS: { key: TabKey; icon: string; label: string }[] = [
  { key: 'driver', icon: 'directions_car', label: 'Подвезу' },
  { key: 'request', icon: 'search', label: 'Ищу попутку' },
  { key: 'taxi', icon: 'local_taxi', label: 'Такси' },
]

/**
 * Carpool section — three forms behind a tab switcher (saves vertical space).
 *
 *  - driver   → POST /api/event-drivers
 *  - request  → POST /api/carpool-requests
 *  - taxi     → POST /api/taxi-pools
 *
 * The tabs are plain `<button>`s with `aria-selected` semantics so the
 * renderer stays usable without JS. The active panel is rendered via a
 * `hidden` attribute on the others, which keeps the form state intact when
 * the user switches back and forth.
 */
export function CarpoolSection({ eventId, eventSlug }: Props) {
  const [active, setActive] = useState<TabKey>('driver')

  return (
    <div className="glass-card p-6">
      <div role="tablist" aria-label="Способ добраться" className="tabs tabs-lifted mb-6">
        {TABS.map((t) => {
          const selected = active === t.key
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`carpool-panel-${t.key}`}
              id={`carpool-tab-${t.key}`}
              onClick={() => setActive(t.key)}
              className={`tab gap-2 ${selected ? 'tab-active' : ''}`}
            >
              <span className="material-symbols-outlined text-base">
                {t.icon}
              </span>
              {t.label}
            </button>
          )
        })}
      </div>

      {TABS.map((t) => (
        <div
          key={t.key}
          id={`carpool-panel-${t.key}`}
          role="tabpanel"
          aria-labelledby={`carpool-tab-${t.key}`}
          hidden={active !== t.key}
        >
          <FormFor tab={t.key} eventSlug={eventSlug} />
        </div>
      ))}
    </div>
  )
}

function FormFor({ tab, eventSlug }: { tab: TabKey; eventSlug: string }) {
  if (tab === 'driver') return <FormDriver eventSlug={eventSlug} />
  if (tab === 'request') return <FormCarpoolRequest eventSlug={eventSlug} />
  return <FormTaxiPool eventSlug={eventSlug} />
}

// ---------- shared form plumbing ----------

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

// ---------- three forms ----------

function FormDriver({ eventSlug }: { eventSlug: string }) {
  const { submit, submitting, done, error } = useSimpleForm('/api/event-drivers')
  if (done) {
    return (
      <p className="text-sm text-success">
        <span className="material-symbols-outlined align-middle">check_circle</span>{' '}
        Спасибо! Вы записаны как водитель.
      </p>
    )
  }
  return (
    <form onSubmit={submit} className="grid gap-3">
      <p className="text-sm text-base-content/60 mb-1">
        Готовы взять пассажиров? Заполните форму — с вами свяжутся.
      </p>
      <input type="hidden" name="event" value={eventSlug} />
      <div className="grid sm:grid-cols-2 gap-3">
        <input name="name" required maxLength={100} placeholder="Имя" className="input input-bordered" />
        <input name="telegram" placeholder="Telegram" maxLength={100} className="input input-bordered" />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <input name="carModel" placeholder="Модель авто" maxLength={100} className="input input-bordered" />
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
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? <span className="loading loading-spinner loading-sm" /> : 'Готов подвезти'}
      </button>
    </form>
  )
}

function FormCarpoolRequest({ eventSlug }: { eventSlug: string }) {
  const { submit, submitting, done, error } = useSimpleForm('/api/carpool-requests')
  if (done) {
    return (
      <p className="text-sm text-success">
        <span className="material-symbols-outlined align-middle">check_circle</span>{' '}
        Заявка создана.
      </p>
    )
  }
  return (
    <form onSubmit={submit} className="grid gap-3">
      <p className="text-sm text-base-content/60 mb-1">
        Не можете быть водителем? Оставьте заявку — кто-нибудь из водителей вас подвезёт.
      </p>
      <input type="hidden" name="event" value={eventSlug} />
      <div className="grid sm:grid-cols-2 gap-3">
        <input name="name" required maxLength={100} placeholder="Имя" className="input input-bordered" />
        <input name="telegram" placeholder="Telegram" maxLength={100} className="input input-bordered" />
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
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? <span className="loading loading-spinner loading-sm" /> : 'Ищу попутку'}
      </button>
    </form>
  )
}

function FormTaxiPool({ eventSlug }: { eventSlug: string }) {
  const { submit, submitting, done, error } = useSimpleForm('/api/taxi-pools')
  if (done) {
    return (
      <p className="text-sm text-success">
        <span className="material-symbols-outlined align-middle">check_circle</span>{' '}
        Заявка на такси создана.
      </p>
    )
  }
  return (
    <form onSubmit={submit} className="grid gap-3">
      <p className="text-sm text-base-content/60 mb-1">
        Скооперируйтесь с другими участниками, чтобы заказать совместное такси.
      </p>
      <input type="hidden" name="event" value={eventSlug} />
      <div className="grid sm:grid-cols-2 gap-3">
        <input name="organizer" required maxLength={100} placeholder="Ваше имя" className="input input-bordered" />
        <input name="telegram" placeholder="Telegram" maxLength={100} className="input input-bordered" />
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
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? <span className="loading loading-spinner loading-sm" /> : 'Заказать такси'}
      </button>
    </form>
  )
}
