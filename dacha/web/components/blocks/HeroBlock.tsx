"use client";
import Link from "next/link";

interface HeroBlockProps {
  value: {
    title?: string;
    subtitle?: string;
    button_text?: string;
    button_url?: string;
    class?: string;
  };
}

export function HeroBlock({ value }: HeroBlockProps) {
  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {value.title && (
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            {value.title}
          </h1>
        )}
        {value.subtitle && (
          <p className="text-lg md:text-xl text-base-content/70 max-w-2xl mb-8 whitespace-pre-line">
            {value.subtitle}
          </p>
        )}
        {value.button_text && value.button_url && (
          <Link
            href={value.button_url}
            className="btn-brand-lg inline-flex items-center gap-2 text-lg"
          >
            {value.button_text}
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        )}
      </div>
    </section>
  );
}
