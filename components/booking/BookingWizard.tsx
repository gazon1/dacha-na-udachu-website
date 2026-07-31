'use client'

import { useState, useCallback } from 'react'

type House = {
  id: string
  slug: string
  title: string
  basePrice: number
  capacity: number
}
type Extra = { slug: string; name: string; price: number }

type Step = 1 | 2 | 3 | 4

type Props = {
  houses: House[]
  extras: Extra[]
  preselectedHouseSlug?: string
}

/**
 * 3-step booking wizard (plus success screen).
 *
 *  1. Pick a house
 *  2. Pick dates (with live availability check)
 *  3. Pick guest details + extras (with honeypot)
 *  4. Success screen
 */
export function BookingWizard({ houses, extras, preselectedHouseSlug }: Props) {
  const initialHouse =
    houses.find((h) => h.slug === preselectedHouseSlug) ?? houses[0]
  const [step, setStep] = useState<Step>(initialHouse ? 1 : 0)
  const [house, setHouse] = useState<House | undefined>(initialHouse)
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [availability, setAvailability] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [telegram, setTelegram] = useState('')
  const [guestNum, setGuestNum] = useState(1)
  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({})
  const [website, setWebsite] = useState('') // honeypot
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successId, setSuccessId] = useState<string | null>(null)

  const checkAvailability = useCallback(async () => {
    if (!house || !checkIn || !checkOut) return
    setChecking(true)
    setAvailability(null)
    try {
      const params = new URLSearchParams({
        house: house.slug,
        checkIn,
        checkOut,
      })
      const res = await fetch(`/api/bookings/availability?${params}`)
      const data = await res.json()
      setAvailability(data.available === true)
    } catch {
      setAvailability(false)
    } finally {
      setChecking(false)
    }
  }, [house, checkIn, checkOut])

  const toggleExtra = (slug: string) => {
    setSelectedExtras((prev) => {
      const next = { ...prev }
      if (next[slug]) delete next[slug]
      else next[slug] = 1
      return next
    })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!house) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/bookings/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          house: house.slug,
          checkIn,
          checkOut,
          name,
          phone,
          telegram: telegram || undefined,
          guestNum,
          options: selectedExtras,
          website, // honeypot
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'submit_failed')
        return
      }
      setSuccessId(data.id)
      setStep(4)
    } catch {
      setError('network_error')
    } finally {
      setSubmitting(false)
    }
  }

  if (houses.length === 0) {
    return (
      <div className="alert alert-warning">
        <span className="material-symbols-outlined">info</span>
        <span>Нет доступных для бронирования домов.</span>
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Stepper */}
      <aside className="lg:col-span-1">
        <ul className="steps steps-vertical">
          <li
            className={`step ${step >= 1 ? 'step-primary' : ''}`}
            data-content="1"
          >
            Дом
          </li>
          <li
            className={`step ${step >= 2 ? 'step-primary' : ''}`}
            data-content="2"
          >
            Даты
          </li>
          <li
            className={`step ${step >= 3 ? 'step-primary' : ''}`}
            data-content="3"
          >
            Гости
          </li>
          <li
            className={`step ${step >= 4 ? 'step-primary' : ''}`}
            data-content="✓"
          >
            Готово
          </li>
        </ul>
        {house && (
          <div className="mt-6 glass-card p-4 text-sm">
            <p className="text-base-content/60">Выбрано:</p>
            <p className="font-medium">{house.title}</p>
            <p className="text-primary">
              от {house.basePrice.toLocaleString('ru-RU')} ₽/ночь
            </p>
          </div>
        )}
      </aside>

      {/* Body */}
      <section className="lg:col-span-2 glass-card p-6">
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-serif font-bold mb-4">
              Выберите дом
            </h2>
            <div className="grid gap-3">
              {houses.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => {
                    setHouse(h)
                    setStep(2)
                  }}
                  className={`text-left p-4 rounded-xl border transition-colors ${
                    house?.id === h.id
                      ? 'border-primary bg-primary/10'
                      : 'border-base-300 hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-medium">{h.title}</span>
                    <span className="text-sm text-primary">
                      от {h.basePrice.toLocaleString('ru-RU')} ₽/ночь
                    </span>
                  </div>
                  <p className="text-xs text-base-content/60">
                    до {h.capacity} гостей
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && house && (
          <div>
            <h2 className="text-2xl font-serif font-bold mb-4">Выберите даты</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="form-control">
                <span className="label-text">Заезд</span>
                <input
                  type="date"
                  className="input input-bordered"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  onBlur={checkAvailability}
                  required
                />
              </label>
              <label className="form-control">
                <span className="label-text">Выезд</span>
                <input
                  type="date"
                  className="input input-bordered"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  onBlur={checkAvailability}
                  required
                />
              </label>
            </div>
            {checking && (
              <p className="text-sm text-base-content/60 mt-3">
                <span className="loading loading-spinner loading-xs" /> Проверяем
                доступность…
              </p>
            )}
            {availability === true && (
              <p className="text-sm text-success mt-3 flex items-center gap-1">
                <span className="material-symbols-outlined">check_circle</span>
                Эти даты свободны
              </p>
            )}
            {availability === false && (
              <p className="text-sm text-error mt-3 flex items-center gap-1">
                <span className="material-symbols-outlined">error</span>
                Эти даты заняты — выберите другие
              </p>
            )}
            <div className="flex gap-2 justify-between mt-6">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setStep(1)}
              >
                Назад
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={
                  !checkIn ||
                  !checkOut ||
                  availability === false ||
                  checking
                }
                onClick={() => setStep(3)}
              >
                Дальше
              </button>
            </div>
          </div>
        )}

        {step === 3 && house && (
          <form onSubmit={submit}>
            <h2 className="text-2xl font-serif font-bold mb-4">
              Гости и услуги
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="form-control">
                <span className="label-text">Имя *</span>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={255}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input input-bordered"
                />
              </label>
              <label className="form-control">
                <span className="label-text">Телефон *</span>
                <input
                  type="tel"
                  required
                  minLength={5}
                  maxLength={50}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input input-bordered"
                />
              </label>
              <label className="form-control">
                <span className="label-text">Telegram</span>
                <input
                  type="text"
                  maxLength={255}
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="@username"
                  className="input input-bordered"
                />
              </label>
              <label className="form-control">
                <span className="label-text">Гостей (до {house.capacity})</span>
                <input
                  type="number"
                  min={1}
                  max={house.capacity}
                  value={guestNum}
                  onChange={(e) => setGuestNum(Number(e.target.value))}
                  className="input input-bordered"
                />
              </label>
            </div>

            {extras.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Дополнительные услуги</h3>
                <div className="grid gap-2">
                  {extras.map((ex) => (
                    <label
                      key={ex.slug}
                      className="flex items-center justify-between p-3 rounded-lg border border-base-300 hover:border-primary/40 cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-primary"
                          checked={Boolean(selectedExtras[ex.slug])}
                          onChange={() => toggleExtra(ex.slug)}
                        />
                        {ex.name}
                      </span>
                      <span className="text-sm text-base-content/60">
                        {ex.price.toLocaleString('ru-RU')} ₽
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Honeypot — hidden from humans, bots fill all fields */}
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="absolute opacity-0 -left-[9999px] w-0 h-0"
              aria-hidden="true"
            />

            {error && (
              <div className="alert alert-error mt-4">
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2 justify-between mt-6">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setStep(2)}
              >
                Назад
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || !name || !phone}
              >
                {submitting ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  'Отправить заявку'
                )}
              </button>
            </div>
          </form>
        )}

        {step === 4 && successId && (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-7xl text-success mb-4 block">
              check_circle
            </span>
            <h2 className="text-2xl font-serif font-bold mb-2">
              Заявка отправлена!
            </h2>
            <p className="text-base-content/70 mb-4">
              Номер бронирования:{' '}
              <code className="text-xs">{successId}</code>
            </p>
            <p className="text-sm text-base-content/60">
              Мы свяжемся с вами в ближайшее время для подтверждения.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
