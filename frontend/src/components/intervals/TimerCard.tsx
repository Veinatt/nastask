import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { Pause, Play, Check, StickyNote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/hooks/useI18n'
import { formatDuration, formatIntervalWhen } from '@/utils/timeDisplay'
import {
  formatFillSummary,
  getIntervalFillState,
  slavicPluralForm,
} from '@/utils/intervalFill'
import { getIntervalFreshness } from '@/utils/intervalFreshness'
import type { ActiveIntervalView } from '@/hooks/useActiveIntervals'
import { cn } from '@/lib/utils'

const LONG_PRESS_MS = 550

type Props = {
  entry: ActiveIntervalView
  onPause: () => void
  onResume: () => void
  onComplete: () => void
  onDelete: () => void
  onEdit?: () => void
}

type TagTone = 'running' | 'paused' | 'stale'

function Tag({ tone, label }: { tone: TagTone; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium tracking-normal',
        tone === 'stale' &&
          'bg-[hsl(0_72%_48%/0.12)] text-red-700 dark:text-red-300',
        tone === 'paused' &&
          'bg-[hsl(38_92%_50%/0.14)] text-amber-800 dark:text-amber-200',
        tone === 'running' &&
          'bg-[hsl(152_60%_40%/0.14)] text-emerald-800 dark:text-emerald-200',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full',
          tone === 'stale' && 'bg-red-500',
          tone === 'paused' && 'bg-amber-500',
          tone === 'running' && 'bg-emerald-500',
        )}
        aria-hidden
      />
      {label}
    </span>
  )
}

export function TimerCard({
  entry,
  onPause,
  onResume,
  onComplete,
  onDelete,
  onEdit,
}: Props) {
  const { t } = useI18n()
  const paused = Boolean(entry.pauseStartedAt)
  const title = entry.title?.trim() || t('stats.untitled')
  const pressTimerRef = useRef<number | null>(null)
  const longPressFiredRef = useRef(false)

  const workCount = entry.workCount ?? 0
  const fill = getIntervalFillState(entry, workCount)
  const freshness = getIntervalFreshness(entry)
  const fillSummary = formatFillSummary(fill, {
    empty: t('fill.empty'),
    works: (n) => {
      const form = slavicPluralForm(n)
      const key =
        form === 'one'
          ? 'fill.worksOne'
          : form === 'few'
            ? 'fill.worksFew'
            : 'fill.worksMany'
      return t(key, { n: String(n) })
    },
  })

  const clearPress = () => {
    if (pressTimerRef.current != null) {
      window.clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
  }

  const startPress = (ev: ReactPointerEvent) => {
    const target = ev.target as HTMLElement
    if (target.closest('button')) return
    longPressFiredRef.current = false
    clearPress()
    pressTimerRef.current = window.setTimeout(() => {
      longPressFiredRef.current = true
      pressTimerRef.current = null
      onDelete()
    }, LONG_PRESS_MS)
  }

  return (
    <div
      role={onEdit ? 'button' : undefined}
      tabIndex={onEdit ? 0 : undefined}
      title={t('timer.longPressDelete')}
      onPointerDown={startPress}
      onPointerUp={clearPress}
      onPointerLeave={clearPress}
      onPointerCancel={clearPress}
      onContextMenu={(ev) => {
        const target = ev.target as HTMLElement
        if (!target.closest('button')) ev.preventDefault()
      }}
      onClick={
        onEdit
          ? (ev) => {
              const target = ev.target as HTMLElement
              if (target.closest('button')) return
              if (longPressFiredRef.current) {
                longPressFiredRef.current = false
                return
              }
              onEdit()
            }
          : undefined
      }
      onKeyDown={
        onEdit
          ? (ev) => {
              if (ev.key === 'Enter' || ev.key === ' ') {
                const target = ev.target as HTMLElement
                if (target.closest('button')) return
                ev.preventDefault()
                onEdit()
              }
            }
          : undefined
      }
      className={cn(
        'surface-panel animate-fade-up flex h-full flex-col gap-4 p-5 select-none',
        onEdit && 'cursor-pointer hover:bg-[hsl(var(--foreground)/0.04)]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="flex min-w-0 items-center gap-1.5 text-[15px] font-semibold tracking-tight text-foreground">
            <span className="min-w-0 truncate">{title}</span>
            {fill.hasNotes ? (
              <StickyNote
                className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                aria-label={t('list.notesIndicator')}
              />
            ) : null}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {formatIntervalWhen(entry.start)}
          </p>
          <p
            className={cn(
              'min-h-[1rem] truncate text-xs',
              fill.needsWorks
                ? 'font-medium text-destructive'
                : 'text-muted-foreground',
            )}
          >
            {fillSummary}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Tag
            tone={paused ? 'paused' : 'running'}
            label={paused ? t('timer.tagPaused') : t('timer.tagRunning')}
          />
          {freshness.stale && <Tag tone="stale" label={t('timer.tagStale')} />}
        </div>
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 pt-1">
        <p
          className={cn(
            'text-4xl font-bold tabular-nums tracking-tight sm:text-5xl',
            entry.displaySeconds > 8 * 3600
              ? 'text-destructive'
              : 'text-foreground',
          )}
        >
          {formatDuration(entry.displaySeconds)}
        </p>
        <div className="flex shrink-0 items-center gap-2.5">
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="h-10 w-10 rounded-full"
            onClick={paused ? onResume : onPause}
            aria-label={paused ? t('timer.resume') : t('timer.pause')}
            title={paused ? t('timer.resume') : t('timer.pause')}
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="default"
            className="h-10 w-10 rounded-full"
            onClick={onComplete}
            aria-label={t('timer.complete')}
            title={t('timer.complete')}
          >
            <Check className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
