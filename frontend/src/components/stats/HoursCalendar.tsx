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
import { formatHoursMinutes } from '@/utils/timeDisplay'

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

function formatHoursShort(seconds: number): string {
  if (seconds <= 0) return ''
  return formatHoursMinutes(seconds)
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
    <div className="surface-card p-3 space-y-3">
      <div
        className="grid grid-cols-7 gap-x-0 gap-y-1"
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
          const hoursLabel = formatHoursShort(seconds)
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
              ? Math.max(0.12, seconds / maxSeconds)
              : 0
          const showHeat =
            !isSingle && !inActiveRange && intensity > 0
          const weekendRed =
            weekend && !isSingle && !inActiveRange && intensity === 0
          const todayText =
            isToday && !isSingle && !isRangeEndpoint

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
                trackRoundLeft && 'rounded-l-xl',
                trackRoundRight && 'rounded-r-xl',
                showHeat && 'rounded-xl',
                weekendRed && 'text-destructive',
                !weekendRed &&
                  !isSingle &&
                  !isRangeEndpoint &&
                  inMonth &&
                  (isRangeMiddle ? 'text-primary-soft' : 'text-foreground'),
              )}
              style={
                showHeat
                  ? { backgroundColor: `hsl(var(--primary) / ${0.08 + intensity * 0.42})` }
                  : undefined
              }
            >
              <span
                className={cn(
                  'relative z-[1] flex h-full min-h-14 w-full flex-col items-center justify-center rounded-xl border-2 border-transparent px-0.5',
                  (isSingle || isRangeEndpoint) &&
                    'bg-primary text-primary-foreground',
                  // Outline only on hover, never on solid endpoints/single.
                  isHover && !(isSingle || isRangeEndpoint) && 'border-primary',
                )}
              >
                {hoursLabel && (
                  <span
                    className={cn(
                      'absolute inset-x-0 top-1 text-center text-[10px] font-semibold leading-none tabular-nums',
                      isSingle || isRangeEndpoint
                        ? 'text-primary-foreground/90'
                        : 'text-primary-soft',
                    )}
                  >
                    {hoursLabel}
                  </span>
                )}
                <span
                  className={cn(
                    'leading-none font-medium',
                    todayText && 'text-primary',
                  )}
                >
                  {format(day, 'd')}
                </span>
              </span>
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-2 px-1 text-[10px] text-muted-foreground">
        <span>{t('stats.heatmap.less')}</span>
        <div className="flex gap-0.5">
          {[0.15, 0.3, 0.5, 0.7, 0.95].map((level) => (
            <span
              key={level}
              className="h-3 w-3 rounded-sm"
              style={{
                backgroundColor: `hsl(var(--primary) / ${0.08 + level * 0.42})`,
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
