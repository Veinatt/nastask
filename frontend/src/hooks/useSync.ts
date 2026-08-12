import { useEffect, useRef } from 'react'
import { flushPendingOps } from '@/api/pendingOps'
import { intervalsRemote } from '@/api/intervalsRemote'
import { intervalsLocal } from '@/api/intervalsLocal'
import { dictsRemote } from '@/api/dictsRemote'
import { dictsLocal } from '@/api/dictsLocal'
import { workTemplatesRemote } from '@/api/workTemplatesRemote'
import { workTemplatesLocal } from '@/api/workTemplatesLocal'
import { settingsRemote, settingsLocal } from '@/api/settingsApi'
import { useTelegram } from '@/hooks/useTelegram'
import { db } from '@/db'
import { ACCOUNTING_TIMEZONE } from '@/lib/timezone'
import type { DictKind } from '@/db/types'

const DICTS: DictKind[] = ['categories', 'descriptions', 'units', 'expenses']

async function pendingEntityIds(): Promise<Set<string>> {
  const ops = await db.pendingOps.toArray()
  return new Set(ops.map((op) => op.entityId))
}

async function pullAll(): Promise<void> {
  await flushPendingOps()

  const keepIds = await pendingEntityIds()

  const [active, settings, allCompleted] = await Promise.all([
    intervalsRemote.listActive(),
    settingsRemote.get(),
    intervalsRemote.listAllCompleted().catch((error) => {
      console.error('[sync] listAllCompleted failed', error)
      return null
    }),
  ])
  await intervalsLocal.replaceActive(active)

  if (allCompleted) {
    await intervalsLocal.replaceAllCompleted(allCompleted, keepIds)
  }

  if (settings.timezone !== ACCOUNTING_TIMEZONE) {
    const synced = await settingsRemote.put({ timezone: ACCOUNTING_TIMEZONE })
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

  try {
    const templates = await workTemplatesRemote.list()
    await workTemplatesLocal.replaceAll(templates)
  } catch (error) {
    console.error('[sync] work templates pull failed', error)
  }
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
