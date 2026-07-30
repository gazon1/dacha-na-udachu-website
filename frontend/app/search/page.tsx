import { Suspense } from "react";
import { SearchContent } from "./SearchContent";

export const dynamic = "force-dynamic";

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-4 py-12 text-base-content/60">Загрузка...</div>}>
      <SearchContent />
    </Suspense>
  );
}
