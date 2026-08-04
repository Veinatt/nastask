import { useMemo } from 'react'
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

function formatHoursShort(seconds: number): string {
  const h = seconds / 3600
  if (h <= 0) return ''
  if (h < 10) return h.toFixed(1).replace(/\.0$/, '')
  return String(Math.round(h))
}

function isWeekend(day: Date): boolean {
  const dow = day.getDay()
  return dow === 0 || dow === 6
}

function inRange(key: string, from: string | null, to: string | null): boolean {
  if (!from || !to) return false
  const lo = from <= to ? from : to
  const hi = from <= to ? to : from
  return key >= lo && key <= hi
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

  const days = useMemo(() => {
    const monthStart = startOfMonth(new Date(year, month - 1, 1))
    const monthEnd = endOfMonth(monthStart)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [year, month])

  const selectedLabel = selectedDate
    ? format(new Date(`${selectedDate}T12:00:00`), 'EEEE, d MMMM yyyy', {
        locale: dateFnsLocale,
      })
    : rangeFrom && rangeTo
      ? `${rangeFrom} — ${rangeTo}`
      : null

  return (
    <div className="surface-panel p-3 space-y-3">
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_KEYS.map((key, index) => (
          <div
            key={key}
            className={cn(
              'py-1 text-center text-xs font-medium',
              index >= 5 ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground',
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
          const selected = selectedDate === key
          const ranged = inRange(key, rangeFrom, rangeTo)
          const isToday = isSameDay(day, new Date())
          const weekend = isWeekend(day)

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(key)}
              className={cn(
                'relative flex min-h-14 items-center justify-center rounded-lg px-1 text-sm transition-colors',
                'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                !inMonth && 'opacity-40',
                !selected && !ranged && seconds > 0 && inMonth && 'bg-primary/8',
                ranged && !selected && 'bg-primary/15',
                selected && 'bg-primary text-primary-foreground hover:bg-primary/90',
                !selected && isToday && 'ring-1 ring-primary/40',
                !selected && weekend && 'text-red-500 dark:text-red-400',
                !selected && !weekend && inMonth && 'text-foreground',
              )}
            >
              <span className="leading-none font-medium">{format(day, 'd')}</span>
              {hoursLabel && (
                <span
                  className={cn(
                    'absolute left-1 top-1 text-[10px] font-semibold leading-none tabular-nums',
                    selected ? 'text-primary-foreground/90' : 'text-primary-soft',
                  )}
                >
                  {hoursLabel}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {selectedLabel && (
        <p className="text-xs text-muted-foreground px-1 capitalize">{selectedLabel}</p>
      )}
    </div>
  )
}
