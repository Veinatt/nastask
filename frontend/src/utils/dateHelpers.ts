import {
  addDays,
  addHours,
  addMinutes,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import type { ReminderInterval, Settings, Task } from '@/db/types'
import { isWithinWorkTime, nextWorkTime } from './workTime'

export const REMINDER_INTERVALS: ReminderInterval[] = [
  '15m',
  '30m',
  '1h',
  '2h',
  '3h',
  '4h',
  'daily',
]

export const REMINDER_INTERVAL_LABELS: Record<ReminderInterval, string> = {
  '15m': '15 минут',
  '30m': '30 минут',
  '1h': '1 час',
  '2h': '2 часа',
  '3h': '3 часа',
  '4h': '4 часа',
  daily: 'Раз в сутки',
}

export function intervalToMs(interval: ReminderInterval): number {
  switch (interval) {
    case '15m':
      return 15 * 60 * 1000
    case '30m':
      return 30 * 60 * 1000
    case '1h':
      return 60 * 60 * 1000
    case '2h':
      return 2 * 60 * 60 * 1000
    case '3h':
      return 3 * 60 * 60 * 1000
    case '4h':
      return 4 * 60 * 60 * 1000
    case 'daily':
      return 24 * 60 * 60 * 1000
  }
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), 'dd.MM.yyyy HH:mm', { locale: ru })
  } catch {
    return '—'
  }
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), 'dd.MM.yyyy', { locale: ru })
  } catch {
    return '—'
  }
}

export function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    return format(parseISO(iso), "yyyy-MM-dd'T'HH:mm")
  } catch {
    return ''
  }
}

export function fromLocalInputValue(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

/**
 * Start reminder: once when now >= startTime - leadTime and still before/at start.
 * Only during work hours (or deferred — caller checks work time separately).
 */
export function shouldSendStartReminder(
  task: Task,
  settings: Settings,
  now: Date = new Date(),
): boolean {
  if (task.status !== 'active' || task.startNotified || !task.startTime) return false
  if (!isWithinWorkTime(now, settings)) return false

  const start = parseISO(task.startTime)
  const notifyAt = addHours(start, -settings.reminderLeadTime)

  return !isBefore(now, notifyAt) && !isAfter(now, addMinutes(start, 5))
}

/**
 * Close reminder: periodic while task is active, respecting interval and work hours.
 * Anchor: lastReminderSent or startTime or createdAt.
 */
export function shouldSendCloseReminder(
  task: Task,
  settings: Settings,
  now: Date = new Date(),
): boolean {
  if (task.status !== 'active') return false
  if (!isWithinWorkTime(now, settings)) return false

  const intervalMs = intervalToMs(task.reminderInterval)
  const anchorIso = task.lastReminderSent ?? task.startTime ?? task.createdAt
  const anchor = parseISO(anchorIso)
  const dueAt = new Date(anchor.getTime() + intervalMs)

  // If dueAt falls outside work time, treat next work time as due
  const effectiveDue = isWithinWorkTime(dueAt, settings) ? dueAt : nextWorkTime(dueAt, settings)

  return !isBefore(now, effectiveDue)
}

export function shouldSendNewTaskReminder(
  settings: Settings,
  now: Date = new Date(),
): boolean {
  if (!settings.newTaskReminder.enabled) return false
  if (!isWithinWorkTime(now, settings)) return false

  const intervalMs = intervalToMs(settings.newTaskReminder.interval)

  if (!settings.lastNewTaskReminderSent) {
    const dayStart = getWorkDayStart(now, settings)
    if (!dayStart) return true
    const offset = settings.newTaskReminder.firstOffsetMinutes ?? 0
    const firstAt = addMinutes(dayStart, offset)
    return !isBefore(now, firstAt)
  }

  const last = parseISO(settings.lastNewTaskReminderSent)
  const dueAt = new Date(last.getTime() + intervalMs)
  const effectiveDue = isWithinWorkTime(dueAt, settings) ? dueAt : nextWorkTime(dueAt, settings)
  return !isBefore(now, effectiveDue)
}

function getWorkDayStart(now: Date, settings: Settings): Date | null {
  if (!isWithinWorkTime(now, settings)) return null
  const dateKey = format(now, 'yyyy-MM-dd')
  const exception = settings.exceptions.find((item) => item.date === dateKey)
  if (exception?.isOff) return null

  const startHm = exception?.start ?? getTodaySchedule(now, settings)?.start
  if (!startHm) return null

  const [h, m] = startHm.split(':').map(Number)
  const start = startOfDay(now)
  start.setHours(h, m, 0, 0)
  return start
}

function getTodaySchedule(now: Date, settings: Settings) {
  const map = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ] as const
  const key = map[now.getDay()]
  return settings.workSchedule[key]
}

export function monthLabel(year: number, month: number): string {
  return format(new Date(year, month, 1), 'LLLL yyyy', { locale: ru })
}

export function addMonthsSafe(year: number, month: number, delta: number) {
  const d = addDays(new Date(year, month, 1), 0)
  d.setMonth(d.getMonth() + delta)
  return { year: d.getFullYear(), month: d.getMonth() }
}
