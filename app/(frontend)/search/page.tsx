'use client'

import { useState } from 'react'

export default function SearchPage() {
  const [q, setQ] = useState('')
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-6">Поиск</h1>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Введите запрос..."
        className="input input-bordered w-full"
      />
      <p className="text-base-content/60 mt-4 text-sm">
        Поиск будет реализован через Payload Local API: payload.find() по houses, events, news.
      </p>
    </div>
  )
}