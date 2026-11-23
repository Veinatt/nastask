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
import { emitSyncStatus } from '@/components/layout/SyncStatusBanner'
import { useTelegram } from '@/hooks/useTelegram'
import { t } from '@/lib/i18n'
import { ACCOUNTING_TIMEZONE } from '@/lib/timezone'
import type { DictKind } from '@/db/types'

const DICTS: DictKind[] = ['categories', 'descriptions', 'units', 'expenses']
/** Avoid toast spam from the 60s active poll. */
const ERROR_COOLDOWN_MS = 60_000

let lastPullErrorAt = 0

function notifyPullError(messageKey: string): void {
  const now = Date.now()
  if (now - lastPullErrorAt < ERROR_COOLDOWN_MS) return
  lastPullErrorAt = now
  emitSyncStatus(t(messageKey), 'error')
}

async function pullAll(): Promise<{ historyOk: boolean }> {
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

  const historyOk = allCompleted != null
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

  return { historyOk }
}

/** Light pull so bot-side pause/resume shows up without full page reload. */
async function pullActives(): Promise<void> {
  // Flush first — otherwise local pause can sit in the queue while the server
  // (and bot still-working) still see a running interval.
  await flushPendingOps()
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
        const { historyOk } = await pullAll()
        if (!historyOk) {
          notifyPullError('sync.historyFailed')
          return
        }
        // Clear cooldown so a later failure shows again; ok toast comes from pendingOps.
        lastPullErrorAt = 0
      } catch (error) {
        console.error('[sync] failed', error)
        notifyPullError('sync.pullFailed')
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
      void pullActives()
        .then(() => {
          lastPullErrorAt = 0
        })
        .catch((error) => {
          console.error('[sync] active poll failed', error)
          notifyPullError('sync.pullFailed')
        })
    }
    const pollId = window.setInterval(pollActives, 60_000)
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
