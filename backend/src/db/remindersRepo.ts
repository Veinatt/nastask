import { getDb } from './index'
import type { ReminderInterval, ReminderRow, UpsertReminderInput } from '../types'

export const remindersRepo = {
  upsert(input: UpsertReminderInput): { row: ReminderRow; created: boolean } {
    const existing = this.getByTaskId(input.taskId)
    const created = !existing
    const deadlineChanged = !created && existing?.deadline !== input.deadline

    getDb()
      .prepare(
        `
        INSERT INTO reminders (
          taskId, userId, title, nextNotify, interval, startTime, deadline,
          deadlineWarned, failCount, nextRetryAt
        ) VALUES (
          @taskId, @userId, @title, @nextNotify, @interval, @startTime, @deadline,
          0, 0, NULL
        )
        ON CONFLICT(taskId) DO UPDATE SET
          userId = excluded.userId,
          title = excluded.title,
          nextNotify = excluded.nextNotify,
          interval = excluded.interval,
          startTime = excluded.startTime,
          deadline = excluded.deadline,
          deadlineWarned = CASE
            WHEN excluded.deadline IS NOT reminders.deadline THEN 0
            ELSE reminders.deadlineWarned
          END,
          failCount = CASE
            WHEN excluded.deadline IS NOT reminders.deadline THEN 0
            ELSE reminders.failCount
          END,
          nextRetryAt = CASE
            WHEN excluded.deadline IS NOT reminders.deadline THEN NULL
            ELSE reminders.nextRetryAt
          END
        `,
      )
      .run({
        taskId: input.taskId,
        userId: input.userId,
        title: input.title,
        nextNotify: input.nextNotify,
        interval: input.interval,
        startTime: input.startTime,
        deadline: input.deadline,
      })

    if (deadlineChanged) {
      console.log(`[reminders] deadline changed for taskId=${input.taskId} — reset deadlineWarned`)
    }

    const row = this.getByTaskId(input.taskId)
    if (!row) throw new Error(`Failed to upsert reminder ${input.taskId}`)
    return { row, created }
  },

  getByTaskId(taskId: string): ReminderRow | undefined {
    return getDb()
      .prepare('SELECT * FROM reminders WHERE taskId = ?')
      .get(taskId) as ReminderRow | undefined
  },

  findByUserId(userId: number): ReminderRow[] {
    return getDb()
      .prepare('SELECT * FROM reminders WHERE userId = ? ORDER BY nextNotify ASC')
      .all(userId) as ReminderRow[]
  },

  findWithDeadline(): ReminderRow[] {
    return getDb()
      .prepare('SELECT * FROM reminders WHERE deadline IS NOT NULL')
      .all() as ReminderRow[]
  },

  deleteByTaskId(taskId: string): boolean {
    const result = getDb().prepare('DELETE FROM reminders WHERE taskId = ?').run(taskId)
    return result.changes > 0
  },

  findDue(nowSec: number): ReminderRow[] {
    return getDb()
      .prepare(
        `
        SELECT * FROM reminders
        WHERE nextNotify <= ?
          AND (nextRetryAt IS NULL OR nextRetryAt <= ?)
        ORDER BY nextNotify ASC
        `,
      )
      .all(nowSec, nowSec) as ReminderRow[]
  },

  updateNextNotify(taskId: string, nextNotify: number): void {
    getDb()
      .prepare(
        `
        UPDATE reminders
        SET nextNotify = ?, failCount = 0, nextRetryAt = NULL
        WHERE taskId = ?
        `,
      )
      .run(nextNotify, taskId)
  },

  markSendSuccess(taskId: string): void {
    getDb()
      .prepare('UPDATE reminders SET failCount = 0, nextRetryAt = NULL WHERE taskId = ?')
      .run(taskId)
  },

  markSendFailure(taskId: string, failCount: number, nextRetryAt: number): void {
    getDb()
      .prepare('UPDATE reminders SET failCount = ?, nextRetryAt = ? WHERE taskId = ?')
      .run(failCount, nextRetryAt, taskId)
  },

  markDeadlineWarned(taskId: string): void {
    getDb().prepare('UPDATE reminders SET deadlineWarned = 1 WHERE taskId = ?').run(taskId)
  },
}

export type { ReminderInterval }
