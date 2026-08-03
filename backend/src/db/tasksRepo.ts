import { getDb } from './index'
import type { ReminderInterval } from '../types'

export type TaskStatus = 'active' | 'completed' | 'cancelled'

export interface TaskRow {
  id: string
  userId: number
  title: string
  quantity: number
  coefficient: number
  reminderInterval: ReminderInterval
  startTime: string | null
  deadline: string | null
  status: TaskStatus
  createdAt: string
  completedAt: string | null
  updatedAt: string
}

export type TaskInput = {
  id: string
  userId: number
  title: string
  quantity: number
  coefficient: number
  reminderInterval: ReminderInterval
  startTime: string | null
  deadline: string | null
  status: TaskStatus
  createdAt: string
  completedAt: string | null
  updatedAt: string
}

function nowIso(): string {
  return new Date().toISOString()
}

export const tasksRepo = {
  listByUser(userId: number): TaskRow[] {
    return getDb()
      .prepare('SELECT * FROM tasks WHERE userId = ? ORDER BY updatedAt DESC')
      .all(userId) as TaskRow[]
  },

  getById(id: string): TaskRow | undefined {
    return getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined
  },

  upsert(input: TaskInput): TaskRow {
    getDb()
      .prepare(
        `
        INSERT INTO tasks (
          id, userId, title, quantity, coefficient, reminderInterval,
          startTime, deadline, status, createdAt, completedAt, updatedAt
        ) VALUES (
          @id, @userId, @title, @quantity, @coefficient, @reminderInterval,
          @startTime, @deadline, @status, @createdAt, @completedAt, @updatedAt
        )
        ON CONFLICT(id) DO UPDATE SET
          userId = excluded.userId,
          title = excluded.title,
          quantity = excluded.quantity,
          coefficient = excluded.coefficient,
          reminderInterval = excluded.reminderInterval,
          startTime = excluded.startTime,
          deadline = excluded.deadline,
          status = excluded.status,
          completedAt = excluded.completedAt,
          updatedAt = excluded.updatedAt
        `,
      )
      .run(input)

    const row = this.getById(input.id)
    if (!row) throw new Error(`Failed to upsert task ${input.id}`)
    return row
  },

  complete(id: string, completedAt = nowIso()): TaskRow | undefined {
    const existing = this.getById(id)
    if (!existing) return undefined

    const updatedAt = nowIso()
    getDb()
      .prepare(
        `
        UPDATE tasks
        SET status = 'completed', completedAt = ?, updatedAt = ?
        WHERE id = ?
        `,
      )
      .run(completedAt, updatedAt, id)

    return this.getById(id)
  },

  delete(id: string): boolean {
    const result = getDb().prepare('DELETE FROM tasks WHERE id = ?').run(id)
    return result.changes > 0
  },
}
