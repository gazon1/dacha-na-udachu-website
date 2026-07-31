type Props = {
  value?: { text?: string }
}

export function ParagraphBlock({ value }: Props) {
  if (!value?.text) return null
  // Split by newlines to render each as a separate <p> like the original.
  return (
    <div className="prose prose-invert max-w-none my-4">
      {value.text.split('\n').map((line, i) =>
        line.trim() ? <p key={i}>{line}</p> : null
      )}
    </div>
  )
}