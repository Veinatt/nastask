import { apiFetch } from '@/api/client'
import { createDefaultSettings } from '@/db/defaults'
import { db, ensureSettings } from '@/db'
import type { Settings } from '@/db/types'

export async function syncSettingsToBackend(
  userId: number,
  settings: Settings,
): Promise<void> {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Moscow'
  await apiFetch('/api/settings', {
    method: 'PUT',
    body: JSON.stringify({
      userId,
      workSchedule: settings.workSchedule,
      exceptions: settings.exceptions,
      newTaskReminder: settings.newTaskReminder,
      reminderLeadTime: settings.reminderLeadTime,
      deadlineLeadTime: settings.deadlineLeadTime,
      timezone,
    }),
  })
}

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
