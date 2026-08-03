import { createDefaultSettings } from '@/db/defaults'
import { db, ensureSettings } from '@/db'
import type { Settings } from '@/db/types'

export const settingsApi = {
  async get(): Promise<Settings> {
    return ensureSettings()
  },

  async update(patch: Partial<Omit<Settings, 'id'>>): Promise<Settings> {
    const current = await ensureSettings()
    const next: Settings = {
      ...current,
      ...patch,
      id: 'app',
      workSchedule: patch.workSchedule ?? current.workSchedule,
      exceptions: patch.exceptions ?? current.exceptions,
      newTaskReminder: patch.newTaskReminder
        ? { ...current.newTaskReminder, ...patch.newTaskReminder }
        : current.newTaskReminder,
    }
    await db.settings.put(next)
    return next
  },

  async reset(): Promise<Settings> {
    const defaults = createDefaultSettings()
    await db.settings.put(defaults)
    return defaults
  },
}
