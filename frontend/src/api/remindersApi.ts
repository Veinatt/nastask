import { apiFetch } from '@/api/client'
import type { ReminderInterval, Task } from '@/db/types'

export type ReminderPayload = {
  taskId: string
  userId: number
  title: string
  startTime: string | null
  interval: ReminderInterval
  deadline: string | null
}

function buildPayload(task: Task, userId: number): ReminderPayload {
  return {
    taskId: task.id,
    userId,
    title: task.title,
    startTime: task.startTime,
    interval: task.reminderInterval,
    deadline: task.deadline,
  }
}

export const remindersApi = {
  async createReminder(task: Task, userId: number): Promise<void> {
    const payload = buildPayload(task, userId)
    await apiFetch('/api/reminders', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async updateReminder(task: Task, userId: number): Promise<void> {
    const payload = buildPayload(task, userId)
    await apiFetch(`/api/reminders/${encodeURIComponent(task.id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  async deleteReminder(taskId: string, userId: number): Promise<void> {
    await apiFetch(`/api/reminders/${encodeURIComponent(taskId)}?userId=${userId}`, {
      method: 'DELETE',
    })
  },
}

/** Fire-and-forget wrapper: never blocks UI. */
export function syncReminder(
  action: 'create' | 'update' | 'delete',
  opts: { task?: Task; taskId?: string; userId: number | null },
): void {
  const { userId } = opts
  if (userId == null) {
    console.warn('[reminders] skip sync: no Telegram userId')
    return
  }

  void (async () => {
    try {
      if (action === 'create' && opts.task) {
        await remindersApi.createReminder(opts.task, userId)
        return
      }
      if (action === 'update' && opts.task) {
        await remindersApi.updateReminder(opts.task, userId)
        return
      }
      if (action === 'delete') {
        const taskId = opts.taskId ?? opts.task?.id
        if (!taskId) {
          console.warn('[reminders] skip delete: missing taskId')
          return
        }
        await remindersApi.deleteReminder(taskId, userId)
      }
    } catch (error) {
      console.error(`[reminders] ${action} failed`, error)
    }
  })()
}
