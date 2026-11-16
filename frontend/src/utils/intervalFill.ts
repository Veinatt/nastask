import type { TimeEntry, WorkItem } from '@/db/types'

export type IntervalFillState = {
  hasTitle: boolean
  workCount: number
  hasNotes: boolean
  /** No title and no works. */
  isEmpty: boolean
  /** No works yet — show «не заполнен» on cards. */
  needsWorks: boolean
}

export function getIntervalFillState(
  entry: Pick<TimeEntry, 'title' | 'notes'>,
  workItems: WorkItem[] | number = [],
): IntervalFillState {
  const workCount = typeof workItems === 'number' ? workItems : workItems.length
  const hasTitle = Boolean(entry.title?.trim())
  const hasNotes = Boolean(entry.notes?.trim())
  return {
    hasTitle,
    workCount,
    hasNotes,
    isEmpty: !hasTitle && workCount === 0,
    needsWorks: workCount === 0,
  }
}

/** Slavic plural: one / few (2–4) / many. Handles 11–14 exceptions. */
export function slavicPluralForm(n: number): 'one' | 'few' | 'many' {
  const abs = Math.abs(Math.trunc(n))
  const n10 = abs % 10
  const n100 = abs % 100
  if (n10 === 1 && n100 !== 11) return 'one'
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return 'few'
  return 'many'
}

/** Short works status (notes shown via icon, not text). */
export function formatFillSummary(
  fill: IntervalFillState,
  labels: { empty: string; works: (n: number) => string },
): string {
  if (fill.needsWorks) return labels.empty
  return labels.works(fill.workCount)
}
