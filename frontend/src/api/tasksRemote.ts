import { apiFetch, ApiError } from '@/api/client'
import type { CreateTaskInput, Task, UpdateTaskInput } from '@/db/types'

type TasksResponse = { success: boolean; tasks: Task[] }
type TaskResponse = { success: boolean; task: Task }

function toApiTask(task: Task) {
  return {
    id: task.id,
    title: task.title,
    quantity: task.quantity,
    coefficient: task.coefficient,
    reminderInterval: task.reminderInterval,
    startTime: task.startTime,
    deadline: task.deadline,
    status: task.status,
    createdAt: task.createdAt,
    completedAt: task.completedAt,
    updatedAt: task.updatedAt,
  }
}

export const tasksRemote = {
  async list(): Promise<Task[]> {
    const res = await apiFetch<TasksResponse>('/api/tasks')
    return (res?.tasks ?? []).map(normalizeTask)
  },

  async create(task: Task): Promise<Task> {
    const res = await apiFetch<TaskResponse>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(toApiTask(task)),
    })
    if (!res?.task) throw new Error('create: empty response')
    return normalizeTask(res.task)
  },

  async update(id: string, task: Task): Promise<Task> {
    try {
      const res = await apiFetch<TaskResponse>(`/api/tasks/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(toApiTask(task)),
      })
      if (!res?.task) throw new Error('update: empty response')
      return normalizeTask(res.task)
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        try {
          const body = JSON.parse(error.message) as { task?: Task }
          if (body.task) return normalizeTask(body.task)
        } catch {
          // fall through
        }
      }
      throw error
    }
  },

  async complete(id: string): Promise<Task> {
    const res = await apiFetch<TaskResponse>(
      `/api/tasks/${encodeURIComponent(id)}/complete`,
      { method: 'POST' },
    )
    if (!res?.task) throw new Error('complete: empty response')
    return normalizeTask(res.task)
  },

  async remove(id: string): Promise<void> {
    await apiFetch(`/api/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },
}

export function buildLocalTask(input: CreateTaskInput, id: string): Task {
  const now = new Date().toISOString()
  return {
    id,
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
}

export function applyLocalPatch(existing: Task, patch: UpdateTaskInput): Task {
  const next: Task = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  if (next.status === 'completed' && !next.completedAt) {
    next.completedAt = existing.completedAt ?? new Date().toISOString()
  }
  if (next.status !== 'completed') {
    next.completedAt = next.status === existing.status ? next.completedAt : null
  }
  return next
}

function normalizeTask(raw: Task): Task {
  return {
    id: raw.id,
    title: raw.title,
    quantity: raw.quantity,
    coefficient: raw.coefficient,
    reminderInterval: raw.reminderInterval,
    startTime: raw.startTime ?? null,
    deadline: raw.deadline ?? null,
    status: raw.status,
    createdAt: raw.createdAt,
    completedAt: raw.completedAt ?? null,
    updatedAt: raw.updatedAt,
    lastReminderSent: raw.lastReminderSent ?? null,
    startNotified: Boolean(raw.startNotified),
  }
}
