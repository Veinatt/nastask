import { apiFetch } from '@/api/client'
import { db, ensureSettings } from '@/db'
import type { UserSettings } from '@/db/types'

type RemoteSettings = {
  userId: number
  hourlyRate: number
  taxRate: number
  currency: string
  timezone: string
  updatedAt: string
}

function toLocal(remote: RemoteSettings): UserSettings {
  return {
    id: 'app',
    hourlyRate: remote.hourlyRate,
    taxRate: remote.taxRate,
    currency: remote.currency,
    timezone: remote.timezone,
    updatedAt: remote.updatedAt,
  }
}

export const settingsRemote = {
  async get(): Promise<UserSettings> {
    const res = await apiFetch<{ success: true; settings: RemoteSettings }>('/api/settings')
    return toLocal(res!.settings)
  },

  async put(
    patch: Partial<Pick<UserSettings, 'hourlyRate' | 'taxRate' | 'currency' | 'timezone'>>,
  ): Promise<UserSettings> {
    const res = await apiFetch<{ success: true; settings: RemoteSettings }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(patch),
    })
    return toLocal(res!.settings)
  },
}

export const settingsLocal = {
  async get(): Promise<UserSettings> {
    return ensureSettings()
  },

  async put(settings: UserSettings): Promise<UserSettings> {
    await db.settings.put({ ...settings, id: 'app' })
    return settings
  },
}
