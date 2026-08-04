import Dexie, { type EntityTable } from 'dexie'
import { createDefaultSettings } from './defaults'
import type {
  DictItem,
  PendingOp,
  TimeEntry,
  UserSettings,
  WorkItem,
} from './types'

export class NasTaskDB extends Dexie {
  timeEntries!: EntityTable<TimeEntry, 'id'>
  workItems!: EntityTable<WorkItem, 'id'>
  categories!: EntityTable<DictItem, 'id'>
  descriptions!: EntityTable<DictItem, 'id'>
  units!: EntityTable<DictItem, 'id'>
  settings!: EntityTable<UserSettings, 'id'>
  pendingOps!: EntityTable<PendingOp, 'id'>

  constructor() {
    super('nastask')
    // Legacy task tracker schema (v1–v2) — wiped on upgrade
    this.version(1).stores({
      tasks: 'id, status, completedAt, [status+completedAt], updatedAt',
      settings: 'id',
    })
    this.version(2).stores({
      tasks: 'id, status, completedAt, [status+completedAt], updatedAt',
      settings: 'id',
      pendingOps: 'id, taskId, createdAt',
    })
    this.version(3)
      .stores({
        timeEntries: 'id, date, end, updatedAt',
        workItems: 'id, timeEntryId',
        categories: 'id, name',
        descriptions: 'id, name',
        units: 'id, name',
        settings: 'id',
        pendingOps: 'id, entityId, createdAt',
        tasks: null,
      })
      .upgrade(async (tx) => {
        await tx.table('settings').clear()
        await tx.table('pendingOps').clear()
      })
  }
}

export const db = new NasTaskDB()

export async function ensureSettings(): Promise<UserSettings> {
  const defaults = createDefaultSettings()
  const existing = await db.settings.get('app')
  if (!existing) {
    await db.settings.put(defaults)
    return defaults
  }
  const merged: UserSettings = { ...defaults, ...existing, id: 'app' }
  if (
    existing.hourlyRate == null ||
    existing.currency == null ||
    existing.timezone == null
  ) {
    await db.settings.put(merged)
  }
  return merged
}

ensureSettings().catch(console.error)
