import { useEffect, useRef } from 'react'
import { db } from '@/db'
import { flushPendingOps } from '@/api/pendingOps'
import { tasksApi } from '@/api/tasksApi'
import { tasksRemote } from '@/api/tasksRemote'
import { useTelegram } from '@/hooks/useTelegram'

const BOOTSTRAP_KEY = 'nastask.tasksBootstrapped'

/**
 * Pull server tasks into Dexie; one-time upload of local-only tasks.
 * Also flushes pending offline ops on launch / online.
 */
export function useTasksSync() {
  const { userId } = useTelegram()
  const ranFor = useRef<number | null>(null)

  useEffect(() => {
    if (userId == null) return

    const sync = async () => {
      try {
        await flushPendingOps()

        const remote = await tasksRemote.list()
        const remoteIds = new Set(remote.map((t) => t.id))

        const bootstrapped = localStorage.getItem(BOOTSTRAP_KEY) === '1'
        if (!bootstrapped) {
          const local = await db.tasks.toArray()
          const missing = local.filter((t) => !remoteIds.has(t.id))
          for (const task of missing) {
            try {
              await tasksRemote.create(task)
              console.log(`[tasks-sync] bootstrap upload «${task.title}»`)
            } catch (error) {
              console.error('[tasks-sync] bootstrap failed', task.id, error)
            }
          }
          localStorage.setItem(BOOTSTRAP_KEY, '1')
          const refreshed = await tasksRemote.list()
          await tasksApi.replaceAll(
            refreshed.map((t) => ({
              ...t,
              lastReminderSent: null,
              startNotified: false,
            })),
          )
        } else {
          await tasksApi.replaceAll(
            remote.map((t) => ({
              ...t,
              lastReminderSent: null,
              startNotified: false,
            })),
          )
        }

        console.log('[tasks-sync] pulled from server')
      } catch (error) {
        console.error('[tasks-sync] failed', error)
      }
    }

    if (ranFor.current !== userId) {
      ranFor.current = userId
      void sync()
    }

    const onOnline = () => {
      void flushPendingOps().then(() => sync())
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [userId])
}
