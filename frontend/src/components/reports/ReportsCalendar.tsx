import { useMemo } from 'react'
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import type { ScheduleException, Task } from '@/db/types'
import { useSettings } from '@/hooks/useSettings'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

type ReportsCalendarProps = {
  year: number
  month: number
  tasks: Task[]
  selectedDate: Date | null
  onSelectDate: (date: Date) => void
}

function countByDay(tasks: Task[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const task of tasks) {
    if (!task.completedAt) continue
    const key = format(parseISO(task.completedAt), 'yyyy-MM-dd')
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return map
}

function exceptionsByDate(exceptions: ScheduleException[]): Set<string> {
  return new Set(exceptions.map((item) => item.date))
}

function isWeekend(day: Date): boolean {
  const dow = day.getDay()
  return dow === 0 || dow === 6
}

export function ReportsCalendar({
  year,
  month,
  tasks,
  selectedDate,
  onSelectDate,
}: ReportsCalendarProps) {
  const { settings } = useSettings()
  const counts = useMemo(() => countByDay(tasks), [tasks])
  const exceptionDates = useMemo(
    () => exceptionsByDate(settings.exceptions),
    [settings.exceptions],
  )

  const days = useMemo(() => {
    const monthStart = startOfMonth(new Date(year, month, 1))
    const monthEnd = endOfMonth(monthStart)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [year, month])

  return (
    <div className="rounded-xl border bg-card p-3 space-y-3">
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day, index) => (
          <div
            key={day}
            className={cn(
              'py-1 text-center text-xs font-medium',
              index >= 5 ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground',
            )}
          >
            {day}
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const count = counts.get(key) ?? 0
          const inMonth = isSameMonth(day, new Date(year, month, 1))
          const selected = selectedDate ? isSameDay(day, selectedDate) : false
          const isToday = isSameDay(day, new Date())
          const weekend = isWeekend(day)
          const hasException = exceptionDates.has(key)

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(day)}
              className={cn(
                'relative flex min-h-14 items-center justify-center rounded-lg px-1 text-sm transition-colors',
                'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                !inMonth && 'opacity-40',
                !selected && hasException && 'bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-500/25 dark:hover:bg-yellow-500/35',
                !selected && !hasException && count > 0 && inMonth && 'bg-secondary/70',
                selected && 'bg-primary text-primary-foreground hover:bg-primary/90',
                !selected && isToday && 'ring-1 ring-primary/40',
                !selected && weekend && 'text-red-500 dark:text-red-400',
                !selected && !weekend && inMonth && 'text-foreground',
              )}
            >
              <span className="leading-none font-medium">{format(day, 'd')}</span>
              {count > 0 && (
                <span
                  className={cn(
                    'absolute left-1.5 top-1.5 text-xs font-semibold leading-none',
                    selected ? 'text-primary-foreground/90' : 'text-primary',
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {selectedDate && (
        <p className="text-xs text-muted-foreground px-1 capitalize">
          Выбран: {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: ru })}
        </p>
      )}
    </div>
  )
}
