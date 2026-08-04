export type ThemePreference = 'light' | 'dark' | 'system' | 'cozy'

const STORAGE_KEY = 'nastask-theme'
export const THEME_CHANGE_EVENT = 'nastask-theme'

const THEME_CLASSES = ['dark', 'cozy'] as const

export function getThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (
      value === 'light' ||
      value === 'dark' ||
      value === 'system' ||
      value === 'cozy'
    ) {
      return value
    }
  } catch {
    /* ignore */
  }
  return 'system'
}

export function setThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, preference)
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
}

export function resolveIsDark(
  preference: ThemePreference,
  telegramIsDark?: boolean | null,
): boolean {
  if (preference === 'light' || preference === 'cozy') return false
  if (preference === 'dark') return true
  if (typeof telegramIsDark === 'boolean') return telegramIsDark
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** Apply theme classes on <html>: dark | cozy | none (light). */
export function applyTheme(
  preference: ThemePreference,
  telegramIsDark?: boolean | null,
): void {
  const root = document.documentElement
  for (const cls of THEME_CLASSES) {
    root.classList.remove(cls)
  }
  if (preference === 'cozy') {
    root.classList.add('cozy')
    return
  }
  root.classList.toggle('dark', resolveIsDark(preference, telegramIsDark))
}

/** @deprecated use applyTheme */
export function applyColorScheme(isDark: boolean): void {
  const root = document.documentElement
  root.classList.remove('cozy')
  root.classList.toggle('dark', isDark)
}
