"use client";

interface InfoCardBlockProps {
  value: {
    title?: string;
    body?: string;
    icon?: string;
    class?: string;
  };
}

export function InfoCardBlock({ value }: InfoCardBlockProps) {
  return (
    <div className={`glass-card ${value.class ?? ""}`}>
      {value.icon && (
        <span className="material-symbols-outlined text-2xl text-primary mb-3 block">
          {value.icon}
        </span>
      )}
      {value.title && <h3 className="text-lg font-semibold text-white mb-2">{value.title}</h3>}
      {value.body && (
        <div className="prose prose-invert prose-sm max-w-none text-base-content/70">
          {value.body}
        </div>
      )}
    </div>
  );
}
