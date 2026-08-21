import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ForwardRefExoticComponent,
  type ReactNode,
  type RefAttributes,
} from 'react'
import HTMLFlipBook from 'react-pageflip'
import { MemoryCard } from '@/components/memory/MemoryCard'
import { MemoryFinishPage } from '@/components/memory/MemoryFinishPage'
import { MemoryWelcomePage } from '@/components/memory/MemoryWelcomePage'
import { useMemoryOpen } from '@/components/memory/MemoryOpenContext'
import { useI18n } from '@/hooks/useI18n'
import { useMemoryQuiz } from '@/hooks/useMemoryQuiz'

type Stage = 'welcome' | 'quiz' | 'finish'

type FlipApi = {
  flipNext: (corner?: 'top' | 'bottom') => void
  flipPrev: (corner?: 'top' | 'bottom') => void
  flip: (pageNum: number, corner?: 'top' | 'bottom') => void
  getCurrentPageIndex: () => number
  getSettings: () => { disableFlipByClick: boolean }
}

type FlipBookRef = {
  pageFlip: () => FlipApi | undefined
}

/** Swipe calls flipPrev/Next; with disableFlipByClick those no-op in portrait. Temporarily unlock. */
function patchSwipeFlip(api: FlipApi) {
  const origNext = api.flipNext.bind(api)
  const origPrev = api.flipPrev.bind(api)
  const withUnlock =
    (fn: (corner?: 'top' | 'bottom') => void) =>
    (corner?: 'top' | 'bottom') => {
      const settings = api.getSettings()
      const was = settings.disableFlipByClick
      settings.disableFlipByClick = false
      try {
        fn(corner)
      } finally {
        settings.disableFlipByClick = was
      }
    }
  api.flipNext = withUnlock(origNext)
  api.flipPrev = withUnlock(origPrev)
}

/** One ruled notebook leaf — ref required by react-pageflip. */
const MemoryBookPage = forwardRef<
  HTMLDivElement,
  { children: ReactNode; className?: string }
>(function MemoryBookPage({ children, className }, ref) {
  return (
    <div ref={ref} className={`memory-book-page${className ? ` ${className}` : ''}`}>
      <div className="memory-book-page-inner">{children}</div>
    </div>
  )
})

function stateFromPage(page: number, total: number): { stage: Stage; index: number } {
  if (page <= 0) return { stage: 'welcome', index: 0 }
  if (page >= total + 1) return { stage: 'finish', index: Math.max(0, total - 1) }
  return { stage: 'quiz', index: page - 1 }
}

const FlipBook = HTMLFlipBook as unknown as ForwardRefExoticComponent<
  {
    width: number
    height: number
    children: ReactNode
    className?: string
    style?: CSSProperties
    size?: 'fixed' | 'stretch'
    minWidth?: number
    maxWidth?: number
    minHeight?: number
    maxHeight?: number
    drawShadow?: boolean
    flippingTime?: number
    usePortrait?: boolean
    startZIndex?: number
    autoSize?: boolean
    maxShadowOpacity?: number
    showCover?: boolean
    mobileScrollSupport?: boolean
    clickEventForward?: boolean
    useMouseEvents?: boolean
    swipeDistance?: number
    showPageCorners?: boolean
    disableFlipByClick?: boolean
    startPage?: number
    renderOnlyPageLengthChange?: boolean
    onFlip?: (e: { data: number }) => void
    onChangeState?: (e: { data: string }) => void
    onInit?: (e: { data: { page: number } }) => void
  } & RefAttributes<FlipBookRef>
>

