import { useEffect, useRef } from 'react'
import { flushPendingOps } from '@/api/pendingOps'
import { intervalsRemote } from '@/api/intervalsRemote'
import { intervalsLocal } from '@/api/intervalsLocal'
import { dictsRemote } from '@/api/dictsRemote'
import { dictsLocal } from '@/api/dictsLocal'
import { settingsRemote, settingsLocal } from '@/api/settingsApi'
import { useTelegram } from '@/hooks/useTelegram'
import { db } from '@/db'
import {
  getDeviceTimezone,
  todayDateString,
  yesterdayDateString,
} from '@/utils/timeDisplay'
import type { DictKind, TimeEntry, WorkItem } from '@/db/types'

const DICTS: DictKind[] = ['categories', 'descriptions', 'units']

async function fetchCompletedDay(
  date: string,
): Promise<Array<{ entry: TimeEntry; workItems: WorkItem[] }> | null> {
  try {
    return await intervalsRemote.listCompleted(date)
  } catch (error) {
    console.error('[sync] listCompleted failed', date, error)
    return null
  }
}

async function pendingEntityIds(): Promise<Set<string>> {
  const ops = await db.pendingOps.toArray()
  return new Set(ops.map((op) => op.entityId))
}

async function pullAll(): Promise<void> {
  await flushPendingOps()

  const today = todayDateString()
  const yesterday = yesterdayDateString()
  const keepIds = await pendingEntityIds()

  const [active, settings, completedToday, completedYesterday] = await Promise.all([
    intervalsRemote.listActive(),
    settingsRemote.get(),
    fetchCompletedDay(today),
    fetchCompletedDay(yesterday),
  ])
  await intervalsLocal.replaceActive(active)

  if (completedToday) {
    await intervalsLocal.replaceCompletedForDate(today, completedToday, keepIds)
  }
  if (completedYesterday) {
    await intervalsLocal.replaceCompletedForDate(yesterday, completedYesterday, keepIds)
  }

  const deviceTz = getDeviceTimezone()
  if (settings.timezone !== deviceTz) {
    const synced = await settingsRemote.put({ timezone: deviceTz })
    await settingsLocal.put(synced)
  } else {
    await settingsLocal.put(settings)
  }

  await Promise.all(
    DICTS.map(async (kind) => {
      const items = await dictsRemote.list(kind)
      await dictsLocal.replaceAll(kind, items)
    }),
  )
}

/** Pull server state + flush pending ops on launch / online. */
export function useSync() {
  const { userId } = useTelegram()
  const ranFor = useRef<number | null>(null)

  useEffect(() => {
    if (userId == null) return

    const sync = async () => {
      try {
        await pullAll()
        console.log('[sync] pulled from server')
      } catch (error) {
        console.error('[sync] failed', error)
      }
    }

    if (ranFor.current !== userId) {
      ranFor.current = userId
      void sync()
    }

    const onOnline = () => {
      void sync()
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [userId])
}
