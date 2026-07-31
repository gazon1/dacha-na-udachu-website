'use client'

import { useEffect } from 'react'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to server console for debugging — in production this is captured by
    // the platform's logging layer.
    console.error('Unhandled error in frontend:', error)
  }, [error])

  return (
    <div className="container-narrow flex flex-col items-center justify-center min-h-[60vh] py-16 text-center">
      <span className="material-symbols-outlined text-7xl text-error mb-6">
        error
      </span>
      <h1 className="text-4xl font-serif font-bold mb-4">Что-то пошло не так</h1>
      <p className="text-base-content/80 mb-8 max-w-md">
        Произошла непредвиденная ошибка. Мы уже работаем над этим. Попробуйте
        перезагрузить страницу.
      </p>
      {error.digest && (
        <p className="text-xs text-base-content/40 mb-6 font-mono">
          ID ошибки: {error.digest}
        </p>
      )}
      <button type="button" onClick={reset} className="btn btn-primary">
        <span className="material-symbols-outlined">refresh</span>
        Попробовать снова
      </button>
    </div>
  )
}
