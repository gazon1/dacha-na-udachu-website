"use client";
import Link from "next/link";

interface CtaCardBlockProps {
  value: {
    title?: string;
    description?: string;
    button_text?: string;
    button_url?: string;
    class?: string;
  };
}

export function CtaCardBlock({ value }: CtaCardBlockProps) {
  return (
    <div className={`glass-card-magenta ${value.class ?? ""}`}>
      {value.title && <h3 className="text-xl font-bold text-white mb-2">{value.title}</h3>}
      {value.description && (
        <p className="text-base-content/70 mb-4">{value.description}</p>
      )}
      {value.button_text && value.button_url && (
        <Link href={value.button_url} className="btn btn-brand">
          {value.button_text}
        </Link>
      )}
    </div>
  );
}
