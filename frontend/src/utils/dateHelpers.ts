import { addDays, format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { ReminderInterval } from '@/db/types'

export const REMINDER_INTERVALS: ReminderInterval[] = [
  '3m',
  '15m',
  '30m',
  '1h',
  '2h',
  '3h',
  '4h',
  'daily',
]

export const REMINDER_INTERVAL_LABELS: Record<ReminderInterval, string> = {
  '3m': '3 минуты (тест)',
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
    case '3m':
      return 3 * 60 * 1000
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

export function monthLabel(year: number, month: number): string {
  return format(new Date(year, month, 1), 'LLLL yyyy', { locale: ru })
}

export function addMonthsSafe(year: number, month: number, delta: number) {
  const d = addDays(new Date(year, month, 1), 0)
  d.setMonth(d.getMonth() + delta)
  return { year: d.getFullYear(), month: d.getMonth() }
}
