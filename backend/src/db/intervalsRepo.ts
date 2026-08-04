import { randomUUID } from 'node:crypto'
import { getDb } from './index'
import type { TimeEntry, WorkItem, WorkItemInput } from '../types'
import { dateInTimezone, nowIso, secondsBetween } from '../utils/iso'
import { settingsRepo } from './settingsRepo'

function mapEntry(row: Record<string, unknown>): TimeEntry {
  return {
    id: String(row.id),
    userId: Number(row.userId),
    title: String(row.title),
    coefficient: Number(row.coefficient),
    start: String(row.start),
    end: row.end == null ? null : String(row.end),
    totalSeconds: Number(row.totalSeconds ?? 0),
    pauseTotalSeconds: Number(row.pauseTotalSeconds ?? 0),
    pauseStartedAt: row.pauseStartedAt == null ? null : String(row.pauseStartedAt),
    date: String(row.date),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  }
}

function mapWork(row: Record<string, unknown>): WorkItem {
  return {
    id: String(row.id),
    timeEntryId: String(row.timeEntryId),
    categoryId: String(row.categoryId),
    descriptionId: String(row.descriptionId),
    quantity: Number(row.quantity),
    unitId: String(row.unitId),
  }
}

/** Working seconds as of `atIso` (wall clock minus pauses). */
export function liveTotalSeconds(entry: TimeEntry, atIso = nowIso()): number {
  if (entry.end) return entry.totalSeconds
  if (entry.pauseStartedAt) return entry.totalSeconds
  const wall = secondsBetween(entry.start, atIso)
  return Math.max(0, wall - entry.pauseTotalSeconds)
}

