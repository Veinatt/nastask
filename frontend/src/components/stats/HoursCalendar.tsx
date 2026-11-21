import { useMemo, useState } from 'react'
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { useI18n } from '@/hooks/useI18n'
import { cn } from '@/lib/utils'
const WEEKDAY_KEYS = [
  'weekday.mon',
  'weekday.tue',
  'weekday.wed',
  'weekday.thu',
  'weekday.fri',
  'weekday.sat',
  'weekday.sun',
] as const

type Props = {
  year: number
  month: number
  /** YYYY-MM-DD → total seconds that day */
  hoursByDay: Map<string, number>
  selectedDate: string | null
  rangeFrom: string | null
  rangeTo: string | null
  onSelectDate: (dateKey: string) => void
}

function formatHoursShort(seconds: number, hoursSuffix: string): string {
  if (seconds <= 0) return ''
  const hours = Math.floor(seconds / 3600)
  if (hours < 1) return `<1${hoursSuffix}`
  return `${hours}${hoursSuffix}`
}

function isWeekend(day: Date): boolean {
  const dow = day.getDay()
  return dow === 0 || dow === 6
}

function rangeBounds(
  from: string | null,
  to: string | null,
): { lo: string; hi: string } | null {
  if (!from || !to) return null
  return from <= to ? { lo: from, hi: to } : { lo: to, hi: from }
}

function inBounds(key: string, bounds: { lo: string; hi: string } | null): boolean {
  if (!bounds) return false
  return key >= bounds.lo && key <= bounds.hi
}

