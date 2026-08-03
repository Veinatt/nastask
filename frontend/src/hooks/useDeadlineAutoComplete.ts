import { useEffect } from 'react'
import { tasksApi } from '@/api/tasksApi'

/**
 * Safety net: if server completed a task by deadline but cache is stale,
 * or local deadline passed while offline — complete via API/cache.
 */
export function useDeadlineAutoComplete() {
  useEffect(() => {
    const tick = async () => {
      try {
        const active = await tasksApi.getByStatus('active')
        const now = Date.now()

        for (const task of active) {
          if (!task.deadline) continue
          const deadlineMs = Date.parse(task.deadline)
          if (Number.isNaN(deadlineMs) || deadlineMs > now) continue

          console.log(`[deadline] auto-complete «${task.title}» id=${task.id}`)
          await tasksApi.complete(task.id)
        }
      } catch (error) {
        console.error('[deadline] auto-complete failed', error)
      }
    }

    void tick()
    const id = window.setInterval(() => void tick(), 30_000)
    return () => window.clearInterval(id)
  }, [])
}
