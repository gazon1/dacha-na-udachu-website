'use client'

import { useState } from 'react'

export default function BookingPage() {
  // Placeholder. Real BookingWizard (3-step: house → dates → form) is ported
  // from /workspace/frontend/components/booking/BookingWizard.tsx.
  // For now this page exists so /booking is reachable.
  const [house, setHouse] = useState('')
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-6">Бронирование</h1>
      <p className="text-base-content/70 mb-6">
        Форма бронирования будет портирована из старого проекта.
        Пока что это страница-заглушка.
      </p>
      <input
        type="text"
        value={house}
        onChange={(e) => setHouse(e.target.value)}
        placeholder="URL дома (например /houses/dacha)"
        className="input input-bordered w-full"
      />
    </div>
  )
}