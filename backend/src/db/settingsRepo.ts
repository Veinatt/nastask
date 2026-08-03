import { getDb } from './index'
import {
  createDefaultUserSettings,
  type NewTaskReminderSettings,
  type ScheduleException,
  type UserSettings,
  type UserSettingsRow,
  type WorkScheduleMap,
} from '../types'
import { nowSec } from '../utils/time'

function parseRow(row: UserSettingsRow): UserSettings {
  return {
    userId: row.userId,
    workSchedule: JSON.parse(row.workSchedule) as WorkScheduleMap,
    exceptions: JSON.parse(row.exceptions || '[]') as ScheduleException[],
    newTaskReminder: JSON.parse(row.newTaskReminder) as NewTaskReminderSettings,
    reminderLeadTime: row.reminderLeadTime,
    deadlineLeadTime: row.deadlineLeadTime ?? 1,
    nextNewTaskNotify:
      row.nextNewTaskNotify == null ? null : Number(row.nextNewTaskNotify),
    timezone: row.timezone || 'Europe/Moscow',
    newTaskFailCount: row.newTaskFailCount ?? 0,
    newTaskNextRetryAt:
      row.newTaskNextRetryAt == null ? null : Number(row.newTaskNextRetryAt),
    updatedAt: row.updatedAt,
  }
}

export const settingsRepo = {
  get(userId: number): UserSettings | undefined {
    const row = getDb()
      .prepare('SELECT * FROM user_settings WHERE userId = ?')
      .get(userId) as UserSettingsRow | undefined
    return row ? parseRow(row) : undefined
  },

  getOrCreate(userId: number): UserSettings {
    const existing = this.get(userId)
    if (existing) return existing

    const defaults = createDefaultUserSettings(userId, nowSec())
    this.upsert(defaults)
    console.log(`[settings] created defaults for userId=${userId}`)
    return defaults
  },

  upsert(settings: Omit<UserSettings, 'updatedAt'> & { updatedAt?: number }): UserSettings {
    const updatedAt = settings.updatedAt ?? nowSec()
    getDb()
      .prepare(
        `
        INSERT INTO user_settings (
          userId, workSchedule, exceptions, newTaskReminder,
          reminderLeadTime, deadlineLeadTime, nextNewTaskNotify,
          timezone, newTaskFailCount, newTaskNextRetryAt, updatedAt
        ) VALUES (
          @userId, @workSchedule, @exceptions, @newTaskReminder,
          @reminderLeadTime, @deadlineLeadTime, @nextNewTaskNotify,
          @timezone, @newTaskFailCount, @newTaskNextRetryAt, @updatedAt
        )
        ON CONFLICT(userId) DO UPDATE SET
          workSchedule = excluded.workSchedule,
          exceptions = excluded.exceptions,
          newTaskReminder = excluded.newTaskReminder,
          reminderLeadTime = excluded.reminderLeadTime,
          deadlineLeadTime = excluded.deadlineLeadTime,
          nextNewTaskNotify = excluded.nextNewTaskNotify,
          timezone = excluded.timezone,
          newTaskFailCount = excluded.newTaskFailCount,
          newTaskNextRetryAt = excluded.newTaskNextRetryAt,
          updatedAt = excluded.updatedAt
        `,
      )
      .run({
        userId: settings.userId,
        workSchedule: JSON.stringify(settings.workSchedule),
        exceptions: JSON.stringify(settings.exceptions),
        newTaskReminder: JSON.stringify(settings.newTaskReminder),
        reminderLeadTime: settings.reminderLeadTime,
        deadlineLeadTime: settings.deadlineLeadTime,
        nextNewTaskNotify: settings.nextNewTaskNotify,
        timezone: settings.timezone || 'Europe/Moscow',
        newTaskFailCount: settings.newTaskFailCount ?? 0,
        newTaskNextRetryAt: settings.newTaskNextRetryAt,
        updatedAt,
      })

    const saved = this.get(settings.userId)
    if (!saved) throw new Error(`Failed to upsert settings for userId=${settings.userId}`)
    console.log(`[settings] upserted userId=${settings.userId} tz=${saved.timezone}`)
    return saved
  },

  updateNextNewTaskNotify(userId: number, nextNewTaskNotify: number | null): void {
    getDb()
      .prepare(
        `
        UPDATE user_settings
        SET nextNewTaskNotify = ?, newTaskFailCount = 0, newTaskNextRetryAt = NULL
        WHERE userId = ?
        `,
      )
      .run(nextNewTaskNotify, userId)
  },

  markNewTaskSendFailure(userId: number, failCount: number, nextRetryAt: number): void {
    getDb()
      .prepare(
        `
        UPDATE user_settings
        SET newTaskFailCount = ?, newTaskNextRetryAt = ?
        WHERE userId = ?
        `,
      )
      .run(failCount, nextRetryAt, userId)
  },

  findDueNewTaskReminders(now: number): UserSettings[] {
    const rows = getDb()
      .prepare(
        `
        SELECT * FROM user_settings
        WHERE nextNewTaskNotify IS NOT NULL
          AND nextNewTaskNotify <= ?
          AND (newTaskNextRetryAt IS NULL OR newTaskNextRetryAt <= ?)
        `,
      )
      .all(now, now) as UserSettingsRow[]

    return rows.map(parseRow).filter((s) => s.newTaskReminder.enabled)
  },
}
