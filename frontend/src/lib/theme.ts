export type ThemePreference = 'light' | 'dark'

const STORAGE_KEY = 'nastask-theme'
export const THEME_CHANGE_EVENT = 'nastask-theme'

export function getThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === 'light' || value === 'dark') return value
    /* Migrate removed prefs */
    if (value === 'cozy' || value === 'system') return 'light'
  } catch {
    /* ignore */
  }
  return 'light'
}

export function setThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, preference)
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
}

/** Apply theme class on <html>: dark | none (light). */
export function applyTheme(preference: ThemePreference): void {
  const root = document.documentElement
  root.classList.remove('cozy')
  root.classList.toggle('dark', preference === 'dark')
}
