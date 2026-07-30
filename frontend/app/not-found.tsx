import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <h1 className="text-6xl font-bold text-white mb-4">404</h1>
      <p className="text-xl text-base-content/60 mb-8">Страница не найдена</p>
      <Link href="/" className="btn-primary">
        На главную
      </Link>
    </div>
  );
}
