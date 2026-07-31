type Props = {
  value?: {
    title?: string
    subtitle?: string
    buttonText?: string
    buttonUrl?: string
  }
}

/** Placeholder — copy real HeroBlock from /workspace/frontend/components/blocks/ */
export function HeroBlock({ value }: Props) {
  return (
    <section className="hero min-h-[50vh] bg-gradient-to-br from-primary/30 to-base-200 flex items-center">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <h1 className="text-5xl font-bold text-white mb-4">{value?.title}</h1>
        {value?.subtitle && <p className="text-xl text-base-content/80 mb-6">{value.subtitle}</p>}
        {value?.buttonText && value?.buttonUrl && (
          <a href={value.buttonUrl} className="btn btn-primary">{value.buttonText}</a>
        )}
      </div>
    </section>
  )
}