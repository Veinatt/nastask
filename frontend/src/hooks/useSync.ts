import { useEffect, useRef } from 'react'
import { flushPendingOps } from '@/api/pendingOps'
import { intervalsRemote } from '@/api/intervalsRemote'
import { intervalsLocal } from '@/api/intervalsLocal'
import { dictsRemote } from '@/api/dictsRemote'
import { dictsLocal } from '@/api/dictsLocal'
import { settingsRemote, settingsLocal } from '@/api/settingsApi'
import { useTelegram } from '@/hooks/useTelegram'
import {
  getDeviceTimezone,
  todayDateString,
  yesterdayDateString,
} from '@/utils/timeDisplay'
import type { DictKind } from '@/db/types'

const DICTS: DictKind[] = ['categories', 'descriptions', 'units']

async function pullAll(): Promise<void> {
  await flushPendingOps()

  const today = todayDateString()
  const yesterday = yesterdayDateString()

  const [active, settings, completedToday, completedYesterday] = await Promise.all([
    intervalsRemote.listActive(),
    settingsRemote.get(),
    intervalsRemote.listCompleted(today).catch(() => []),
    intervalsRemote.listCompleted(yesterday).catch(() => []),
  ])
  await intervalsLocal.replaceActive(active)

  for (const { entry, workItems } of [...completedToday, ...completedYesterday]) {
    await intervalsLocal.putEntry(entry, workItems)
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
