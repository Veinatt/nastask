import { useEffect, useState } from 'react'
import { useIntervals } from '@/hooks/useIntervals'
import { computeLiveSeconds } from '@/utils/timeDisplay'
import type { TimeEntry } from '@/db/types'

export type ActiveIntervalView = TimeEntry & { displaySeconds: number }

/** Active timers with 1s UI tick; re-reads server on pause/resume/complete via hooks. */
export function useActiveIntervals() {
  const intervals = useIntervals()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (intervals.active.length === 0) return
    const id = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [intervals.active.length])

  const views: ActiveIntervalView[] = intervals.active.map((entry) => ({
    ...entry,
    displaySeconds: computeLiveSeconds(entry),
    isPaused: Boolean(entry.pauseStartedAt),
    isActive: entry.end == null,
  }))

  // tick forces recompute
  void tick

  return { ...intervals, views }
}
