import { useI18n } from '@/hooks/useI18n'
import type { MemoryQuestion } from '@/memory/memoryQuestions'

type Props = {
  question: MemoryQuestion
  value: string
  onChange: (value: string) => void
  index: number
  total: number
}

export function MemoryCard({ question, value, onChange, index, total }: Props) {
  const { t } = useI18n()

  return (
    <div key={question.id} className="flex min-h-0 flex-1 flex-col">
      <p className="notebook-meta shrink-0">
        {question.theme} · {index + 1}/{total}
      </p>
      <h2 className="notebook-question shrink-0">{question.text}</h2>
      <textarea
        className="notebook-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('memory.placeholder')}
        autoFocus
      />
    </div>
  )
}
