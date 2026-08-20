import type { MemoryQuestion } from '@/memory/memoryQuestions'

type Props = {
  question: MemoryQuestion
  value: string
  onChange: (value: string) => void
  index: number
  total: number
}

export function MemoryCard({ question, value, onChange, index, total }: Props) {
  return (
    <div key={question.id} className="memory-content memory-card-enter w-full">
      <p className="notebook-meta">
        {question.theme} · {index + 1}/{total}
      </p>
      <h2 className="notebook-question">{question.text}</h2>
      <textarea
        className="notebook-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Напиши здесь…"
        rows={6}
        autoFocus
      />
    </div>
  )
}
