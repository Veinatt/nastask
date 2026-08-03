import Dexie, { type EntityTable } from 'dexie'
import { createDefaultSettings } from './defaults'
import type { PendingOp, Settings, Task } from './types'

export class NasTaskDB extends Dexie {
  tasks!: EntityTable<Task, 'id'>
  settings!: EntityTable<Settings, 'id'>
  pendingOps!: EntityTable<PendingOp, 'id'>

  constructor() {
    super('nastask')
    this.version(1).stores({
      tasks: 'id, status, completedAt, [status+completedAt], updatedAt',
      settings: 'id',
    })
    this.version(2).stores({
      tasks: 'id, status, completedAt, [status+completedAt], updatedAt',
      settings: 'id',
      pendingOps: 'id, taskId, createdAt',
    })
  }
}

export const db = new NasTaskDB()

/** Ensures settings singleton exists and fills new fields for older records. */
export async function ensureSettings(): Promise<Settings> {
  const defaults = createDefaultSettings()
  const existing = await db.settings.get('app')
  if (!existing) {
    await db.settings.put(defaults)
    return defaults
  }

  const merged: Settings = {
    ...defaults,
    ...existing,
    newTaskReminder: {
      ...defaults.newTaskReminder,
      ...existing.newTaskReminder,
    },
    deadlineLeadTime: existing.deadlineLeadTime ?? defaults.deadlineLeadTime,
    reminderLeadTime: existing.reminderLeadTime ?? defaults.reminderLeadTime,
  }

  if (existing.deadlineLeadTime == null) {
    await db.settings.put(merged)
  }

  return merged
}

ensureSettings().catch(console.error)
