import { t } from '@/lib/i18n'
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

export function formatHours(totalSeconds: number, digits = 2): string {
  return (totalSeconds / 3600).toFixed(digits)
}

export function formatIntervalWhen(
  startIso: string,
  opts?: { withDate?: boolean },
): string {
  const d = new Date(startIso)
  if (!Number.isFinite(d.getTime())) return '—'
  const withDate = opts?.withDate ?? true
  return d.toLocaleString([], {
    ...(withDate
      ? { day: '2-digit', month: '2-digit', year: 'numeric' }
      : {}),
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTimeRange(startIso: string, endIso: string | null | undefined): string {
  const start = new Date(startIso)
  if (!Number.isFinite(start.getTime())) return '—'
  const startPart = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (!endIso) return t('timeDisplay.from', { time: startPart })
  const end = new Date(endIso)
  if (!Number.isFinite(end.getTime())) return t('timeDisplay.from', { time: startPart })
  const endPart = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const sameDay = start.toDateString() === end.toDateString()
  if (sameDay) {
    return `${start.toLocaleDateString([], { day: '2-digit', month: '2-digit' })} · ${startPart}–${endPart}`
  }
  return `${formatIntervalWhen(startIso)} – ${formatIntervalWhen(endIso)}`
}

/** IANA timezone of the current device (browser). */
export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** Today's YYYY-MM-DD in the device timezone. */
export function todayDateString(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: getDeviceTimezone(),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

/** Yesterday's YYYY-MM-DD in the device timezone. */
export function yesterdayDateString(): string {
  const today = todayDateString()
  const d = new Date(`${today}T12:00:00`)
  d.setDate(d.getDate() - 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
