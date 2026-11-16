import { ACCOUNTING_TIMEZONE } from '@/lib/timezone'
import type { TimeEntry } from '@/db/types'

export type IntervalFreshness = {
  stale: boolean
  ageHours: number
}

function zonedParts(
  d: Date,
  timeZone: string,
): { y: number; m: number; day: number; weekday: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  })
  const parts = fmt.formatToParts(d)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  return {
    y: Number(get('year')),
    m: Number(get('month')),
    day: Number(get('day')),
    weekday: weekdayMap[get('weekday')] ?? 0,
  }
}

function dayKey(d: Date, timeZone: string): string {
  const p = zonedParts(d, timeZone)
  return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

/**
 * Full business days strictly after startDay until (not including) nowDay.
 * Kept for bot digests / shared helpers; UI stale uses wall-clock hours.
 */
export function businessDaysAfterStart(
  startIso: string,
  now: Date = new Date(),
  timeZone: string = ACCOUNTING_TIMEZONE,
): number {
  const start = new Date(startIso)
  if (!Number.isFinite(start.getTime())) return 0
  const startKey = dayKey(start, timeZone)
  const nowKey = dayKey(now, timeZone)
  if (nowKey <= startKey) return 0

  const seen = new Set<string>()
  let count = 0
  const cursor = new Date(start.getTime())
  for (let i = 0; i < 800; i++) {
    cursor.setUTCHours(cursor.getUTCHours() + 12)
    const key = dayKey(cursor, timeZone)
    if (key <= startKey) continue
    if (key >= nowKey) break
    if (seen.has(key)) continue
    seen.add(key)
    const w = zonedParts(cursor, timeZone).weekday
    if (w !== 0 && w !== 6) count += 1
  }
  return count
}

function isFridayStart(
  startIso: string,
  timeZone: string = ACCOUNTING_TIMEZONE,
): boolean {
  const start = new Date(startIso)
  if (!Number.isFinite(start.getTime())) return false
  return zonedParts(start, timeZone).weekday === 5
}

export function getIntervalFreshness(
  entry: TimeEntry,
  opts?: {
    now?: Date
    staleAfterHours?: number
  },
): IntervalFreshness {
  const now = opts?.now ?? new Date()
  const staleAfterHours = opts?.staleAfterHours ?? 24
  const startMs = Date.parse(entry.start)
  const ageHours = Number.isFinite(startMs)
    ? Math.max(0, (now.getTime() - startMs) / 3_600_000)
    : 0
  // Friday → weekend/Mon: weekends don't count toward the «сутки»;
  // tag only after ≥1 business day after start (same idea as bot digest).
  let stale = Boolean(entry.end == null && ageHours > staleAfterHours)
  if (
    stale &&
    isFridayStart(entry.start) &&
    businessDaysAfterStart(entry.start, now) < 1
  ) {
    stale = false
  }
  return { stale, ageHours }
}

/** Completed entries missing title or works — red border in lists. */
export function isCompletedSparse(entry: TimeEntry, workCount: number): boolean {
  if (entry.end == null) return false
  return !entry.title?.trim() || workCount === 0
}

/** Hours of work on a still-running active (0 if paused). */
export function continuousRunHours(entry: TimeEntry, now: Date = new Date()): number {
  if (entry.pauseStartedAt) return 0
  const startMs = Date.parse(entry.start)
  if (!Number.isFinite(startMs)) return 0
  const wall = Math.max(
    0,
    (now.getTime() - startMs) / 1000 - entry.pauseTotalSeconds,
  )
  return wall / 3600
}
