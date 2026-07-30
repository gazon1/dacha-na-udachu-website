"use client";

interface HeadingBlockProps {
  value: {
    text?: string;
    level?: number;
    class?: string;
  };
}

export function HeadingBlock({ value }: HeadingBlockProps) {
  const level = value.level ?? 2;
  const text = value.text ?? "";
  const className = value.class ?? "";

  const sizes: Record<number, string> = {
    1: "text-3xl md:text-4xl font-bold text-white",
    2: "text-2xl md:text-3xl font-bold text-white",
    3: "text-xl md:text-2xl font-semibold text-white",
    4: "text-lg md:text-xl font-semibold text-white",
  };

  const sizeClass = sizes[level] ?? sizes[2];

  if (level === 1) return <h1 className={`${sizeClass} mb-4 ${className}`}>{text}</h1>;
  if (level === 2) return <h2 className={`${sizeClass} mb-4 ${className}`}>{text}</h2>;
  if (level === 3) return <h3 className={`${sizeClass} mb-3 ${className}`}>{text}</h3>;
  return <h4 className={`${sizeClass} mb-2 ${className}`}>{text}</h4>;
}