export function MemoryQuizPage() {
  const { t } = useI18n()
  const { beginClose, open, exiting, interactive } = useMemoryOpen()
  const { questions, answerMap, saveAnswer, saveAll, pullAnswers, saving } =
    useMemoryQuiz()
  const [stage, setStage] = useState<Stage>('welcome')
  const [, setIndex] = useState(0)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [bookSize, setBookSize] = useState({ w: 0, h: 0 })
  const closingRef = useRef(false)
  const bookRef = useRef<FlipBookRef | null>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef(0)
  const flippingRef = useRef(false)
  const draftRef = useRef(draft)
  const savingRef = useRef(saving)
  const touchedRef = useRef<Set<string>>(new Set())
  const questionsRef = useRef(questions)

  draftRef.current = draft
  savingRef.current = saving
  questionsRef.current = questions

  const total = questions.length

  useEffect(() => {
    void pullAnswers()
  }, [pullAnswers])

  useEffect(() => {
    setDraft((prev) => {
      let changed = false
      const next = { ...prev }
      for (const q of questions) {
        if (touchedRef.current.has(q.id)) continue
        const stored = answerMap[q.id] ?? ''
        if (next[q.id] !== stored) {
          next[q.id] = stored
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [questions, answerMap])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const measure = () => {
      const w = Math.max(0, Math.floor(el.clientWidth))
      const h = Math.max(0, Math.floor(el.clientHeight))
      setBookSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const persistQuestionAtPage = useCallback(async (page: number) => {
    const qs = questionsRef.current
    if (page < 1 || page > qs.length) return
    const q = qs[page - 1]
    if (!q) return
    setError(null)
    try {
      await saveAnswer(q.id, draftRef.current[q.id] ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : t('memory.saveError'))
    }
  }, [saveAnswer, t])

  const syncFromPage = useCallback(
    (page: number) => {
      const prev = pageRef.current
      void persistQuestionAtPage(prev)
      pageRef.current = page
      const next = stateFromPage(page, questionsRef.current.length)
      setStage(next.stage)
      setIndex(next.index)
    },
    [persistQuestionAtPage],
  )

  const onDraftChange = useCallback((questionId: string, value: string) => {
    touchedRef.current.add(questionId)
    setDraft((d) => ({ ...d, [questionId]: value }))
  }, [])

  const handleClose = async () => {
    if (closingRef.current || exiting || !open) return
    closingRef.current = true
    setError(null)
    try {
      if (stage !== 'welcome') {
        await saveAll(draftRef.current, touchedRef.current)
      }
    } catch (e) {
      closingRef.current = false
      setError(e instanceof Error ? e.message : t('memory.saveError'))
      return
    }
    beginClose()
  }

  const canMountBook = bookSize.w >= 120 && bookSize.h >= 200

  return (
    <div
      className="memory-shell notebook-page"
      style={{
        opacity: 1,
        pointerEvents: interactive ? 'auto' : 'none',
      }}
      aria-hidden={!interactive}
    >
      <div ref={viewportRef} className="memory-book-viewport">
        {error && (
          <p
            className="notebook-meta memory-book-error"
            style={{ color: 'rgb(153 27 27 / 0.9)' }}
          >
            {error}
          </p>
        )}

        {canMountBook && (
          <FlipBook
            key={`book-${total}-${bookSize.w}x${bookSize.h}`}
            ref={bookRef}
            className="memory-flip-book"
            style={{ width: bookSize.w, height: bookSize.h }}
            width={bookSize.w}
            height={bookSize.h}
            size="fixed"
            minWidth={bookSize.w}
            maxWidth={bookSize.w}
            minHeight={bookSize.h}
            maxHeight={bookSize.h}
            drawShadow
            flippingTime={1000}
            usePortrait
            startZIndex={0}
            autoSize={false}
            maxShadowOpacity={0.12}
            showCover={false}
            mobileScrollSupport
            clickEventForward
            useMouseEvents
            swipeDistance={40}
            showPageCorners={false}
            disableFlipByClick
            startPage={0}
            renderOnlyPageLengthChange
            onInit={() => {
              flippingRef.current = false
              const api = bookRef.current?.pageFlip()
              if (api) patchSwipeFlip(api)
            }}
            onChangeState={(e) => {
              flippingRef.current = e.data === 'flipping'
            }}
            onFlip={(e) => {
              flippingRef.current = false
              syncFromPage(e.data)
            }}
          >
            <MemoryBookPage>
              <MemoryWelcomePage />
            </MemoryBookPage>

            {questions.map((q, i) => (
              <MemoryBookPage key={q.id}>
                <div className="memory-content flex min-h-0 w-full flex-1 flex-col">
                  <MemoryCard
                    question={q}
                    value={draft[q.id] ?? ''}
                    onChange={(value) => onDraftChange(q.id, value)}
                    index={i}
                    total={total}
                    autoFocus={i === 0}
                  />
                </div>
              </MemoryBookPage>
            ))}

            <MemoryBookPage>
              <MemoryFinishPage />
            </MemoryBookPage>
          </FlipBook>
        )}
      </div>

      <header className="notebook-page-header">
        <button
          type="button"
          id="memory-brand-logo"
          className="notebook-brand-wordmark logo w-fit select-none"
          onClick={() => void handleClose()}
          disabled={saving || !open}
          aria-label={t('memory.closeAria')}
        >
          NasTale
        </button>
      </header>
    </div>
  )
}
