'use client'

import { useEffect, useState } from 'react'

type ConfirmedContribution = {
  name: string
  amount: number
  message: string | null
  confirmedAt: string | null
}

type InitialSummary = {
  total: number
  contributions: ConfirmedContribution[]
}

type MyContribution = {
  id: string | number
  secretKey: string
  status: 'pending' | 'confirmed' | 'rejected' | 'expired'
  amount: number
  paymentUrl: string
}

type Props = {
  eventId: string | number
  eventSlug: string
  showWidget: boolean
  contributionGoal: number | null
  initialSummary: InitialSummary
  yoomoneyEnabled: boolean
}

function storageKey(eventId: string | number): string {
  return `contrib-${eventId}`
}

function pluralRubles(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return 'рублей'
  if (mod10 === 1) return 'рубль'
  if (mod10 >= 2 && mod10 <= 4) return 'рубля'
  return 'рублей'
}

function formatRub(n: number): string {
  return `${n.toLocaleString('ru-RU')} ₽`
}

/**
 * Contribution widget — three states:
 *   1. 'form'     → no contribution yet, show "Хочу скинуться" form
 *   2. 'pending'  → submitted, awaiting payment — show YooMoney button
 *   3. 'confirmed' → payment confirmed — show thank-you + own amount
 *
 * Below the personal block, always show:
 *   - Progress bar (collected / goal)
 *   - List of confirmed contributors
 *
 * Persistence: localStorage stores `{ id, secretKey, status, amount, paymentUrl }`.
 * On mount we fetch /by-secret/:secretKey to reconcile (in case webhook
 * already fired and the contribution is now confirmed). On tab refocus we
 * re-reconcile so the user sees their status flip without manual refresh.
 */
