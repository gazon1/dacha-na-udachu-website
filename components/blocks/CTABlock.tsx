type Props = {
  value?: {
    title?: string
    description?: string
    buttonText?: string
    buttonUrl?: string
  }
}

export function CTABlock({ value }: Props) {
  if (!value?.title) return null
  return (
    <section className="py-12 text-center">
      <h2 className="text-3xl font-bold mb-4">{value.title}</h2>
      {value.description && <p className="text-base-content/70 mb-6 max-w-2xl mx-auto">{value.description}</p>}
      {value.buttonText && value.buttonUrl && (
        <a href={value.buttonUrl} className="btn btn-primary">{value.buttonText}</a>
      )}
    </section>
  )
}