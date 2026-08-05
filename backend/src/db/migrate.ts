import type Database from 'better-sqlite3'

function tableExists(db: Database.Database, name: string): boolean {
  const row = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(name) as { name: string } | undefined
  return Boolean(row)
}

function columnNames(db: Database.Database, table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map(
    (c) => c.name,
  )
}

/**
 * Drops legacy task/reminder schema once; ensures time-tracker tables.
 */
export function runMigrations(db: Database.Database): void {
  console.log('[migrate] drop legacy task/reminder tables')
  db.exec(`
    DROP TABLE IF EXISTS reminders;
    DROP TABLE IF EXISTS tasks;
  `)

  // Old user_settings had workSchedule — incompatible, recreate
  if (tableExists(db, 'user_settings')) {
    const cols = columnNames(db, 'user_settings')
    if (cols.includes('workSchedule') || !cols.includes('hourlyRate')) {
      console.log('[migrate] recreate incompatible user_settings')
      db.exec('DROP TABLE user_settings')
    }
  }

  console.log('[migrate] ensure time-tracker schema')
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      userId INTEGER PRIMARY KEY,
      hourlyRate REAL NOT NULL DEFAULT 0,
      taxRate REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'BYN',
      timezone TEXT NOT NULL DEFAULT 'Europe/Moscow',
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS time_entries (
      id TEXT PRIMARY KEY,
      userId INTEGER NOT NULL,
      title TEXT NOT NULL,
      coefficient REAL NOT NULL DEFAULT 1,
      start TEXT NOT NULL,
      end TEXT,
      totalSeconds INTEGER NOT NULL DEFAULT 0,
      pauseTotalSeconds INTEGER NOT NULL DEFAULT 0,
      pauseStartedAt TEXT,
      date TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(userId);
    CREATE INDEX IF NOT EXISTS idx_time_entries_user_date ON time_entries(userId, date);

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      userId INTEGER NOT NULL,
      name TEXT NOT NULL,
      UNIQUE(userId, name)
    );

    CREATE TABLE IF NOT EXISTS work_descriptions (
      id TEXT PRIMARY KEY,
      userId INTEGER NOT NULL,
      name TEXT NOT NULL,
      UNIQUE(userId, name)
    );

    CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY,
      userId INTEGER NOT NULL,
      name TEXT NOT NULL,
      UNIQUE(userId, name)
    );

    CREATE TABLE IF NOT EXISTS work_items (
      id TEXT PRIMARY KEY,
      timeEntryId TEXT NOT NULL,
      categoryId TEXT NOT NULL,
      descriptionId TEXT NOT NULL,
      quantity REAL NOT NULL,
      unitId TEXT NOT NULL,
      FOREIGN KEY (timeEntryId) REFERENCES time_entries(id) ON DELETE CASCADE,
      FOREIGN KEY (categoryId) REFERENCES categories(id),
      FOREIGN KEY (descriptionId) REFERENCES work_descriptions(id),
      FOREIGN KEY (unitId) REFERENCES units(id)
    );
    CREATE INDEX IF NOT EXISTS idx_work_items_entry ON work_items(timeEntryId);

    CREATE TABLE IF NOT EXISTS expense_articles (
      id TEXT PRIMARY KEY,
      userId INTEGER NOT NULL,
      name TEXT NOT NULL,
      UNIQUE(userId, name)
    );

    CREATE TABLE IF NOT EXISTS salary_expenses (
      id TEXT PRIMARY KEY,
      userId INTEGER NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_salary_expenses_user_ym
      ON salary_expenses(userId, year, month);
  `)

  console.log('[migrate] READY')
}
