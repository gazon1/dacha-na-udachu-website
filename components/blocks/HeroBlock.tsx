import Link from 'next/link'

type Props = {
  value?: {
    title?: string
    subtitle?: string
    buttonText?: string
    buttonUrl?: string
    image?: string | { url?: string; alt?: string }
  }
}

/**
 * Hero block — full-bleed hero with optional background image and CTA.
 */
export function HeroBlock({ value }: Props) {
  const image = value?.image
  const imgUrl = typeof image === 'object' ? image?.url : undefined
  const imgAlt = typeof image === 'object' ? image?.alt : ''

  return (
    <section className="relative min-h-[60vh] flex items-center overflow-hidden">
      {/* Background image or gradient fallback */}
      {imgUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgUrl}
          alt={imgAlt || ''}
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-base-200 to-base-100" />
      )}
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-base-100/60 backdrop-blur-sm" />

      <div className="container-narrow relative z-10 py-20">
        <div className="max-w-2xl">
          {value?.title && (
            <h1 className="text-5xl md:text-6xl font-serif font-bold tracking-tight mb-6">
              {value.title}
            </h1>
          )}
          {value?.subtitle && (
            <p className="text-lg md:text-xl text-base-content/80 mb-8 leading-relaxed">
              {value.subtitle}
            </p>
          )}
          {value?.buttonText && value?.buttonUrl && (
            <Link
              href={value.buttonUrl}
              className="btn btn-primary btn-lg gap-2"
            >
              {value.buttonText}
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