export function HoursCalendar({
  year,
  month,
  hoursByDay,
  selectedDate,
  rangeFrom,
  rangeTo,
  onSelectDate,
}: Props) {
  const { t, dateFnsLocale } = useI18n()
  const [hoverDay, setHoverDay] = useState<string | null>(null)
  /** Live preview end while picking the second range date. */
  const previewTo = rangeFrom != null && rangeTo == null ? hoverDay : null
  const activeBounds =
    rangeBounds(rangeFrom, rangeTo) ??
    rangeBounds(rangeFrom, previewTo) ??
    (rangeFrom != null ? { lo: rangeFrom, hi: rangeFrom } : null)

  const days = useMemo(() => {
    const monthStart = startOfMonth(new Date(year, month - 1, 1))
    const monthEnd = endOfMonth(monthStart)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [year, month])

  const maxSeconds = useMemo(() => {
    let max = 0
    for (const day of days) {
      if (!isSameMonth(day, new Date(year, month - 1, 1))) continue
      const key = format(day, 'yyyy-MM-dd')
      max = Math.max(max, hoursByDay.get(key) ?? 0)
    }
    return max
  }, [days, hoursByDay, year, month])

  const selectedLabel = selectedDate
    ? format(new Date(`${selectedDate}T12:00:00`), 'EEEE, d MMMM yyyy', {
        locale: dateFnsLocale,
      })
    : rangeFrom && rangeTo
      ? `${rangeFrom} — ${rangeTo}`
      : null

  return (
    <div className="surface-card min-w-0 space-y-3 overflow-hidden p-3">
      <div
        className="grid min-w-0 grid-cols-7 gap-x-0 gap-y-1"
        onPointerLeave={() => setHoverDay(null)}
      >
        {WEEKDAY_KEYS.map((key, index) => (
          <div
            key={key}
            className={cn(
              'py-1 text-center text-xs font-medium',
              index >= 5 ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {t(key)}
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const seconds = hoursByDay.get(key) ?? 0
          const hoursLabel = formatHoursShort(seconds, t('stats.hoursAbbrev'))
          const inMonth = isSameMonth(day, new Date(year, month - 1, 1))
          const weekend = isWeekend(day)
          const isToday = isSameDay(day, new Date())
          const isHover = hoverDay === key
          const isSingle = selectedDate === key

          const inActiveRange = inBounds(key, activeBounds)
          const isRangeStart = activeBounds != null && key === activeBounds.lo
          const isRangeEnd = activeBounds != null && key === activeBounds.hi
          const isRangeEndpoint = isRangeStart || isRangeEnd
          const isRangeMiddle = inActiveRange && !isRangeEndpoint
          // Mon=0 … Sun=6 for week-edge rounding of the track.
          const weekIndex = (day.getDay() + 6) % 7
          const trackRoundLeft = isRangeStart || (inActiveRange && weekIndex === 0)
          const trackRoundRight = isRangeEnd || (inActiveRange && weekIndex === 6)

          const intensity =
            inMonth && maxSeconds > 0 && seconds > 0
              ? Math.max(0.2, seconds / maxSeconds)
              : 0
          const hasWork = intensity > 0
          // intensity is already 0.2…1 relative to the month max → solid at peak
          const workDotAlpha = hasWork ? intensity : 0
          const weekendRed =
            weekend && !isSingle && !inActiveRange && !hasWork
          const todayText =
            isToday && !isSingle && !isRangeEndpoint
          const onSolid = isSingle || isRangeEndpoint

          return (
            <button
              key={key}
              type="button"
              title={hoursLabel || undefined}
              onClick={() => onSelectDate(key)}
              onPointerEnter={() => setHoverDay(key)}
              className={cn(
                'relative flex min-h-14 items-center justify-center px-0.5 text-sm transition-colors duration-[280ms] ease-[var(--ease-out-soft)]',
                'focus-visible:outline-none focus-visible:ring-0',
                !inMonth && 'opacity-40',
                // Continuous range track (soft fill).
                inActiveRange && 'bg-primary/15',
                trackRoundLeft && 'rounded-l-lg sm:rounded-l-[31px]',
                trackRoundRight && 'rounded-r-lg sm:rounded-r-[31px]',
                weekendRed && 'text-destructive',
                !weekendRed &&
                  !isSingle &&
                  !isRangeEndpoint &&
                  inMonth &&
                  (isRangeMiddle ? 'text-primary-soft' : 'text-foreground'),
              )}
            >
              <span
                className={cn(
                  'relative z-[1] flex h-full min-h-14 w-full items-center justify-center rounded-lg border-2 border-transparent px-0.5 sm:rounded-[31px]',
                  onSolid && 'bg-primary text-primary-foreground',
                  // Outline only on hover, never on solid endpoints/single.
                  isHover && !onSolid && 'border-primary',
                )}
              >
                {hoursLabel ? (
                  <span
                    className={cn(
                      'absolute inset-x-0 top-1 text-center text-[10px] font-semibold leading-none tabular-nums',
                      onSolid ? 'text-primary-foreground/90' : 'text-primary-soft',
                    )}
                  >
                    {hoursLabel}
                  </span>
                ) : null}
                <span
                  className={cn(
                    'leading-none font-medium',
                    todayText && 'text-primary',
                  )}
                >
                  {format(day, 'd')}
                </span>
                {hasWork ? (
                  <span
                    className="absolute bottom-1.5 h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: onSolid
                        ? `hsl(var(--primary-foreground) / ${Math.min(1, 0.35 + intensity * 0.65)})`
                        : `hsl(var(--primary) / ${workDotAlpha})`,
                    }}
                    aria-hidden
                  />
                ) : null}
              </span>
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-2 px-1 text-[10px] text-muted-foreground">
        <span>{t('stats.heatmap.less')}</span>
        <div className="flex items-center gap-1">
          {[0.2, 0.4, 0.6, 0.8, 1].map((level) => (
            <span
              key={level}
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: `hsl(var(--primary) / ${level})`,
              }}
            />
          ))}
        </div>
        <span>{t('stats.heatmap.more')}</span>
      </div>
      {selectedLabel && (
        <p className="text-xs text-muted-foreground px-1 capitalize">{selectedLabel}</p>
      )}
    </div>
  )
}
