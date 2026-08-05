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
        // Explicit alpha colors — avoid Tailwind color-mix + light/dark class fights
        // (light bg-amber-50 was winning in dark theme → white timer on cream)
        paused
          ? 'border-[rgb(251_191_36_/0.45)] bg-[rgb(251_191_36_/0.14)]'
          : 'border-[rgb(16_185_129_/0.45)] bg-[rgb(16_185_129_/0.14)]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p
            className={cn(
              'text-xs font-semibold uppercase tracking-wide',
              paused
                ? 'text-[rgb(217_119_6)] dark:text-[rgb(252_211_77)]'
                : 'text-[rgb(5_150_105)] dark:text-[rgb(110_231_183)]',
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
          <Button
            size="sm"
            variant="secondary"
            className={cn(
              paused
                ? 'bg-[rgb(251_191_36_/0.22)] text-[rgb(120_53_15)] hover:bg-[rgb(251_191_36_/0.32)] dark:text-[rgb(254_243_199)]'
                : 'bg-[rgb(16_185_129_/0.22)] text-[rgb(6_78_59)] hover:bg-[rgb(16_185_129_/0.32)] dark:text-[rgb(209_250_229)]',
            )}
            onClick={paused ? onResume : onPause}
            aria-label={paused ? t('timer.resume') : t('timer.pause')}
          >
            {paused ? <Play className="h-4 w-4 mr-1" /> : <Pause className="h-4 w-4 mr-1" />}
            {t('timer.pause')}
          </Button>
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
