import { useEffect, useState } from 'react'
import {
  THEME_CHANGE_EVENT,
  getThemePreference,
  setThemePreference,
  type ThemePreference,
} from '@/lib/theme'

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    getThemePreference(),
  )

  useEffect(() => {
    const sync = () => setPreferenceState(getThemePreference())
    window.addEventListener(THEME_CHANGE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const setPreference = (next: ThemePreference) => {
    setThemePreference(next)
    setPreferenceState(next)
  }

  return { preference, setPreference }
}
