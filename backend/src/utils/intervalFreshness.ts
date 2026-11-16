/** Shared freshness rules for bot digests (Europe/Minsk). */

const TZ = 'Europe/Minsk'

function zonedParts(d: Date): { y: number; m: number; day: number; weekday: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
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

function dayKey(d: Date): string {
  const p = zonedParts(d)
  return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

/** Full business days after start calendar day, before today (Minsk). */
export function businessDaysAfterStart(startIso: string, now: Date = new Date()): number {
  const start = new Date(startIso)
  if (!Number.isFinite(start.getTime())) return 0
  const startKey = dayKey(start)
  const nowKey = dayKey(now)
  if (nowKey <= startKey) return 0

  const seen = new Set<string>()
  let count = 0
  const cursor = new Date(start.getTime())
  for (let i = 0; i < 800; i++) {
    cursor.setUTCHours(cursor.getUTCHours() + 12)
    const key = dayKey(cursor)
    if (key <= startKey) continue
    if (key >= nowKey) break
    if (seen.has(key)) continue
    seen.add(key)
    const w = zonedParts(cursor).weekday
    if (w !== 0 && w !== 6) count += 1
  }
  return count
}

export function isUiStale(startIso: string, now: Date = new Date()): boolean {
  return businessDaysAfterStart(startIso, now) >= 1
}

/** Friday-started intervals: soft-mention on weekend / Monday, not critical red. */
export function isFridayCarryover(startIso: string, now: Date = new Date()): boolean {
  const start = new Date(startIso)
  if (!Number.isFinite(start.getTime())) return false
  if (zonedParts(start).weekday !== 5) return false
  const nowW = zonedParts(now).weekday
  return nowW === 0 || nowW === 6 || nowW === 1
}

export function continuousRunHours(
  entry: {
    pauseStartedAt: string | null
    start: string
    totalSeconds: number
    pauseTotalSeconds: number
  },
  now: Date = new Date(),
): number {
  if (entry.pauseStartedAt) return 0
  const startMs = Date.parse(entry.start)
  if (!Number.isFinite(startMs)) return 0
  const wall = Math.max(0, (now.getTime() - startMs) / 1000 - entry.pauseTotalSeconds)
  return wall / 3600
}
