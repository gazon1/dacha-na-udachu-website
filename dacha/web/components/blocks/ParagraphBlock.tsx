"use client";

interface ParagraphBlockProps {
  value: string;
  class?: string;
}

export function ParagraphBlock({ value, class: className = "" }: ParagraphBlockProps) {
  return (
    <div className={`prose prose-invert prose-lg max-w-none mb-8 ${className}`}>
      {value.split("\n").map((line, i) => (
        line ? <p key={i}>{line}</p> : <br key={i} />
      ))}
    </div>
  );
}
