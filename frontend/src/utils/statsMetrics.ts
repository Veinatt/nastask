import type { TimeEntry, WorkItem } from '@/db/types'

export type IntervalWithWorks = {
  entry: TimeEntry
  workItems: WorkItem[]
}

export type StatsMetrics = {
  totalSeconds: number
  totalHours: number
  intervalCount: number
  avgHoursPerWorkedDay: number
  avgHoursPerCalendarDay: number
  weightedAvgCoefficient: number
  avgIntervalHours: number
  earned: number
  employerPay: number
  pauseSeconds: number
  workedDays: number
  calendarDays: number
}

export function computeStatsMetrics(
  items: IntervalWithWorks[],
  opts: {
    from: string
    to: string
    hourlyRate: number
    taxRate: number
  },
): StatsMetrics {
  const totalSeconds = items.reduce((s, i) => s + i.entry.totalSeconds, 0)
  const pauseSeconds = items.reduce((s, i) => s + i.entry.pauseTotalSeconds, 0)
  const intervalCount = items.length
  const totalHours = totalSeconds / 3600

  const days = new Set(items.map((i) => i.entry.date))
  const workedDays = days.size

  const fromMs = Date.parse(`${opts.from}T00:00:00`)
  const toMs = Date.parse(`${opts.to}T00:00:00`)
  const calendarDays =
    Number.isFinite(fromMs) && Number.isFinite(toMs)
      ? Math.max(1, Math.round((toMs - fromMs) / 86400000) + 1)
      : 1

  let weightedCoefNum = 0
  for (const { entry } of items) {
    weightedCoefNum += (entry.totalSeconds / 3600) * entry.coefficient
  }
  const weightedAvgCoefficient =
    totalHours > 0 ? weightedCoefNum / totalHours : 0

  const earned = items.reduce((s, { entry }) => {
    return s + (entry.totalSeconds / 3600) * entry.coefficient * opts.hourlyRate
  }, 0)
  const employerPay = earned * (1 + opts.taxRate / 100)

  return {
    totalSeconds,
    totalHours,
    intervalCount,
    avgHoursPerWorkedDay: workedDays > 0 ? totalHours / workedDays : 0,
    avgHoursPerCalendarDay: totalHours / calendarDays,
    weightedAvgCoefficient,
    avgIntervalHours: intervalCount > 0 ? totalHours / intervalCount : 0,
    earned,
    employerPay,
    pauseSeconds,
    workedDays,
    calendarDays,
  }
}

export type SortKey = 'date' | 'duration' | 'coefficient' | 'amount'

export function filterAndSortIntervals(
  items: IntervalWithWorks[],
  filters: {
    coefMin?: number
    coefMax?: number
    categoryId?: string | null
    sort: SortKey
    hourlyRate: number
  },
): IntervalWithWorks[] {
  let list = items.slice()

  if (filters.coefMin != null && Number.isFinite(filters.coefMin)) {
    list = list.filter((i) => i.entry.coefficient >= filters.coefMin!)
  }
  if (filters.coefMax != null && Number.isFinite(filters.coefMax)) {
    list = list.filter((i) => i.entry.coefficient <= filters.coefMax!)
  }
  if (filters.categoryId) {
    list = list.filter((i) =>
      i.workItems.some((w) => w.categoryId === filters.categoryId),
    )
  }

  const amount = (e: TimeEntry) =>
    (e.totalSeconds / 3600) * e.coefficient * filters.hourlyRate

  list.sort((a, b) => {
    switch (filters.sort) {
      case 'duration':
        return b.entry.totalSeconds - a.entry.totalSeconds
      case 'coefficient':
        return b.entry.coefficient - a.entry.coefficient
      case 'amount':
        return amount(b.entry) - amount(a.entry)
      case 'date':
      default:
        return (b.entry.start || '').localeCompare(a.entry.start || '')
    }
  })

  return list
}

export function hoursByDayMap(items: IntervalWithWorks[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const { entry } of items) {
    map.set(entry.date, (map.get(entry.date) ?? 0) + entry.totalSeconds)
  }
  return map
}

export function monthBounds(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const last = new Date(year, month, 0).getDate()
  const to = `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  return { from, to }
}

export type DayGroup = {
  date: string
  items: IntervalWithWorks[]
  totalSeconds: number
}

export type MonthGroup = {
  key: string
  year: number
  month: number
  label: string
  days: DayGroup[]
  totalSeconds: number
}

/** Group intervals by month, then by day (newest first). */
export function groupByMonthThenDay(items: IntervalWithWorks[]): MonthGroup[] {
  const byMonth = new Map<string, IntervalWithWorks[]>()
  for (const item of items) {
    const key = item.entry.date.slice(0, 7)
    const list = byMonth.get(key) ?? []
    list.push(item)
    byMonth.set(key, list)
  }

  const months = [...byMonth.keys()].sort((a, b) => b.localeCompare(a))
  return months.map((key) => {
    const [ys, ms] = key.split('-')
    const year = Number(ys)
    const month = Number(ms)
    const monthItems = byMonth.get(key) ?? []
    const byDay = new Map<string, IntervalWithWorks[]>()
    for (const item of monthItems) {
      const list = byDay.get(item.entry.date) ?? []
      list.push(item)
      byDay.set(item.entry.date, list)
    }
    // Preserve encounter order from filtered list within each day
    const days = [...byDay.keys()]
      .sort((a, b) => b.localeCompare(a))
      .map((date) => {
        const dayItems = byDay.get(date) ?? []
        return {
          date,
          items: dayItems,
          totalSeconds: dayItems.reduce((s, i) => s + i.entry.totalSeconds, 0),
        }
      })
    const label = new Date(year, month - 1, 1).toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    })
    return {
      key,
      year,
      month,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      days,
      totalSeconds: monthItems.reduce((s, i) => s + i.entry.totalSeconds, 0),
    }
  })
}
