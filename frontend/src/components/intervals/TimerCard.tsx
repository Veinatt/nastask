import { Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusChip } from '@/components/ui/status-chip'
import { SwipeToDelete } from '@/components/ui/swipe-to-delete'
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

type Props = {
  entry: ActiveIntervalView
  onPause: () => void
  onResume: () => void
  onComplete: () => void
  onDelete: () => void
  onEdit?: () => void
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

  const workCount = entry.workCount ?? 0
  const fill = getIntervalFillState(entry, workCount)
  const freshness = getIntervalFreshness(entry)
  const overLimit = entry.displaySeconds > 8 * 3600
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

  return (
    <SwipeToDelete
      className="animate-fade-up h-full !rounded-[31px]"
      onDelete={onDelete}
      deleteAriaLabel={t('timer.deleteAria')}
      onComplete={onComplete}
      completeAriaLabel={t('timer.complete')}
      onTap={onEdit}
      contentClassName={cn(
        'h-full select-none !rounded-[31px]',
        paused ? 'surface-card' : 'surface-panel surface-panel-running',
        onEdit && 'cursor-pointer',
      )}
    >
      <div
        title={t('timer.swipeHint')}
        className="flex h-full flex-col gap-5 p-3 pl-4 outline-none"
      >
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p
              className={cn(
                'flex min-w-0 items-center gap-1.5 text-2xl lowercase tracking-tight',
                paused
                  ? 'font-normal text-primary-soft'
                  : 'font-medium text-primary-foreground dark:text-foreground',
              )}
            >
              <span className="min-w-0 truncate">{title}</span>
            </p>
            <StatusChip
              label={fillSummary}
              tone={fill.needsWorks ? 'warn' : 'ok'}
              className={cn(
                'max-w-[45%] shrink-0',
                // Running fill — soft chip; dark uses foreground (not harsh white)
                !paused &&
                  'bg-[hsl(var(--primary-foreground)/0.22)] text-primary-foreground dark:bg-foreground/15 dark:text-foreground',
              )}
            />
          </div>
          <p
            className={cn(
              'flex min-w-0 items-center gap-1.5 text-xs tabular-nums',
              paused
                ? 'text-primary-soft'
                : 'text-primary-foreground/90 dark:text-foreground/80',
            )}
          >
            <span className="min-w-0 truncate">
              {formatIntervalWhen(entry.start)}
            </span>
            {freshness.stale ? (
              <span
                className={cn(
                  'h-1.5 w-1.5 shrink-0 rounded-full',
                  paused ? 'bg-destructive' : 'bg-primary-foreground dark:bg-foreground',
                )}
                style={{ animation: 'tag-dot-pulse 2.4s ease-in-out infinite' }}
                title={t('timer.tagStale')}
                aria-label={t('timer.tagStale')}
              />
            ) : null}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-0.5">
          <div className="flex min-w-0 items-center gap-2">
            <p
              className={cn(
                'text-5xl font-medium leading-none tabular-nums tracking-tight',
                paused
                  ? 'text-foreground'
                  : 'text-primary-foreground dark:text-foreground',
              )}
            >
              {formatDuration(entry.displaySeconds)}
            </p>
            {overLimit ? (
              <span
                className={cn(
                  'h-2 w-2 shrink-0 self-center rounded-full',
                  paused ? 'bg-destructive' : 'bg-primary-foreground dark:bg-foreground',
                )}
                style={{ animation: 'tag-dot-pulse 2.4s ease-in-out infinite' }}
                title={t('timer.overLimit')}
                aria-label={t('timer.overLimit')}
              />
            ) : null}
          </div>
          <Button
            type="button"
            size="icon"
            className={cn(
              'h-11 w-11 shrink-0 rounded-full border-0 sm:h-12 sm:w-12',
              '[&_svg]:!h-5 [&_svg]:!w-5',
              paused
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-white text-[hsl(240_4%_24%)] hover:bg-white/90',
            )}
            onClick={paused ? onResume : onPause}
            aria-label={paused ? t('timer.resume') : t('timer.pause')}
            title={paused ? t('timer.resume') : t('timer.pause')}
          >
            {paused ? (
              <Play fill="currentColor" strokeWidth={0} />
            ) : (
              <Pause fill="currentColor" strokeWidth={0} />
            )}
          </Button>
        </div>
      </div>
    </SwipeToDelete>
  )
}
