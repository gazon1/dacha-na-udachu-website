type Props = {
  value?: {
    title?: string
    features?: Array<{ icon?: string; text?: string }>
  }
}

export function FeaturesBlock({ value }: Props) {
  if (!value?.features?.length) return null
  return (
    <section className="py-12">
      {value.title && <h2 className="text-3xl font-bold mb-6 text-center">{value.title}</h2>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {value.features.map((f, i) => (
          <div key={i} className="glass-card p-4 text-center">
            {f.icon && <span className="material-symbols-outlined text-3xl mb-2">{f.icon}</span>}
            <p>{f.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}