import { useEffect, useLayoutEffect, useRef } from 'react'
import { useI18n } from '@/hooks/useI18n'
import type { MemoryQuestion } from '@/memory/memoryQuestions'

type Props = {
  question: MemoryQuestion
  value: string
  onChange: (value: string) => void
  index: number
  total: number
  autoFocus?: boolean
}

/**
 * Uncontrolled textarea: react-pageflip moves DOM nodes and freezes page trees,
 * so controlled React value updates often never reach the real input.
 */
export function MemoryCard({
  question,
  value,
  onChange,
  index,
  total,
  autoFocus = false,
}: Props) {
  const { t } = useI18n()
  const ref = useRef<HTMLTextAreaElement>(null)
  const touchedRef = useRef(false)

  // Hydrate from saved answer until the user types (page may mount before draft loads).
  useEffect(() => {
    const el = ref.current
    if (!el || touchedRef.current) return
    if (el.value !== value) el.value = value
  }, [value, question.id])

  useEffect(() => {
    touchedRef.current = false
  }, [question.id])

  // page-flip preventDefault()s mousedown (blocks focus) but must still see
  // touchstart or swipes over the large textarea never flip. Force-focus on click.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const focusField = () => {
      queueMicrotask(() => el.focus())
    }
    el.addEventListener('mousedown', focusField)
    return () => el.removeEventListener('mousedown', focusField)
  }, [question.id])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="notebook-meta shrink-0">
        {question.theme} · {index + 1}/{total}
      </p>
      <h2 className="notebook-question shrink-0">{question.text}</h2>
      <textarea
        ref={ref}
        className="notebook-input"
        defaultValue={value}
        onInput={(e) => {
          touchedRef.current = true
          onChange(e.currentTarget.value)
        }}
        placeholder={t('memory.placeholder')}
        autoFocus={autoFocus}
      />
    </div>
  )
}
