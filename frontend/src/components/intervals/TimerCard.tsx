import { Pause, Play, Check, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/hooks/useI18n'
import { formatDuration, formatIntervalWhen } from '@/utils/timeDisplay'
import type { ActiveIntervalView } from '@/hooks/useActiveIntervals'
import { cn } from '@/lib/utils'

type Props = {
  entry: ActiveIntervalView
  onPause: () => void
  onResume: () => void
  onComplete: () => void
  onDelete: () => void
}

export function TimerCard({ entry, onPause, onResume, onComplete, onDelete }: Props) {
  const { t } = useI18n()
  const paused = Boolean(entry.pauseStartedAt)

  return (
    <div
      className={cn(
        'animate-fade-up rounded-2xl border p-4 sm:p-5 space-y-4 shadow-sm transition-[colors,box-shadow,border-color] duration-300 ease-[var(--ease-out-soft)]',
        paused
          ? 'border-amber-400/35 bg-amber-50/90 dark:bg-amber-950/35'
          : 'border-emerald-500/40 bg-emerald-50/90 dark:bg-emerald-950/35',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p
            className={cn(
              'text-xs font-semibold uppercase tracking-wide',
              paused ? 'text-amber-700/80 dark:text-amber-300/80' : 'text-emerald-700/80 dark:text-emerald-300/80',
            )}
          >
            {paused ? t('timer.paused') : t('timer.running')}
          </p>
          <p className="text-sm text-muted-foreground truncate">
            {formatIntervalWhen(entry.start)}
          </p>
        </div>
        <div className="text-3xl sm:text-4xl font-semibold tabular-nums tracking-tight text-foreground">
          {formatDuration(entry.displaySeconds)}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap gap-2">
          {paused ? (
            <Button size="sm" variant="secondary" className="bg-amber-500/15 hover:bg-amber-500/25" onClick={onResume}>
              <Play className="h-4 w-4 mr-1" />
              {t('timer.resume')}
            </Button>
          ) : (
            <Button size="sm" variant="secondary" className="bg-emerald-500/15 hover:bg-emerald-500/25" onClick={onPause}>
              <Pause className="h-4 w-4 mr-1" />
              {t('timer.pause')}
            </Button>
          )}
          <Button
            size="sm"
            className="bg-emerald-600 text-white hover:bg-emerald-600/90"
            onClick={onComplete}
          >
            <Check className="h-4 w-4 mr-1" />
            {t('timer.complete')}
          </Button>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0 text-destructive hover:text-destructive"
          onClick={onDelete}
          aria-label={t('timer.deleteAria')}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
