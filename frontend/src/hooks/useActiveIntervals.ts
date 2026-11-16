import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { useIntervals } from '@/hooks/useIntervals'
import { computeLiveSeconds } from '@/utils/timeDisplay'
import type { TimeEntry } from '@/db/types'

export type ActiveIntervalView = TimeEntry & {
  displaySeconds: number
  workCount: number
}

/** Active timers with 1s UI tick; re-reads server on pause/resume/complete via hooks. */
export function useActiveIntervals() {
  const intervals = useIntervals()
  const [tick, setTick] = useState(0)

  const workCountByEntry =
    useLiveQuery(async () => {
      const items = await db.workItems.toArray()
      const map: Record<string, number> = {}
      for (const w of items) {
        map[w.timeEntryId] = (map[w.timeEntryId] ?? 0) + 1
      }
      return map
    }, []) ?? {}

  useEffect(() => {
    if (intervals.active.length === 0) return
    const id = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [intervals.active.length])

  const views: ActiveIntervalView[] = useMemo(
    () =>
      intervals.active.map((entry) => ({
        ...entry,
        displaySeconds: computeLiveSeconds(entry),
        isPaused: Boolean(entry.pauseStartedAt),
        isActive: entry.end == null,
        workCount: workCountByEntry[entry.id] ?? 0,
      })),
    // tick forces recompute of displaySeconds
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [intervals.active, workCountByEntry, tick],
  )

  return { ...intervals, views, workCountByEntry }
}