export const intervalsRepo = {
  get(id: string): TimeEntry | undefined {
    const row = getDb()
      .prepare('SELECT * FROM time_entries WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined
    return row ? mapEntry(row) : undefined
  },

  listActive(userId: number): TimeEntry[] {
    return (
      getDb()
        .prepare(
          'SELECT * FROM time_entries WHERE userId = ? AND end IS NULL ORDER BY start DESC',
        )
        .all(userId) as Record<string, unknown>[]
    ).map(mapEntry)
  },

  listCompletedByDate(userId: number, date: string): TimeEntry[] {
    return (
      getDb()
        .prepare(
          `
          SELECT * FROM time_entries
          WHERE userId = ? AND end IS NOT NULL AND date = ?
          ORDER BY start ASC
          `,
        )
        .all(userId, date) as Record<string, unknown>[]
    ).map(mapEntry)
  },

  listCompletedByRange(userId: number, from: string, to: string): TimeEntry[] {
    return (
      getDb()
        .prepare(
          `
          SELECT * FROM time_entries
          WHERE userId = ? AND end IS NOT NULL AND date >= ? AND date <= ?
          ORDER BY start ASC
          `,
        )
        .all(userId, from, to) as Record<string, unknown>[]
    ).map(mapEntry)
  },

  listAllCompleted(userId: number): TimeEntry[] {
    return (
      getDb()
        .prepare(
          `
          SELECT * FROM time_entries
          WHERE userId = ? AND end IS NOT NULL
          ORDER BY start DESC
          `,
        )
        .all(userId) as Record<string, unknown>[]
    ).map(mapEntry)
  },

  listCompletedInMonth(userId: number, year: number, month: number): TimeEntry[] {
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    return (
      getDb()
        .prepare(
          `
          SELECT * FROM time_entries
          WHERE userId = ? AND end IS NOT NULL AND date LIKE ?
          ORDER BY start ASC
          `,
        )
        .all(userId, `${prefix}%`) as Record<string, unknown>[]
    ).map(mapEntry)
  },

  insert(entry: TimeEntry): TimeEntry {
    getDb()
      .prepare(
        `
        INSERT INTO time_entries (
          id, userId, title, coefficient, start, end,
          totalSeconds, pauseTotalSeconds, pauseStartedAt, date, createdAt, updatedAt
        ) VALUES (
          @id, @userId, @title, @coefficient, @start, @end,
          @totalSeconds, @pauseTotalSeconds, @pauseStartedAt, @date, @createdAt, @updatedAt
        )
        `,
      )
      .run(entry)
    const saved = this.get(entry.id)
    if (!saved) throw new Error('Failed to insert time entry')
    return saved
  },

  update(entry: TimeEntry): TimeEntry {
    getDb()
      .prepare(
        `
        UPDATE time_entries SET
          title = @title,
          coefficient = @coefficient,
          start = @start,
          end = @end,
          totalSeconds = @totalSeconds,
          pauseTotalSeconds = @pauseTotalSeconds,
          pauseStartedAt = @pauseStartedAt,
          date = @date,
          updatedAt = @updatedAt
        WHERE id = @id
        `,
      )
      .run(entry)
    const saved = this.get(entry.id)
    if (!saved) throw new Error('Failed to update time entry')
    return saved
  },

  delete(id: string): boolean {
    return getDb().prepare('DELETE FROM time_entries WHERE id = ?').run(id).changes > 0
  },

  listWorkItems(timeEntryId: string): WorkItem[] {
    return (
      getDb()
        .prepare('SELECT * FROM work_items WHERE timeEntryId = ?')
        .all(timeEntryId) as Record<string, unknown>[]
    ).map(mapWork)
  },

  replaceWorkItems(timeEntryId: string, items: WorkItemInput[]): WorkItem[] {
    const db = getDb()
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM work_items WHERE timeEntryId = ?').run(timeEntryId)
      const insert = db.prepare(
        `
        INSERT INTO work_items (id, timeEntryId, categoryId, descriptionId, quantity, unitId)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
      )
      for (const item of items) {
        insert.run(
          item.id ?? randomUUID(),
          timeEntryId,
          item.categoryId,
          item.descriptionId,
          item.quantity,
          item.unitId,
        )
      }
    })
    tx()
    return this.listWorkItems(timeEntryId)
  },

  start(userId: number, title: string, id: string = randomUUID()): TimeEntry {
    const settings = settingsRepo.getOrCreate(userId)
    const start = nowIso()
    return this.insert({
      id,
      userId,
      title: title.trim(),
      coefficient: 1,
      start,
      end: null,
      totalSeconds: 0,
      pauseTotalSeconds: 0,
      pauseStartedAt: null,
      date: dateInTimezone(start, settings.timezone),
      createdAt: start,
      updatedAt: start,
    })
  },

  pause(entry: TimeEntry): TimeEntry {
    if (entry.end) throw new Error('Interval already completed')
    if (entry.pauseStartedAt) throw new Error('Already paused')
    const now = nowIso()
    const totalSeconds = liveTotalSeconds(entry, now)
    return this.update({
      ...entry,
      totalSeconds,
      pauseStartedAt: now,
      updatedAt: now,
    })
  },

  resume(entry: TimeEntry): TimeEntry {
    if (entry.end) throw new Error('Interval already completed')
    if (!entry.pauseStartedAt) throw new Error('Not paused')
    const now = nowIso()
    const pauseExtra = secondsBetween(entry.pauseStartedAt, now)
    return this.update({
      ...entry,
      pauseTotalSeconds: entry.pauseTotalSeconds + pauseExtra,
      pauseStartedAt: null,
      // totalSeconds already frozen at pause
      updatedAt: now,
    })
  },

  complete(
    entry: TimeEntry,
    opts: { coefficient: number; workItems: WorkItemInput[]; end?: string },
  ): { entry: TimeEntry; workItems: WorkItem[] } {
    if (entry.end) throw new Error('Interval already completed')
    const end = opts.end ?? nowIso()
    let pauseTotal = entry.pauseTotalSeconds
    let totalSeconds = entry.totalSeconds
    if (entry.pauseStartedAt) {
      pauseTotal += secondsBetween(entry.pauseStartedAt, end)
      // total already frozen
    } else {
      totalSeconds = liveTotalSeconds(entry, end)
    }
    const updated = this.update({
      ...entry,
      coefficient: opts.coefficient,
      end,
      totalSeconds,
      pauseTotalSeconds: pauseTotal,
      pauseStartedAt: null,
      updatedAt: end,
    })
    const workItems = this.replaceWorkItems(entry.id, opts.workItems)
    return { entry: updated, workItems }
  },
}
