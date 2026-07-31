type Props = {
  value?: { icon?: string; title?: string; content?: string }
}

export function InfoCardBlock({ value }: Props) {
  if (!value?.title) return null
  return (
    <div className="glass-card p-4 my-2">
      <div className="flex items-start gap-3">
        {value.icon && <span className="material-symbols-outlined text-2xl">{value.icon}</span>}
        <div>
          <h4 className="font-bold">{value.title}</h4>
          {value.content && <p className="text-sm text-base-content/70 whitespace-pre-line">{value.content}</p>}
        </div>
      </div>
    </div>
  )
}