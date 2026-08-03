import Dexie, { type EntityTable } from 'dexie'
import { createDefaultSettings } from './defaults'
import type { Settings, Task } from './types'

export class NasTaskDB extends Dexie {
  tasks!: EntityTable<Task, 'id'>
  settings!: EntityTable<Settings, 'id'>

  constructor() {
    super('nastask')
    this.version(1).stores({
      tasks: 'id, status, completedAt, [status+completedAt], updatedAt',
      settings: 'id',
    })
  }
}

export const db = new NasTaskDB()

/** Ensures settings singleton exists. */
export async function ensureSettings(): Promise<Settings> {
  const existing = await db.settings.get('app')
  if (existing) return existing
  const defaults = createDefaultSettings()
  await db.settings.put(defaults)
  return defaults
}

ensureSettings().catch(console.error)
