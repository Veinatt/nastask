import { useMemo, useState } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { getMemoryQuestion, MEMORY_QUESTION_IDS } from '@/memory/memoryQuestions'
import { cn } from '@/lib/utils'

type ExportAnswer = {
  userId?: number
  questionId: string
  answer: string | null
  answeredAt?: string | null
  updatedAt?: string | null
}

type Props = {
  onClose: () => void
}

function parseExportJson(raw: string): ExportAnswer[] {
  const data = JSON.parse(raw) as unknown
  if (Array.isArray(data)) return data as ExportAnswer[]
  if (
    data &&
    typeof data === 'object' &&
    Array.isArray((data as { answers?: unknown }).answers)
  ) {
    return (data as { answers: ExportAnswer[] }).answers
  }
  throw new Error('expected { answers: [...] } or an array')
}

function formatWhen(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(locale === 'be' ? 'be-BY' : 'ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function MemoryExportViewer({ onClose }: Props) {
  const { t, locale } = useI18n()
  const [raw, setRaw] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<ExportAnswer[] | null>(null)

  const apply = (text: string) => {
    setError(null)
    try {
      const parsed = parseExportJson(text.trim())
      setAnswers(parsed)
    } catch (e) {
      setAnswers(null)
      setError(e instanceof Error ? e.message : t('memory.viewer.parseError'))
    }
  }

  const byUser = useMemo(() => {
    if (!answers) return []
    const map = new Map<number | 'unknown', ExportAnswer[]>()
    for (const a of answers) {
      const key = typeof a.userId === 'number' ? a.userId : 'unknown'
      const list = map.get(key) ?? []
      list.push(a)
      map.set(key, list)
    }
    const order = new Map(
      MEMORY_QUESTION_IDS.map((id, i) => [id, i] as const),
    )
    return [...map.entries()]
      .sort(([a], [b]) => String(a).localeCompare(String(b)))
      .map(([userId, rows]) => ({
        userId,
        rows: [...rows].sort(
          (x, y) =>
            (order.get(x.questionId as (typeof MEMORY_QUESTION_IDS)[number]) ??
              999) -
            (order.get(y.questionId as (typeof MEMORY_QUESTION_IDS)[number]) ??
              999),
        ),
      }))
  }, [answers])

  return (
    <div
      className="fixed inset-0 z-[240] flex flex-col bg-background text-foreground"
      role="dialog"
      aria-modal
      aria-label={t('memory.viewer.title')}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            {t('memory.viewer.title')}
          </h1>
          <p className="text-xs text-muted-foreground">{t('memory.viewer.hint')}</p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          onClick={onClose}
        >
          {t('common.close')}
        </button>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium">{t('memory.viewer.paste')}</span>
          <textarea
            className={cn(
              'min-h-[8rem] w-full resize-y rounded-xl border border-border bg-card px-3 py-2',
              'font-mono text-xs leading-relaxed text-foreground outline-none',
              'focus-visible:ring-2 focus-visible:ring-primary/40',
            )}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder='{"success":true,"answers":[...]}'
            spellCheck={false}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            onClick={() => apply(raw)}
          >
            {t('memory.viewer.show')}
          </button>
          <button
            type="button"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            onClick={() => {
              setRaw('')
              setAnswers(null)
              setError(null)
            }}
          >
            {t('memory.viewer.clear')}
          </button>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {t('memory.viewer.parseError')}: {error}
          </p>
        )}

        {byUser.length > 0 && (
          <div className="space-y-8 pb-10">
            {byUser.map(({ userId, rows }) => (
              <section key={String(userId)} className="space-y-4">
                <h2 className="text-base font-semibold">
                  {userId === 'unknown'
                    ? t('memory.viewer.unknownUser')
                    : t('memory.viewer.user', { id: String(userId) })}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({rows.length})
                  </span>
                </h2>
                <ul className="space-y-3">
                  {rows.map((row) => {
                    const q = getMemoryQuestion(row.questionId, t)
                    const text = (row.answer ?? '').trim()
                    return (
                      <li
                        key={`${row.userId ?? 'x'}:${row.questionId}:${row.updatedAt ?? ''}`}
                        className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm"
                      >
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {q?.theme ?? row.questionId}
                        </p>
                        <p className="mt-1 text-sm font-medium leading-snug text-foreground/90">
                          {q?.text ?? row.questionId}
                        </p>
                        <div className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
                          {text.length > 0 ? (
                            text
                          ) : (
                            <span className="italic text-muted-foreground">
                              {t('memory.viewer.empty')}
                            </span>
                          )}
                        </div>
                        <p className="mt-3 text-[11px] text-muted-foreground">
                          {t('memory.viewer.updated')}:{' '}
                          {formatWhen(row.updatedAt, locale)}
                          {row.answeredAt ? (
                            <>
                              {' · '}
                              {t('memory.viewer.answered')}:{' '}
                              {formatWhen(row.answeredAt, locale)}
                            </>
                          ) : null}
                        </p>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
