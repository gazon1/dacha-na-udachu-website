"use client";
import Link from "next/link";

interface CtaBlockProps {
  value: {
    title?: string;
    description?: string;
    button_text?: string;
    button_url?: string;
    class?: string;
  };
}

export function CtaBlock({ value }: CtaBlockProps) {
  return (
    <section className="py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card rounded-3xl p-8 md:p-12 text-center bonfire-glow">
          {value.title && <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{value.title}</h2>}
          {value.description && (
            <p className="text-base-content/70 max-w-xl mx-auto mb-8 whitespace-pre-line">
              {value.description}
            </p>
          )}
          {value.button_text && value.button_url && (
            <Link
              href={value.button_url}
              className="btn btn-primary btn-lg inline-flex items-center gap-2 text-lg px-8 py-4"
            >
              {value.button_text}
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