export function ContributionWidget({
  eventId,
  eventSlug,
  showWidget,
  contributionGoal,
  initialSummary,
  yoomoneyEnabled,
}: Props) {
  const eventIdStr = String(eventId)
  const [my, setMy] = useState<MyContribution | null>(null)
  const [summary, setSummary] = useState<InitialSummary>(initialSummary)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refreshSummary() {
    try {
      const r = await fetch(`/api/event-contributions/summary/${encodeURIComponent(eventSlug)}`)
      if (!r.ok) return
      const data = (await r.json()) as InitialSummary & { ok: boolean }
      if (data.ok) {
        setSummary({ total: data.total, contributions: data.contributions })
      }
    } catch {
      /* ignore */
    }
  }

  async function reconcileStatus(secretKey: string, fallback: MyContribution) {
    try {
      const r = await fetch(`/api/event-contributions/by-secret/${encodeURIComponent(secretKey)}`)
      if (!r.ok) return
      const data = (await r.json()) as {
        id: string | number
        status: MyContribution['status']
        amount: number
      }
      const updated: MyContribution = { ...fallback, ...data }
      setMy(updated)
      try {
        localStorage.setItem(storageKey(eventIdStr), JSON.stringify(updated))
      } catch {
        /* ignore */
      }
      if (data.status === 'confirmed') refreshSummary()
    } catch {
      /* ignore */
    }
  }

  // On mount — restore from localStorage and reconcile with server.
  useEffect(() => {
    if (typeof window === 'undefined') return
    let cancelled = false
    const stored = localStorage.getItem(storageKey(eventIdStr))
    if (!stored) {
      setLoading(false)
      return
    }
    try {
      const parsed = JSON.parse(stored) as MyContribution
      setMy(parsed)
      reconcileStatus(parsed.secretKey, parsed).finally(() => {
        if (!cancelled) setLoading(false)
      })
    } catch {
      localStorage.removeItem(storageKey(eventIdStr))
      if (!cancelled) setLoading(false)
    }
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventIdStr])

  // On tab focus — re-reconcile (user came back from YooMoney).
  useEffect(() => {
    if (typeof window === 'undefined' || !my) return
    function onVisible() {
      if (document.visibilityState === 'visible' && my) {
        reconcileStatus(my.secretKey, my)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventIdStr, my?.secretKey])

  if (!showWidget && summary.contributions.length === 0) {
    return null
  }
  if (loading) {
    return (
      <div className="glass-card p-6">
        <p className="text-sm text-base-content/60">Загружаем…</p>
      </div>
    )
  }

  const { total, contributions } = summary
  const goal = contributionGoal
  const progressPct = goal && goal > 0 ? Math.min(100, Math.round((total / goal) * 100)) : null

  return (
    <div className="glass-card p-6 space-y-4">
      <h3 className="text-xl font-serif font-bold">
        <span className="material-symbols-outlined align-middle mr-2">savings</span>
        Скинуться на дачу
      </h3>

      {/* Progress bar */}
      <div>
        {goal && goal > 0 ? (
          <>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">{formatRub(total)}</span>
              <span className="text-base-content/60">из {formatRub(goal)}</span>
            </div>
            <progress
              className="progress progress-primary w-full"
              value={total}
              max={goal}
            />
            <p className="text-xs text-base-content/60 mt-1">{progressPct}%</p>
          </>
        ) : (
          <p className="text-sm">
            Уже собрано: <span className="font-medium">{formatRub(total)}</span>
          </p>
        )}
      </div>

      {/* Contributors list */}
      <div>
        <h4 className="text-sm font-medium text-base-content/70 mb-2">
          Уже скинулись ({contributions.length})
        </h4>
        {contributions.length === 0 ? (
          <p className="text-sm text-base-content/60">Пока никто не скинулся. Будьте первым!</p>
        ) : (
          <ul className="space-y-2">
            {contributions.map((c, i) => (
              <li key={i} className="flex items-baseline justify-between gap-2 text-sm">
                <div>
                  <span className="font-medium">{c.name}</span>
                  {c.message && (
                    <span className="text-base-content/60 ml-1">— {c.message}</span>
                  )}
                </div>
                <span className="font-medium whitespace-nowrap">{formatRub(c.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Personal contribution block */}
      {!yoomoneyEnabled ? (
        <p className="text-sm text-base-content/60 italic">
          Приём взносов временно недоступен.
        </p>
      ) : my?.status === 'confirmed' ? (
        <ConfirmedBlock amount={my.amount} />
      ) : my?.status === 'pending' ? (
        <PendingBlock
          amount={my.amount}
          paymentUrl={my.paymentUrl}
          onCheck={() => reconcileStatus(my.secretKey, my)}
        />
      ) : my?.status === 'rejected' ? (
        <RejectedBlock />
      ) : (
        <ContributionForm
          eventSlug={eventSlug}
          onSuccess={(data) => {
            const newMy: MyContribution = {
              id: data.id,
              secretKey: data.secretKey,
              status: 'pending',
              amount: data.amount,
              paymentUrl: data.paymentUrl,
            }
            try {
              localStorage.setItem(storageKey(eventIdStr), JSON.stringify(newMy))
            } catch {
              /* ignore */
            }
            setMy(newMy)
            setError(null)
          }}
          onError={setError}
          error={error}
        />
      )}
    </div>
  )
}

// ---------- personal blocks ----------

function ConfirmedBlock({ amount }: { amount: number }) {
  return (
    <div className="alert alert-success">
      <span className="material-symbols-outlined">check_circle</span>
      <div>
        <p className="font-medium">Спасибо за поддержку!</p>
        <p className="text-sm opacity-90">
          Вы скинулись {amount.toLocaleString('ru-RU')} {pluralRubles(amount)}.
        </p>
      </div>
    </div>
  )
}

function PendingBlock({
  amount,
  paymentUrl,
  onCheck,
}: {
  amount: number
  paymentUrl: string
  onCheck: () => void
}) {
  const [checking, setChecking] = useState(false)

  async function handleCheck() {
    setChecking(true)
    try {
      onCheck()
    } finally {
      // Brief cooldown to give the server a moment; the reconcileStatus fetch
      // returns immediately regardless of whether the webhook has fired.
      setTimeout(() => setChecking(false), 500)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm">
        Заявка на {amount.toLocaleString('ru-RU')} {pluralRubles(amount)} принята. Завершите оплату:
      </p>
      <a
        href={paymentUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-primary w-full"
      >
        <span className="material-symbols-outlined">open_in_new</span>
        Оплатить через ЮMoney
      </a>
      <button
        type="button"
        className="btn btn-ghost btn-sm w-full"
        onClick={handleCheck}
        disabled={checking}
      >
        {checking ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          <>
            <span className="material-symbols-outlined text-base">refresh</span>
            Я оплатил(а) — проверить
          </>
        )}
      </button>
    </div>
  )
}

function RejectedBlock() {
  return (
    <div className="alert alert-warning">
      <span className="material-symbols-outlined">warning</span>
      <div>
        <p className="font-medium">Сумма не совпала</p>
        <p className="text-sm opacity-90">
          Перевод пришёл на другую сумму. Свяжитесь с организатором.
        </p>
      </div>
    </div>
  )
}

// ---------- form ----------

function ContributionForm({
  eventSlug,
  onSuccess,
  onError,
  error,
}: {
  eventSlug: string
  onSuccess: (data: { id: string | number; secretKey: string; amount: number; paymentUrl: string }) => void
  onError: (err: string | null) => void
  error: string | null
}) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState<number>(500)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    onError(null)
    try {
      const res = await fetch('/api/event-contributions/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ event: eventSlug, name, amount, message }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        id?: string | number
        secretKey?: string
        paymentUrl?: string
        error?: string
      }
      if (!res.ok || !data.ok || !data.id || !data.secretKey || !data.paymentUrl) {
        onError(data.error || 'submit_failed')
        return
      }
      onSuccess({ id: data.id, secretKey: data.secretKey, amount, paymentUrl: data.paymentUrl })
    } catch {
      onError('network_error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 pt-2 border-t border-base-300/40">
      <h4 className="text-sm font-medium text-base-content/70">Хочу скинуться</h4>
      <label className="form-control">
        <span className="label-text text-sm">Имя (как покажем в списке)</span>
        <input
          type="text"
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input input-bordered input-sm"
          placeholder="Например, Маша"
        />
      </label>
      <label className="form-control">
        <span className="label-text text-sm">Сумма, ₽</span>
        <input
          type="number"
          required
          min={1}
          max={1_000_000}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="input input-bordered input-sm"
        />
      </label>
      <label className="form-control">
        <span className="label-text text-sm">Сообщение (необязательно)</span>
        <input
          type="text"
          maxLength={200}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="input input-bordered input-sm"
          placeholder="Спасибо за дачу!"
        />
      </label>
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        className="absolute opacity-0 -left-[9999px] w-0 h-0"
        aria-hidden="true"
        name="website"
      />
      {error && (
        <div className="alert alert-error py-2">
          <span className="text-sm">{error}</span>
        </div>
      )}
      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={submitting || !name || amount < 1}
      >
        {submitting ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          <>
            <span className="material-symbols-outlined">favorite</span>
            Скинуться
          </>
        )}
      </button>
    </form>
  )
}