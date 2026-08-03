import { addDays, format, setHours, setMinutes, setSeconds, startOfDay } from 'date-fns'
import type { DaySchedule, Settings, Weekday } from '@/db/types'

const DAY_BY_INDEX: Weekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

function parseHm(hm: string): { hours: number; minutes: number } {
  const [hours, minutes] = hm.split(':').map(Number)
  return { hours: hours || 0, minutes: minutes || 0 }
}

function applyHm(date: Date, hm: string): Date {
  const { hours, minutes } = parseHm(hm)
  return setSeconds(setMinutes(setHours(date, hours), minutes), 0)
}

function getScheduleForDate(date: Date, settings: Settings): DaySchedule | null {
  const dateKey = format(date, 'yyyy-MM-dd')
  const exception = settings.exceptions.find((item) => item.date === dateKey)

  if (exception) {
    if (exception.isOff) return null
    return {
      enabled: true,
      start: exception.start ?? '09:00',
      end: exception.end ?? '18:00',
    }
  }

  const weekday = DAY_BY_INDEX[date.getDay()]
  const schedule = settings.workSchedule[weekday]
  if (!schedule.enabled) return null
  return schedule
}

export function isWithinWorkTime(now: Date, settings: Settings): boolean {
  const schedule = getScheduleForDate(now, settings)
  if (!schedule) return false

  const day = startOfDay(now)
  const start = applyHm(day, schedule.start)
  const end = applyHm(day, schedule.end)
  return now >= start && now < end
}

/** Nearest work-time moment at or after `from` (inclusive start of a work window). */
export function nextWorkTime(from: Date, settings: Settings): Date {
  if (isWithinWorkTime(from, settings)) return from

  for (let i = 0; i < 14; i += 1) {
    const day = addDays(startOfDay(from), i)
    const schedule = getScheduleForDate(day, settings)
    if (!schedule) continue

    const start = applyHm(day, schedule.start)
    const end = applyHm(day, schedule.end)

    if (i === 0) {
      if (from < start) return start
      if (from >= end) continue
      return from
    }

    return start
  }

  // Fallback: tomorrow 09:00
  return applyHm(addDays(startOfDay(from), 1), '09:00')
}
