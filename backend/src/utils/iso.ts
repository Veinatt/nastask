import { formatInTimeZone } from 'date-fns-tz'

export function nowIso(): string {
  return new Date().toISOString()
}

export function dateInTimezone(iso: string, timeZone: string): string {
  return formatInTimeZone(new Date(iso), timeZone || 'Europe/Moscow', 'yyyy-MM-dd')
}

export function secondsBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(fromIso)
  const b = Date.parse(toIso)
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0
  return Math.floor((b - a) / 1000)
}
