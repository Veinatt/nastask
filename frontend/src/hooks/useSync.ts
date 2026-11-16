import { useEffect, useRef } from 'react'
import { flushPendingOps, pendingEntityIds } from '@/api/pendingOps'
import { intervalsRemote } from '@/api/intervalsRemote'
import { intervalsLocal } from '@/api/intervalsLocal'
import { dictsRemote } from '@/api/dictsRemote'
import { dictsLocal } from '@/api/dictsLocal'
import { workTemplatesRemote } from '@/api/workTemplatesRemote'
import { workTemplatesLocal } from '@/api/workTemplatesLocal'
import { settingsRemote, settingsLocal } from '@/api/settingsApi'
import { memoryRemote } from '@/api/memoryRemote'
import { memoryLocal } from '@/api/memoryLocal'
import { useTelegram } from '@/hooks/useTelegram'
import { ACCOUNTING_TIMEZONE } from '@/lib/timezone'
import type { DictKind } from '@/db/types'

const DICTS: DictKind[] = ['categories', 'descriptions', 'units', 'expenses']

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
  await intervalsLocal.replaceActive(active, keepIds)

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

  try {
    const memoryAnswers = await memoryRemote.listAnswers()
    // Upsert only — keep locals that still have pending memory_upsert
    const keep = await pendingEntityIds()
    const toPut = memoryAnswers.filter((a) => !keep.has(a.questionId))
    await memoryLocal.putMany(toPut)
  } catch (error) {
    console.error('[sync] memory answers pull failed', error)
  }
}

/** Light pull so bot-side pause/resume shows up without full page reload. */
async function pullActives(): Promise<void> {
  const keepIds = await pendingEntityIds()
  const active = await intervalsRemote.listActive()
  await intervalsLocal.replaceActive(active, keepIds)
}

/** Pull server state + flush pending ops on launch / online; poll actives while open. */
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

    const pollActives = () => {
      if (document.visibilityState !== 'visible') return
      void pullActives().catch((error) => {
        console.error('[sync] active poll failed', error)
      })
    }
    const pollId = window.setInterval(pollActives, 12_000)
    window.addEventListener('focus', pollActives)
    document.addEventListener('visibilitychange', pollActives)
    window.addEventListener('online', onOnline)
    return () => {
      window.clearInterval(pollId)
      window.removeEventListener('focus', pollActives)
      document.removeEventListener('visibilitychange', pollActives)
      window.removeEventListener('online', onOnline)
    }
  }, [userId])
}
