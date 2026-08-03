import { useLiveQuery } from 'dexie-react-hooks'
import { settingsApi } from '@/api/settingsApi'
import { createDefaultSettings } from '@/db/defaults'
import type { Settings } from '@/db/types'

export function useSettings() {
  const settings = useLiveQuery(() => settingsApi.get(), [])

  return {
    settings: (settings ?? createDefaultSettings()) as Settings,
    isLoading: settings === undefined,
    updateSettings: (patch: Partial<Omit<Settings, 'id'>>) => settingsApi.update(patch),
  }
}
