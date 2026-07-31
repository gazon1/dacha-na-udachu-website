type ImageLike = {
  url?: string
  sizes?: { card?: { url?: string }; hero?: { url?: string } }
  alt?: string
}

type Props = {
  value?: { image?: ImageLike | string; caption?: string }
}

export function ImageBlock({ value }: Props) {
  if (!value?.image) return null
  // value.image can be either a string ID (when not depth-populated) or an object.
  const img = typeof value.image === 'object' ? value.image : null
  const url = img?.sizes?.hero?.url || img?.sizes?.card?.url || img?.url
  if (!url) return null
  return (
    <figure className="my-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={img?.alt || value.caption || ''} className="w-full rounded" />
      {value.caption && <figcaption className="text-sm text-base-content/60 mt-2 text-center">{value.caption}</figcaption>}
    </figure>
  )
}