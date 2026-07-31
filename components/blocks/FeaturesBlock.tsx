type Props = {
  value?: {
    title?: string
    features?: Array<{ icon?: string; text?: string; title?: string }>
  }
}

/**
 * Features block — grid of feature cards with Material Symbols icons.
 */
export function FeaturesBlock({ value }: Props) {
  if (!value?.features?.length) return null
  return (
    <section className="py-16">
      <div className="container-narrow">
        {value.title && (
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-10 text-center">
            {value.title}
          </h2>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {value.features.map((f, i) => (
            <div
              key={i}
              className="glass-card p-6 text-center hover:border-primary/30 transition-colors"
            >
              {f.icon && (
                <span className="material-symbols-outlined text-4xl text-primary mb-3 block">
                  {f.icon}
                </span>
              )}
              {f.title && (
                <h3 className="font-semibold mb-2">{f.title}</h3>
              )}
              {f.text && (
                <p className="text-sm text-base-content/70 leading-relaxed">
                  {f.text}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
