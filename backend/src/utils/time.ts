import type { ReminderInterval } from '../types'
import { REMINDER_INTERVALS } from '../types'

/** Current Unix time in seconds */
export function nowSec(): number {
  return Math.floor(Date.now() / 1000)
}

export function intervalToSeconds(interval: ReminderInterval): number {
  switch (interval) {
    case '3m':
      return 3 * 60
    case '15m':
      return 15 * 60
    case '30m':
      return 30 * 60
    case '1h':
      return 60 * 60
    case '2h':
      return 2 * 60 * 60
    case '3h':
      return 3 * 60 * 60
    case '4h':
      return 4 * 60 * 60
    case 'daily':
      return 24 * 60 * 60
  }
}

export function isReminderInterval(value: unknown): value is ReminderInterval {
  return typeof value === 'string' && (REMINDER_INTERVALS as string[]).includes(value)
}

/**
 * Accepts ISO string, unix seconds, or unix milliseconds.
 * Returns unix seconds or null.
 */
export function toUnixSeconds(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null

  if (typeof value === 'number' && Number.isFinite(value)) {
    // Heuristic: ms timestamps are > year 2100 in seconds (~4e9)
    if (value > 1e12) return Math.floor(value / 1000)
    return Math.floor(value)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (/^\d+$/.test(trimmed)) {
      return toUnixSeconds(Number(trimmed))
    }
    const ms = Date.parse(trimmed)
    if (Number.isNaN(ms)) return null
    return Math.floor(ms / 1000)
  }

  return null
}

export function parseHm(hm: string): { hours: number; minutes: number } {
  const [h, m] = hm.split(':').map((part) => Number(part))
  return { hours: h || 0, minutes: m || 0 }
}
