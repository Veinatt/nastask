import { useLiveQuery } from 'dexie-react-hooks'
import { settingsLocal, settingsRemote } from '@/api/settingsApi'
import { enqueueOp } from '@/api/pendingOps'
import { createDefaultSettings } from '@/db/defaults'
import type { UserSettings } from '@/db/types'
import { ApiError } from '@/api/client'
import { getDeviceTimezone } from '@/utils/timeDisplay'

export function useSettings() {
  const settings =
    useLiveQuery(() => settingsLocal.get(), []) ?? createDefaultSettings()

  const updateSettings = async (
    patch: Partial<Pick<UserSettings, 'hourlyRate' | 'taxRate' | 'currency'>>,
  ) => {
    const withTz = { ...patch, timezone: getDeviceTimezone() }
    const next: UserSettings = {
      ...settings,
      ...withTz,
      id: 'app',
      updatedAt: new Date().toISOString(),
    }
    await settingsLocal.put(next)
    try {
      const remote = await settingsRemote.put(withTz)
      await settingsLocal.put(remote)
    } catch (error) {
      if (error instanceof ApiError && error.status >= 500) throw error
      if (!navigator.onLine || error instanceof TypeError) {
        await enqueueOp('settings_put', 'app', withTz)
        return
      }
      throw error
    }
  }

  return { settings, updateSettings }
}
