'use client'

import { useState } from 'react'

/**
 * Inline newsletter signup form.
 * Posts to /api/newsletter-signups/subscribe.
 */
export function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<
    'idle' | 'success' | 'already' | 'error'
  >('idle')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setStatus('idle')
    try {
      const res = await fetch('/api/newsletter-signups/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        const data = await res.json()
        setStatus(data.alreadySubscribed ? 'already' : 'success')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'success' || status === 'already') {
    return (
      <p className="text-sm text-success flex items-center gap-2">
        <span className="material-symbols-outlined">check_circle</span>
        {status === 'already'
          ? 'Вы уже подписаны.'
          : 'Спасибо! Подписка оформлена.'}
      </p>
    )
  }

  return (
    <form onSubmit={submit} className="join w-full max-w-md">
      <input
        type="email"
        required
        placeholder="Ваш email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input input-bordered join-item flex-1"
      />
      <button
        type="submit"
        className="btn btn-primary join-item"
        disabled={submitting}
      >
        {submitting ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          'Подписаться'
        )}
      </button>
    </form>
  )
}
