type Props = {
  value?: { icon?: string; label?: string }
}

export function AmenityItemBlock({ value }: Props) {
  if (!value?.label) return null
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="material-symbols-outlined text-base text-success">{value.icon || 'check'}</span>
      <span>{value.label}</span>
    </div>
  )
}