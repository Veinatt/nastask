import type { TimeEntry, WorkItem } from '@/db/types'

export type IntervalWithWorks = {
  entry: TimeEntry
  workItems: WorkItem[]
}

export type StatsMetrics = {
  totalSeconds: number
  intervalCount: number
  avgHoursPerWorkedDay: number
  weightedAvgCoefficient: number
  avgIntervalHours: number
  earned: number
  expensesSum: number
  employerPay: number
  pauseSeconds: number
  /** Share of wall time that was working (not pause), 0..100 */
  workEfficiencyPercent: number
  workedDays: number
}

export function computeStatsMetrics(
  items: IntervalWithWorks[],
  opts: {
    hourlyRate: number
    taxRate: number
    expensesSum?: number
  },
): StatsMetrics {
  const totalSeconds = items.reduce((s, i) => s + i.entry.totalSeconds, 0)
  const pauseSeconds = items.reduce((s, i) => s + i.entry.pauseTotalSeconds, 0)
  const intervalCount = items.length
  const totalHours = totalSeconds / 3600
  const expensesSum = opts.expensesSum ?? 0

  const days = new Set(items.map((i) => i.entry.date))
  const workedDays = days.size

  let weightedCoefNum = 0
  for (const { entry } of items) {
    weightedCoefNum += (entry.totalSeconds / 3600) * entry.coefficient
  }
  const weightedAvgCoefficient =
    totalHours > 0 ? weightedCoefNum / totalHours : 0

  const earned = items.reduce((s, { entry }) => {
    return s + (entry.totalSeconds / 3600) * entry.coefficient * opts.hourlyRate
  }, 0)
  // Align with backend salary report: (earned + expenses) * (1 + tax/100)
  const employerPay = (earned + expensesSum) * (1 + opts.taxRate / 100)

  const wallSeconds = totalSeconds + pauseSeconds
  const workEfficiencyPercent =
    wallSeconds > 0 ? (totalSeconds / wallSeconds) * 100 : 100

  return {
    totalSeconds,
    intervalCount,
    avgHoursPerWorkedDay: workedDays > 0 ? totalHours / workedDays : 0,
    weightedAvgCoefficient,
    avgIntervalHours: intervalCount > 0 ? totalHours / intervalCount : 0,
    earned,
    expensesSum,
    employerPay,
    pauseSeconds,
    workEfficiencyPercent,
    workedDays,
  }
}

/** Split interval seconds (and optional amount) across work items ∝ quantity; qty sum 0 → equal. */
export function allocateByQuantity(
  totalSeconds: number,
  workItems: WorkItem[],
  amount = 0,
): Array<{ workItem: WorkItem; seconds: number; amount: number }> {
  if (workItems.length === 0) return []
  const qtySum = workItems.reduce(
    (s, w) => s + (Number.isFinite(w.quantity) ? w.quantity : 0),
    0,
  )
  if (qtySum <= 0) {
    const eachSec = totalSeconds / workItems.length
    const eachAmt = amount / workItems.length
    return workItems.map((workItem) => ({
      workItem,
      seconds: eachSec,
      amount: eachAmt,
    }))
  }
  return workItems.map((workItem) => {
    const q = Number.isFinite(workItem.quantity) ? workItem.quantity : 0
    const share = q / qtySum
    return {
      workItem,
      seconds: totalSeconds * share,
      amount: amount * share,
    }
  })
}

export type CategoryStat = {
  categoryId: string
  seconds: number
  amount: number
}

export type WorkStat = {
  categoryId: string
  descriptionId: string
  seconds: number
  amount: number
  quantity: number
}

export function aggregateCategoryAndWorkStats(
  items: IntervalWithWorks[],
  hourlyRate: number,
): { categories: CategoryStat[]; works: WorkStat[] } {
  const catMap = new Map<string, CategoryStat>()
  const workMap = new Map<string, WorkStat>()

  for (const { entry, workItems } of items) {
    const amount =
      (entry.totalSeconds / 3600) * entry.coefficient * hourlyRate
    const parts = allocateByQuantity(entry.totalSeconds, workItems, amount)
    for (const part of parts) {
      const cid = part.workItem.categoryId
      const cat = catMap.get(cid) ?? { categoryId: cid, seconds: 0, amount: 0 }
      cat.seconds += part.seconds
      cat.amount += part.amount
      catMap.set(cid, cat)

      const key = `${cid}\0${part.workItem.descriptionId}`
      const w =
        workMap.get(key) ?? {
          categoryId: cid,
          descriptionId: part.workItem.descriptionId,
          seconds: 0,
          amount: 0,
          quantity: 0,
        }
      w.seconds += part.seconds
      w.amount += part.amount
      w.quantity += Number.isFinite(part.workItem.quantity)
        ? part.workItem.quantity
        : 0
      workMap.set(key, w)
    }
  }

  const categories = [...catMap.values()].sort((a, b) => b.seconds - a.seconds)
  const works = [...workMap.values()].sort((a, b) => b.seconds - a.seconds)
  return { categories, works }
}

export type MonthAggregate = {
  key: string
  year: number
  month: number
  totalSeconds: number
  earned: number
}

/** Last N calendar months ending at endYear/endMonth (inclusive). */
export function monthlyAggregates(
  items: IntervalWithWorks[],
  hourlyRate: number,
  endYear: number,
  endMonth: number,
  monthsCount = 12,
): MonthAggregate[] {
  const byMonth = new Map<string, { totalSeconds: number; earned: number }>()
  for (const { entry } of items) {
    const key = entry.date.slice(0, 7)
    const cur = byMonth.get(key) ?? { totalSeconds: 0, earned: 0 }
    cur.totalSeconds += entry.totalSeconds
    cur.earned += (entry.totalSeconds / 3600) * entry.coefficient * hourlyRate
    byMonth.set(key, cur)
  }

  const result: MonthAggregate[] = []
  let y = endYear
  let m = endMonth
  for (let i = 0; i < monthsCount; i++) {
    const key = `${y}-${String(m).padStart(2, '0')}`
    const cur = byMonth.get(key)
    result.push({
      key,
      year: y,
      month: m,
      totalSeconds: cur?.totalSeconds ?? 0,
      earned: cur?.earned ?? 0,
    })
    m -= 1
    if (m < 1) {
      m = 12
      y -= 1
    }
  }
  return result.reverse()
}

/** Unique yyyy-MM keys covered by [from, to] inclusive. */
export function monthsInRange(
  from: string,
  to: string,
): Array<{ year: number; month: number }> {
  const start = from.slice(0, 7)
  const end = to.slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(start) || !/^\d{4}-\d{2}$/.test(end)) return []
  const out: Array<{ year: number; month: number }> = []
  let [ys, ms] = start.split('-').map(Number) as [number, number]
  const [ye, me] = end.split('-').map(Number) as [number, number]
  while (ys < ye || (ys === ye && ms <= me)) {
    out.push({ year: ys, month: ms })
    ms += 1
    if (ms > 12) {
      ms = 1
      ys += 1
    }
  }
  return out
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
