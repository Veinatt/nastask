import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { config } from '../config'
import { runMigrations } from './migrate'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database is not initialized. Call initDb() first.')
  }
  return db
}

export function initDb(databasePath = config.databasePath): Database.Database {
  console.log('[boot:db] 1/3 prepare directory')
  const dir = path.dirname(databasePath)
  fs.mkdirSync(dir, { recursive: true })

  console.log(`[boot:db] 2/3 open SQLite: ${databasePath}`)
  db = new Database(databasePath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  console.log('[boot:db] 3/3 migrate schema')
  runMigrations(db)

  console.log('[boot:db] READY')
  return db
}

export function closeDb(): void {
  if (db) {
    console.log('[boot:db] closing')
    db.close()
    db = null
  }
}
