import { useEffect, useState } from 'react'
import {
  LOCALE_CHANGE_EVENT,
  getLocale,
  setLocale,
  t as translate,
  intlLocale,
  dateFnsLocale,
  type AppLocale,
} from '@/lib/i18n'

export function useI18n() {
  const [locale, setLocaleState] = useState<AppLocale>(() => getLocale())

  useEffect(() => {
    const sync = () => setLocaleState(getLocale())
    window.addEventListener(LOCALE_CHANGE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(LOCALE_CHANGE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const setLanguage = (next: AppLocale) => {
    setLocale(next)
    setLocaleState(next)
  }

  const t = (key: string, params?: Record<string, string | number>) =>
    translate(key, params, locale)

  return {
    locale,
    setLocale: setLanguage,
    t,
    intlLocale: intlLocale(locale),
    dateFnsLocale: dateFnsLocale(locale),
  }
}
