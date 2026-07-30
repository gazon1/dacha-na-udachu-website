"use client";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";

export function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(q);

  const { data, isLoading } = useQuery({
    queryKey: ["search", q],
    queryFn: async () => {
      if (!q) return null;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/search/?q=${encodeURIComponent(q)}`
      );
      if (!res.ok) return null;
      return res.json();
    },
    enabled: q.length > 0,
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-white mb-8">Поиск</h1>
      <form action="/search/" method="get" className="flex gap-3 mb-8">
        <input
          name="q"
          defaultValue={q}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Что ищем?"
          className="form-input flex-1"
        />
        <button type="submit" className="btn-primary whitespace-nowrap">
          Искать
        </button>
      </form>

      {isLoading && <p className="text-base-content/60">Загрузка...</p>}

      {data?.results?.length === 0 && q && (
        <p className="text-base-content/60">Ничего не найдено по запросу &ldquo;{q}&rdquo;</p>
      )}

      {data?.results?.length > 0 && (
        <ul className="space-y-4">
          {data.results.map((r: { id: number; title: string; url: string }) => (
            <li key={r.id} className="glass-card">
              <Link href={r.url} className="text-primary hover:text-white transition-colors">
                {r.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
