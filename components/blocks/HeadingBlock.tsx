type Props = {
  value?: { text?: string; level?: 'h2' | 'h3' | 'h4' }
}

export function HeadingBlock({ value }: Props) {
  if (!value?.text) return null
  const level = value.level || 'h2'
  const className = level === 'h4' ? 'text-xl font-bold my-3' : level === 'h3' ? 'text-2xl font-bold my-4' : 'text-3xl font-bold my-6'
  if (level === 'h4') return <h4 className={className}>{value.text}</h4>
  if (level === 'h3') return <h3 className={className}>{value.text}</h3>
  return <h2 className={className}>{value.text}</h2>
}