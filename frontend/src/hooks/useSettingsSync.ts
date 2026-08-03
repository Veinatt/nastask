import { useEffect, useRef } from 'react'
import { ensureSettings } from '@/db'
import { syncSettingsToBackend } from '@/api/settingsApi'
import { useTelegram } from '@/hooks/useTelegram'

/** Pushes local settings to the server once per user session. */
export function useSettingsSync() {
  const { userId } = useTelegram()
  const syncedFor = useRef<number | null>(null)

  useEffect(() => {
    if (userId == null) return
    if (syncedFor.current === userId) return

    syncedFor.current = userId
    void (async () => {
      try {
        const settings = await ensureSettings()
        await syncSettingsToBackend(userId, settings)
        console.log('[settings] synced to backend on launch')
      } catch (error) {
        console.error('[settings] launch sync failed', error)
        syncedFor.current = null
      }
    })()
  }, [userId])
}
