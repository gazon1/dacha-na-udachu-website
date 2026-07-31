import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '404 — Страница не найдена',
}

export default function NotFound() {
  return (
    <div className="container-narrow flex flex-col items-center justify-center min-h-[60vh] py-16 text-center">
      <span className="material-symbols-outlined text-7xl text-primary mb-6">
        travel_explore
      </span>
      <h1 className="text-5xl font-serif font-bold mb-4">404</h1>
      <p className="text-xl text-base-content/80 mb-8 max-w-md">
        Кажется, эта страница заблудилась. Возможно, она переехала или больше
        не существует.
      </p>
      <div className="flex gap-3">
        <Link href="/" className="btn btn-primary">
          <span className="material-symbols-outlined">home</span>
          На главную
        </Link>
        <Link href="/houses" className="btn btn-ghost">
          <span className="material-symbols-outlined">cottage</span>
          Смотреть дома
        </Link>
      </div>
    </div>
  )
}
