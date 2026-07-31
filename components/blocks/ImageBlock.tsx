import Image from 'next/image'

type ImageLike = {
  url?: string
  sizes?: { card?: { url?: string }; hero?: { url?: string } }
  alt?: string
}

type Props = {
  value?: { image?: ImageLike | string; caption?: string }
}

/**
 * Image block — responsive image with optional caption.
 * Uses next/image for automatic optimization (sizes, formats, lazy loading).
 */
export function ImageBlock({ value }: Props) {
  if (!value?.image) return null
  const img = typeof value.image === 'object' ? value.image : null
  // Pick the best available size — prefer hero (1920w) for high-res display,
  // fall back to card (768w) or the original.
  const url = img?.sizes?.hero?.url || img?.sizes?.card?.url || img?.url
  if (!url) return null
  const alt = img?.alt || value.caption || ''

  return (
    <figure className="my-8">
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-base-200">
        <Image
          src={url}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
        />
      </div>
      {value.caption && (
        <figcaption className="text-sm text-base-content/60 mt-2 text-center">
          {value.caption}
        </figcaption>
      )}
    </figure>
  )
}
