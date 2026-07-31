'use client'

import { useState } from 'react'

type Props = {
  value?: { title?: string; description?: string }
}

export function NewsletterFormBlock({ value }: Props) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/newsletter-signups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setStatus(res.ok ? 'ok' : 'err')
    } catch {
      setStatus('err')
    }
  }

  return (
    <section className="glass-card p-6 my-6">
      {value?.title && <h3 className="text-xl font-bold mb-2">{value.title}</h3>}
      {value?.description && <p className="text-sm text-base-content/70 mb-4">{value.description}</p>}
      <form onSubmit={submit} className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="input input-bordered flex-1"
        />
        <button type="submit" disabled={status === 'loading'} className="btn btn-primary">
          {status === 'loading' ? 'Отправка…' : 'Подписаться'}
        </button>
      </form>
      {status === 'ok' && <p className="text-success text-sm mt-2">Готово, спасибо!</p>}
      {status === 'err' && <p className="text-error text-sm mt-2">Что-то пошло не так.</p>}
    </section>
  )
}