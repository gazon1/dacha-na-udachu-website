type Props = {
  value?: { title?: string; text?: string; highlighted?: boolean }
}

export function CtaCardBlock({ value }: Props) {
  if (!value?.title) return null
  return (
    <div className={`glass-card p-4 my-2 ${value.highlighted ? 'ring-2 ring-primary/40' : ''}`}>
      <h4 className="font-bold">{value.title}</h4>
      {value.text && <p className="text-sm text-base-content/70 whitespace-pre-line">{value.text}</p>}
    </div>
  )
}