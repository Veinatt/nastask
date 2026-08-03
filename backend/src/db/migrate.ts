import type Database from 'better-sqlite3'
import { createDefaultUserSettings } from '../types'
import { nowSec } from '../utils/time'

type ColumnInfo = { name: string }

function tableExists(db: Database.Database, name: string): boolean {
  const row = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(name) as { name: string } | undefined
  return Boolean(row)
}

function columnNames(db: Database.Database, table: string): string[] {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as ColumnInfo[]
  return cols.map((c) => c.name)
}

function createUserSettingsTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      userId INTEGER PRIMARY KEY,
      workSchedule TEXT NOT NULL,
      exceptions TEXT NOT NULL DEFAULT '[]',
      newTaskReminder TEXT NOT NULL,
      reminderLeadTime INTEGER NOT NULL DEFAULT 1,
      deadlineLeadTime INTEGER NOT NULL DEFAULT 1,
      nextNewTaskNotify INTEGER,
      timezone TEXT NOT NULL DEFAULT 'Europe/Moscow',
      newTaskFailCount INTEGER NOT NULL DEFAULT 0,
      newTaskNextRetryAt INTEGER,
      updatedAt INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
  `)
}

function createTasksTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      userId INTEGER NOT NULL,
      title TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      coefficient REAL NOT NULL DEFAULT 1,
      reminderInterval TEXT NOT NULL,
      startTime TEXT,
      deadline TEXT,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      completedAt TEXT,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_userId ON tasks(userId);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  `)
}

function ensureColumn(
  db: Database.Database,
  table: string,
  column: string,
  ddl: string,
): void {
  const cols = columnNames(db, table)
  if (!cols.includes(column)) {
    console.log(`[migrate] add ${table}.${column}`)
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`)
  }
}

function createSlimRemindersTableSql(tableName: string): string {
  return `
    CREATE TABLE ${tableName} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      taskId TEXT UNIQUE NOT NULL,
      userId INTEGER NOT NULL,
      title TEXT NOT NULL,
      nextNotify INTEGER NOT NULL,
      interval TEXT NOT NULL,
      startTime INTEGER,
      deadline INTEGER,
      deadlineWarned INTEGER NOT NULL DEFAULT 0,
      failCount INTEGER NOT NULL DEFAULT 0,
      nextRetryAt INTEGER,
      createdAt INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
  `
}

function ensureReminderIndexes(db: Database.Database): void {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_reminders_nextNotify ON reminders(nextNotify);
    CREATE INDEX IF NOT EXISTS idx_reminders_userId ON reminders(userId);
  `)
}

/**
 * Ensures user_settings exists and reminders schema is slim (no embedded settings).
 */
export function runMigrations(db: Database.Database): void {
  console.log('[migrate] ensure user_settings')
  createUserSettingsTable(db)
  if (tableExists(db, 'user_settings')) {
    ensureColumn(db, 'user_settings', 'deadlineLeadTime', 'deadlineLeadTime INTEGER NOT NULL DEFAULT 1')
    ensureColumn(db, 'user_settings', 'nextNewTaskNotify', 'nextNewTaskNotify INTEGER')
    ensureColumn(
      db,
      'user_settings',
      'timezone',
      "timezone TEXT NOT NULL DEFAULT 'Europe/Moscow'",
    )
    ensureColumn(db, 'user_settings', 'newTaskFailCount', 'newTaskFailCount INTEGER NOT NULL DEFAULT 0')
    ensureColumn(db, 'user_settings', 'newTaskNextRetryAt', 'newTaskNextRetryAt INTEGER')
  }

  console.log('[migrate] ensure tasks')
  createTasksTable(db)

  const hasReminders = tableExists(db, 'reminders')
  if (!hasReminders) {
    console.log('[migrate] create slim reminders')
    db.exec(createSlimRemindersTableSql('reminders'))
    ensureReminderIndexes(db)
    return
  }

  const cols = columnNames(db, 'reminders')
  const isLegacy = cols.includes('workSchedule') || cols.includes('reminderLeadTime')

  if (!isLegacy) {
    console.log('[migrate] reminders already slim')
    ensureColumn(db, 'reminders', 'deadlineWarned', 'deadlineWarned INTEGER NOT NULL DEFAULT 0')
    ensureColumn(db, 'reminders', 'failCount', 'failCount INTEGER NOT NULL DEFAULT 0')
    ensureColumn(db, 'reminders', 'nextRetryAt', 'nextRetryAt INTEGER')
    ensureReminderIndexes(db)
    return
  }

  console.log('[migrate] legacy reminders detected — migrating')

  const migrate = db.transaction(() => {
    const userIds = db
      .prepare('SELECT DISTINCT userId FROM reminders')
      .all() as Array<{ userId: number }>

    for (const { userId } of userIds) {
      const row = db
        .prepare('SELECT workSchedule, reminderLeadTime FROM reminders WHERE userId = ? LIMIT 1')
        .get(userId) as { workSchedule: string; reminderLeadTime: number } | undefined

      let workSchedule = createDefaultUserSettings(userId).workSchedule
      let exceptions: unknown[] = []
      let reminderLeadTime = 1

      if (row) {
        try {
          const parsed = JSON.parse(row.workSchedule || '{}') as Record<string, unknown>
          if (parsed && typeof parsed === 'object') {
            if ('schedule' in parsed && parsed.schedule) {
              workSchedule = parsed.schedule as typeof workSchedule
              exceptions = Array.isArray(parsed.exceptions) ? parsed.exceptions : []
            } else if ('monday' in parsed) {
              workSchedule = parsed as typeof workSchedule
            }
          }
        } catch {
          // keep defaults
        }
        if (Number.isFinite(row.reminderLeadTime)) {
          reminderLeadTime = Number(row.reminderLeadTime)
        }
      }

      const now = nowSec()
      const defaults = createDefaultUserSettings(userId, now)
      db.prepare(
        `
        INSERT OR IGNORE INTO user_settings (
          userId, workSchedule, exceptions, newTaskReminder,
          reminderLeadTime, deadlineLeadTime, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
      ).run(
        userId,
        JSON.stringify(workSchedule),
        JSON.stringify(exceptions),
        JSON.stringify(defaults.newTaskReminder),
        reminderLeadTime,
        defaults.deadlineLeadTime,
        now,
      )
    }

    db.exec(createSlimRemindersTableSql('reminders_new'))

    db.exec(`
      INSERT INTO reminders_new (
        id, taskId, userId, title, nextNotify, interval, startTime, deadline, deadlineWarned, createdAt
      )
      SELECT
        id, taskId, userId, title, nextNotify, interval, startTime, deadline, 0, createdAt
      FROM reminders;
    `)

    db.exec(`DROP TABLE reminders;`)
    db.exec(`ALTER TABLE reminders_new RENAME TO reminders;`)
    ensureReminderIndexes(db)
  })

  migrate()
  console.log('[migrate] legacy → slim reminders done')
}
