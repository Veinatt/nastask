import { useEffect, useRef, useState } from 'react'
import { MemoryCard } from '@/components/memory/MemoryCard'
import { MemoryFinishPage } from '@/components/memory/MemoryFinishPage'
import { MemoryWelcomePage } from '@/components/memory/MemoryWelcomePage'
import { useMemoryOpen } from '@/components/memory/MemoryOpenContext'
import { useMemoryQuiz } from '@/hooks/useMemoryQuiz'

type Stage = 'welcome' | 'quiz' | 'finish'

export function MemoryQuizPage() {
  const { beginClose, open, exiting, interactive } = useMemoryOpen()
  const { questions, answerMap, saveAnswer, saveAll, pullAnswers, saving } =
    useMemoryQuiz()
  const [stage, setStage] = useState<Stage>('welcome')
  const [index, setIndex] = useState(0)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const closingRef = useRef(false)

  useEffect(() => {
    void pullAnswers()
  }, [pullAnswers])

  useEffect(() => {
    setDraft((prev) => {
      const next = { ...prev }
      for (const q of questions) {
        if (next[q.id] === undefined) next[q.id] = answerMap[q.id] ?? ''
      }
      return next
    })
  }, [questions, answerMap])

  const question = questions[index]
  const total = questions.length

  const persistCurrent = async () => {
    if (!question) return
    setError(null)
    try {
      await saveAnswer(question.id, draft[question.id] ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить')
    }
  }

  const goNext = async () => {
    await persistCurrent()
    if (index >= total - 1) {
      setStage('finish')
      return
    }
    setIndex((i) => i + 1)
  }

  const goPrev = async () => {
    await persistCurrent()
    if (index === 0) {
      setStage('welcome')
      return
    }
    setIndex((i) => Math.max(0, i - 1))
  }

  const handleClose = async () => {
    if (closingRef.current || exiting || !open) return
    closingRef.current = true
    setError(null)
    try {
      if (stage !== 'welcome') await saveAll(draft)
    } catch (e) {
      closingRef.current = false
      setError(e instanceof Error ? e.message : 'Не удалось сохранить')
      return
    }
    beginClose()
  }

  return (
    <div
      className="memory-shell notebook-page"
      style={{
        // Always opaque while mounted — enter/exit splash covers the swap (no fade flash)
        opacity: 1,
        pointerEvents: interactive ? 'auto' : 'none',
      }}
      aria-hidden={!interactive}
    >
      {/* Same logo slot metrics as Navigation top bar */}
      <header className="notebook-page-header flex shrink-0 items-center px-4 py-2.5 md:px-6">
        <button
          type="button"
          id="memory-brand-logo"
          className="notebook-brand-wordmark logo w-fit select-none"
          onClick={() => void handleClose()}
          disabled={saving || !open}
          aria-label="Закрыть NasTales"
        >
          NasTales
        </button>
      </header>

      <div className="notebook-inner flex min-w-0 flex-1 flex-col overflow-x-clip">
        <div className="notebook-body flex min-h-0 flex-1 flex-col">
          {error && (
            <p
              className="notebook-meta"
              style={{ color: 'rgb(153 27 27 / 0.9)' }}
            >
              {error}
            </p>
          )}

          {stage === 'welcome' && (
            <MemoryWelcomePage
              onStart={() => {
                setStage('quiz')
                setIndex(0)
              }}
            />
          )}

          {stage === 'finish' && (
            <MemoryFinishPage
              onEdit={() => {
                setStage('quiz')
                setIndex(0)
              }}
            />
          )}

          {stage === 'quiz' && question && (
            <>
              <MemoryCard
                question={question}
                value={draft[question.id] ?? ''}
                onChange={(value) =>
                  setDraft((d) => ({ ...d, [question.id]: value }))
                }
                index={index}
                total={total}
              />
              <div className="notebook-actions flex items-center justify-between gap-3">
                <button
                  type="button"
                  className="notebook-btn"
                  onClick={() => void goPrev()}
                  disabled={saving}
                >
                  Назад
                </button>
                <button
                  type="button"
                  className="notebook-btn notebook-btn-primary"
                  onClick={() => void goNext()}
                  disabled={saving}
                >
                  {index >= total - 1 ? 'Готово' : 'Дальше'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
