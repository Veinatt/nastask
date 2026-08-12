import { t } from '@/lib/i18n'
import { ACCOUNTING_TIMEZONE } from '@/lib/timezone'
import type { TimeEntry } from '@/db/types'

export function secondsBetween(startIso: string, endIso: string): number {
  const a = Date.parse(startIso)
  const b = Date.parse(endIso)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0
  return Math.max(0, Math.floor((b - a) / 1000))
}

/** Working seconds for UI (same model as server liveTotalSeconds). */
export function computeLiveSeconds(entry: TimeEntry, at = new Date()): number {
  if (entry.end) return entry.totalSeconds
  if (entry.pauseStartedAt) return entry.totalSeconds
  const wall = secondsBetween(entry.start, at.toISOString())
  return Math.max(0, wall - entry.pauseTotalSeconds)
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }
  return `${m}:${String(sec).padStart(2, '0')}`
}

/** Duration as чч:мм (e.g. 06:42). Hours grow beyond 99 without truncation. */
export function formatHoursMinutes(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Same as formatHoursMinutes, but input is decimal hours (e.g. 6.7). */
export function formatDecimalHoursAsClock(hours: number): string {
  if (!Number.isFinite(hours)) return '00:00'
  return formatHoursMinutes(hours * 3600)
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Local calendar date as dd.mm (intervals — no year). */
export function formatDateDdMm(d: Date): string {
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`
}

/** Local time as HH:mm */
export function formatTimeHhMm(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export function formatIntervalWhen(
  startIso: string,
  opts?: { withDate?: boolean },
): string {
  const d = new Date(startIso)
  if (!Number.isFinite(d.getTime())) return '—'
  const withDate = opts?.withDate ?? true
  const time = formatTimeHhMm(d)
  if (!withDate) return time
  return `${formatDateDdMm(d)}, ${time}`
}

/** Parts for UI with a visual delimiter between date and time range. */
export type TimeRangeParts = {
  dateLabel: string | null
  timeLabel: string
  crossDay: boolean
}

export function getTimeRangeParts(
  startIso: string,
  endIso: string | null | undefined,
): TimeRangeParts {
  const start = new Date(startIso)
  if (!Number.isFinite(start.getTime())) {
    return { dateLabel: null, timeLabel: '—', crossDay: false }
  }
  const startPart = formatTimeHhMm(start)
  if (!endIso) {
    return {
      dateLabel: formatDateDdMm(start),
      timeLabel: t('timeDisplay.from', { time: startPart }),
      crossDay: false,
    }
  }
  const end = new Date(endIso)
  if (!Number.isFinite(end.getTime())) {
    return {
      dateLabel: formatDateDdMm(start),
      timeLabel: t('timeDisplay.from', { time: startPart }),
      crossDay: false,
    }
  }
  const endPart = formatTimeHhMm(end)
  const sameDay = start.toDateString() === end.toDateString()
  if (sameDay) {
    return {
      dateLabel: formatDateDdMm(start),
      timeLabel: `${startPart}–${endPart}`,
      crossDay: false,
    }
  }
  return {
    dateLabel: null,
    timeLabel: `${formatIntervalWhen(startIso)} – ${formatIntervalWhen(endIso)}`,
    crossDay: true,
  }
}

export function formatTimeRange(startIso: string, endIso: string | null | undefined): string {
  const parts = getTimeRangeParts(startIso, endIso)
  if (parts.crossDay || !parts.dateLabel) return parts.timeLabel
  return `${parts.dateLabel} ${parts.timeLabel}`
}

/** Today's YYYY-MM-DD in the accounting timezone (Minsk). */
export function todayDateString(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: ACCOUNTING_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

/** Yesterday's YYYY-MM-DD in the accounting timezone (Minsk). */
export function yesterdayDateString(): string {
  const today = todayDateString()
  // Noon UTC-ish parse of calendar date in Minsk: use formatter offset via Date
  const parts = today.split('-').map(Number)
  const y = parts[0]!
  const m = parts[1]!
  const d = parts[2]!
  const utc = Date.UTC(y, m - 1, d, 12, 0, 0)
  const prev = new Date(utc - 86400000)
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: ACCOUNTING_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(prev)
  } catch {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${prev.getUTCFullYear()}-${pad(prev.getUTCMonth() + 1)}-${pad(prev.getUTCDate())}`
  }
}
