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
          ? 'border-amber-400/30 bg-gradient-to-br from-amber-50/80 via-card to-card dark:from-amber-950/30'
          : 'border-primary/20 bg-gradient-to-br from-primary/10 via-card to-[hsl(var(--brand-end)/0.1)]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-soft/70">
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
      <div className="flex flex-wrap gap-2">
        {paused ? (
          <Button size="sm" variant="secondary" className="bg-amber-500/15 hover:bg-amber-500/25" onClick={onResume}>
            <Play className="h-4 w-4 mr-1" />
            {t('timer.resume')}
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={onPause}>
            <Pause className="h-4 w-4 mr-1" />
            {t('timer.pause')}
          </Button>
        )}
        <Button size="sm" onClick={onComplete}>
          <Check className="h-4 w-4 mr-1" />
          {t('timer.complete')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto text-destructive hover:text-destructive"
          onClick={onDelete}
          aria-label={t('timer.deleteAria')}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
