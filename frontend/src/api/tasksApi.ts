import { db } from '@/db'
import type { CreateTaskInput, Task, UpdateTaskInput } from '@/db/types'
import { generateId } from '@/utils/idGenerator'

function nowIso(): string {
  return new Date().toISOString()
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
    const now = nowIso()
    const task: Task = {
      id: generateId(),
      title: input.title.trim(),
      quantity: input.quantity,
      coefficient: input.coefficient,
      reminderInterval: input.reminderInterval,
      startTime: input.startTime,
      deadline: input.deadline,
      status: 'active',
      createdAt: now,
      completedAt: null,
      updatedAt: now,
      lastReminderSent: null,
      startNotified: false,
    }
    await db.tasks.add(task)
    return task
  },

  async update(id: string, patch: UpdateTaskInput): Promise<Task | undefined> {
    const existing = await db.tasks.get(id)
    if (!existing) return undefined

    const next: Task = {
      ...existing,
      ...patch,
      updatedAt: nowIso(),
    }

    // Reset start notification when startTime changes while still active
    if (
      patch.startTime !== undefined &&
      patch.startTime !== existing.startTime &&
      next.status === 'active'
    ) {
      next.startNotified = false
    }

    // Reset close reminders when interval changes on active task
    if (
      patch.reminderInterval !== undefined &&
      patch.reminderInterval !== existing.reminderInterval &&
      next.status === 'active'
    ) {
      next.lastReminderSent = null
    }

    await db.tasks.put(next)
    return next
  },

  async complete(id: string): Promise<Task | undefined> {
    return this.update(id, {
      status: 'completed',
      completedAt: nowIso(),
    })
  },

  async remove(id: string): Promise<void> {
    await db.tasks.delete(id)
  },
}
