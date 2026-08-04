import { useLiveQuery } from 'dexie-react-hooks'
import { intervalsLocal } from '@/api/intervalsLocal'
import { intervalsRemote } from '@/api/intervalsRemote'
import { enqueueOp } from '@/api/pendingOps'
import { generateId } from '@/utils/idGenerator'
import { todayDateString, yesterdayDateString } from '@/utils/timeDisplay'
import type { TimeEntry, WorkItem, WorkItemInput } from '@/db/types'
import { ApiError } from '@/api/client'

function isOfflineError(error: unknown): boolean {
  return (
    !navigator.onLine ||
    error instanceof TypeError ||
    (error instanceof ApiError && error.status === 0)
  )
}

async function applyRemote(
  run: () => Promise<{ entry: TimeEntry; workItems: WorkItem[] }>,
): Promise<TimeEntry> {
  const { entry, workItems } = await run()
  await intervalsLocal.putEntry(entry, workItems)
  return entry
}

export function useIntervals() {
  const today = todayDateString()
  const yesterday = yesterdayDateString()

  const active =
    useLiveQuery(() => intervalsLocal.listActive(), []) ?? ([] as TimeEntry[])

  const completedToday =
    useLiveQuery(async () => {
      const rows = await intervalsLocal.listByDate(today)
      return rows.filter((e) => e.end != null)
    }, [today]) ?? ([] as TimeEntry[])

  const completedYesterday =
    useLiveQuery(async () => {
      const rows = await intervalsLocal.listByDate(yesterday)
      return rows.filter((e) => e.end != null)
    }, [yesterday]) ?? ([] as TimeEntry[])

  const pause = async (id: string): Promise<TimeEntry> => {
    const entry = await intervalsLocal.listActive().then((xs) => xs.find((e) => e.id === id))
    if (!entry || entry.pauseStartedAt) return entry!
    const now = new Date().toISOString()
    const wall = Math.max(
      0,
      Math.floor((Date.parse(now) - Date.parse(entry.start)) / 1000) - entry.pauseTotalSeconds,
    )
    const paused: TimeEntry = {
      ...entry,
      totalSeconds: wall,
      pauseStartedAt: now,
      updatedAt: now,
      isPaused: true,
    }
    await intervalsLocal.putEntry(paused)
    try {
      return await applyRemote(() => intervalsRemote.pause(id))
    } catch (error) {
      if (isOfflineError(error)) {
        await enqueueOp('interval_pause', id, {})
        return paused
      }
      throw error
    }
  }

  /** Pause every running (non-paused) active interval. */
  const pauseRunningActives = async (): Promise<void> => {
    const actives = await intervalsLocal.listActive()
    for (const entry of actives) {
      if (entry.pauseStartedAt) continue
      try {
        await pause(entry.id)
      } catch (error) {
        console.error('[intervals] pauseRunningActives failed', entry.id, error)
      }
    }
  }

  const start = async (): Promise<TimeEntry> => {
    // Only one timer runs at a time — pause the rest first
    await pauseRunningActives()

    const id = generateId()
    const now = new Date().toISOString()
    const optimistic: TimeEntry = {
      id,
      title: '',
      coefficient: 1,
      start: now,
      end: null,
      totalSeconds: 0,
      pauseTotalSeconds: 0,
      pauseStartedAt: null,
      date: today,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      isPaused: false,
      liveTotalSeconds: 0,
    }
    await intervalsLocal.putEntry(optimistic, [])
    try {
      return await applyRemote(() => intervalsRemote.start('', id))
    } catch (error) {
      if (isOfflineError(error)) {
        await enqueueOp('interval_start', id, { title: '', id })
        return optimistic
      }
      await intervalsLocal.remove(id)
      throw error
    }
  }

  const resume = async (id: string): Promise<TimeEntry> => {
    const entry = await intervalsLocal.listActive().then((xs) => xs.find((e) => e.id === id))
    if (!entry?.pauseStartedAt) return entry!
    const now = new Date().toISOString()
    const pauseExtra = Math.max(
      0,
      Math.floor((Date.parse(now) - Date.parse(entry.pauseStartedAt)) / 1000),
    )
    const resumed: TimeEntry = {
      ...entry,
      pauseTotalSeconds: entry.pauseTotalSeconds + pauseExtra,
      pauseStartedAt: null,
      updatedAt: now,
      isPaused: false,
    }
    await intervalsLocal.putEntry(resumed)
    try {
      return await applyRemote(() => intervalsRemote.resume(id))
    } catch (error) {
      if (isOfflineError(error)) {
        await enqueueOp('interval_resume', id, {})
        return resumed
      }
      throw error
    }
  }

  const complete = async (
    id: string,
    payload: { coefficient: number; workItems: WorkItemInput[] },
  ): Promise<TimeEntry> => {
    try {
      return await applyRemote(() => intervalsRemote.complete(id, payload))
    } catch (error) {
      if (isOfflineError(error)) {
        const entry = (await intervalsLocal.listActive()).find((e) => e.id === id)
        if (!entry) throw error
        const now = new Date().toISOString()
        let totalSeconds = entry.totalSeconds
        let pauseTotal = entry.pauseTotalSeconds
        if (entry.pauseStartedAt) {
          pauseTotal += Math.max(
            0,
            Math.floor((Date.parse(now) - Date.parse(entry.pauseStartedAt)) / 1000),
          )
        } else {
          totalSeconds = Math.max(
            0,
            Math.floor((Date.parse(now) - Date.parse(entry.start)) / 1000) - pauseTotal,
          )
        }
        const done: TimeEntry = {
          ...entry,
          coefficient: payload.coefficient,
          end: now,
          totalSeconds,
          pauseTotalSeconds: pauseTotal,
          pauseStartedAt: null,
          updatedAt: now,
          isActive: false,
          isPaused: false,
        }
        const workItems: WorkItem[] = payload.workItems.map((w) => ({
          id: w.id ?? generateId(),
          timeEntryId: id,
          categoryId: w.categoryId,
          descriptionId: w.descriptionId,
          quantity: w.quantity,
          unitId: w.unitId,
        }))
        await intervalsLocal.putEntry(done, workItems)
        await enqueueOp('interval_complete', id, payload)
        return done
      }
      throw error
    }
  }

  const createManual = async (payload: {
    start: string
    end: string
    coefficient: number
    workItems: WorkItemInput[]
  }): Promise<TimeEntry> => {
    const id = generateId()
    const withTitle = { ...payload, title: '' }
    try {
      return await applyRemote(() =>
        intervalsRemote.manual({ ...withTitle, id }),
      )
    } catch (error) {
      if (isOfflineError(error)) {
        const now = new Date().toISOString()
        const totalSeconds = Math.max(
          0,
          Math.floor((Date.parse(payload.end) - Date.parse(payload.start)) / 1000),
        )
        const entry: TimeEntry = {
          id,
          title: '',
          coefficient: payload.coefficient,
          start: payload.start,
          end: payload.end,
          totalSeconds,
          pauseTotalSeconds: 0,
          pauseStartedAt: null,
          date: payload.start.slice(0, 10),
          createdAt: now,
          updatedAt: now,
          isActive: false,
        }
        const workItems: WorkItem[] = payload.workItems.map((w) => ({
          id: w.id ?? generateId(),
          timeEntryId: id,
          categoryId: w.categoryId,
          descriptionId: w.descriptionId,
          quantity: w.quantity,
          unitId: w.unitId,
        }))
        await intervalsLocal.putEntry(entry, workItems)
        await enqueueOp('interval_manual', id, { ...withTitle, id })
        return entry
      }
      throw error
    }
  }

  const updateInterval = async (
    id: string,
    payload: Partial<{
      title: string
      coefficient: number
      start: string
      end: string | null
      workItems: WorkItemInput[]
    }>,
  ): Promise<TimeEntry> => {
    try {
      return await applyRemote(() => intervalsRemote.update(id, payload))
    } catch (error) {
      if (isOfflineError(error)) {
        await enqueueOp('interval_update', id, payload)
        const existing = await intervalsLocal.listByDate(today)
        const found =
          existing.find((e) => e.id === id) ??
          (await intervalsLocal.listActive()).find((e) => e.id === id)
        if (!found) throw error
        const start = payload.start ?? found.start
        const end = payload.end !== undefined ? payload.end : found.end
        let totalSeconds = found.totalSeconds
        if (end) {
          totalSeconds = Math.max(
            0,
            Math.floor((Date.parse(end) - Date.parse(start)) / 1000),
          )
        }
        const next: TimeEntry = {
          ...found,
          ...payload,
          start,
          end,
          totalSeconds,
          date: start.slice(0, 10),
          updatedAt: new Date().toISOString(),
        }
        const workItems = payload.workItems
          ? payload.workItems.map((w) => ({
              id: w.id ?? generateId(),
              timeEntryId: id,
              categoryId: w.categoryId,
              descriptionId: w.descriptionId,
              quantity: w.quantity,
              unitId: w.unitId,
            }))
          : undefined
        await intervalsLocal.putEntry(next, workItems)
        return next
      }
      throw error
    }
  }

  const remove = async (id: string): Promise<void> => {
    try {
      await intervalsRemote.remove(id)
      await intervalsLocal.remove(id)
    } catch (error) {
      if (isOfflineError(error)) {
        await intervalsLocal.remove(id)
        await enqueueOp('interval_delete', id, {})
        return
      }
      throw error
    }
  }

  const refreshActive = async (): Promise<void> => {
    try {
      const activeRemote = await intervalsRemote.listActive()
      await intervalsLocal.replaceActive(activeRemote)
    } catch (error) {
      console.error('[intervals] refreshActive failed', error)
    }
  }

  const loadCompletedForDate = async (date: string): Promise<TimeEntry[]> => {
    try {
      const rows = await intervalsRemote.listCompleted(date)
      for (const { entry, workItems } of rows) {
        await intervalsLocal.putEntry(entry, workItems)
      }
      return rows.map((r) => r.entry)
    } catch (error) {
      console.error('[intervals] loadCompleted failed', error)
      const local = await intervalsLocal.listByDate(date)
      return local.filter((e) => e.end != null)
    }
  }

  return {
    active,
    completedToday,
    completedYesterday,
    today,
    yesterday,
    start,
    pause,
    resume,
    complete,
    createManual,
    updateInterval,
    remove,
    refreshActive,
    loadCompletedForDate,
  }
}
