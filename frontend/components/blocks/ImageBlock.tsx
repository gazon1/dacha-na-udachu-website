"use client";

interface ImageBlockProps {
  value: {
    src?: string;
    alt?: string;
    caption?: string;
    class?: string;
  };
}

export function ImageBlock({ value }: ImageBlockProps) {
  if (!value.src) return null;
  return (
    <figure className={`mb-8 ${value.class ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={value.src} alt={value.alt ?? ""} className="w-full rounded-2xl" />
      {value.caption && (
        <figcaption className="mt-2 text-sm text-base-content/50 text-center">
          {value.caption}
        </figcaption>
      )}
    </figure>
  );
}
