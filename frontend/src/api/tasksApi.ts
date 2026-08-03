import { db } from '@/db'
import { enqueueOp } from '@/api/pendingOps'
import {
  applyLocalPatch,
  buildLocalTask,
  tasksRemote,
} from '@/api/tasksRemote'
import type { CreateTaskInput, Task, UpdateTaskInput } from '@/db/types'
import { generateId } from '@/utils/idGenerator'
import { ApiError } from '@/api/client'

function isOfflineError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status >= 500 || error.status === 0
  }
  return error instanceof TypeError
}

export const tasksApi = {
  async getAll(): Promise<Task[]> {
    return db.tasks.orderBy('updatedAt').reverse().toArray()
  },

  async getByStatus(status: Task['status']): Promise<Task[]> {
    const tasks = await db.tasks.where('status').equals(status).toArray()
    return tasks.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },

  async getCompletedInMonth(year: number, month: number): Promise<Task[]> {
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 1)
    const tasks = await db.tasks.where('status').equals('completed').toArray()
    return tasks
      .filter((task) => {
        if (!task.completedAt) return false
        const completed = new Date(task.completedAt)
        return completed >= start && completed < end
      })
      .sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? ''))
  },

  async create(input: CreateTaskInput): Promise<Task> {
    const task = buildLocalTask(input, generateId())
    await db.tasks.put(task)

    try {
      const remote = await tasksRemote.create(task)
      await db.tasks.put({ ...task, ...remote, lastReminderSent: null, startNotified: false })
      return { ...task, ...remote, lastReminderSent: null, startNotified: false }
    } catch (error) {
      if (isOfflineError(error)) {
        await enqueueOp('create', task.id, task)
        return task
      }
      await db.tasks.delete(task.id)
      throw error
    }
  },

  async update(id: string, patch: UpdateTaskInput): Promise<Task | undefined> {
    const existing = await db.tasks.get(id)
    if (!existing) return undefined

    const next = applyLocalPatch(existing, patch)
    await db.tasks.put(next)

    try {
      const remote = await tasksRemote.update(id, next)
      const merged = {
        ...next,
        ...remote,
        lastReminderSent: next.lastReminderSent,
        startNotified: next.startNotified,
      }
      await db.tasks.put(merged)
      return merged
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // server won — pull handled in tasksRemote.update returning server task
        return next
      }
      if (isOfflineError(error)) {
        await enqueueOp('update', id, next)
        return next
      }
      throw error
    }
  },

  async complete(id: string): Promise<Task | undefined> {
    const existing = await db.tasks.get(id)
    if (!existing) return undefined

    const completedAt = new Date().toISOString()
    const next: Task = {
      ...existing,
      status: 'completed',
      completedAt,
      updatedAt: completedAt,
    }
    await db.tasks.put(next)

    try {
      const remote = await tasksRemote.complete(id)
      const merged = { ...next, ...remote }
      await db.tasks.put(merged)
      return merged
    } catch (error) {
      if (isOfflineError(error)) {
        await enqueueOp('complete', id, { id })
        return next
      }
      throw error
    }
  },

  async remove(id: string): Promise<void> {
    const existing = await db.tasks.get(id)
    await db.tasks.delete(id)

    try {
      await tasksRemote.remove(id)
    } catch (error) {
      if (isOfflineError(error)) {
        await enqueueOp('delete', id, { id })
        return
      }
      if (existing) await db.tasks.put(existing)
      throw error
    }
  },

  async replaceAll(tasks: Task[]): Promise<void> {
    await db.transaction('rw', db.tasks, async () => {
      await db.tasks.clear()
      if (tasks.length) await db.tasks.bulkPut(tasks)
    })
  },
}
