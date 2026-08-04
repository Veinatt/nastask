import { ru as dfRu } from 'date-fns/locale/ru'
import { be as dfBe } from 'date-fns/locale/be'
import type { Locale as DateFnsLocale } from 'date-fns'
import { be } from '@/locales/be'
import { ru } from '@/locales/ru'

export type AppLocale = 'ru' | 'be'

const STORAGE_KEY = 'nastask-locale'
export const LOCALE_CHANGE_EVENT = 'nastask-locale'

const dictionaries = { ru, be } as const

export function getLocale(): AppLocale {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === 'ru' || value === 'be') return value
  } catch {
    /* ignore */
  }
  return 'ru'
}

export function setLocale(locale: AppLocale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    /* ignore */
  }
  document.documentElement.lang = locale === 'be' ? 'be' : 'ru'
  window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT))
}

export function t(
  key: string,
  params?: Record<string, string | number>,
  locale: AppLocale = getLocale(),
): string {
  const dict = dictionaries[locale] as Record<string, string>
  let text = dict[key] ?? (dictionaries.ru as Record<string, string>)[key] ?? key
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{{${name}}}`, String(value))
    }
  }
  return text
}

export function intlLocale(locale: AppLocale = getLocale()): string {
  return locale === 'be' ? 'be-BY' : 'ru-RU'
}

export function dateFnsLocale(locale: AppLocale = getLocale()): DateFnsLocale {
  return locale === 'be' ? dfBe : dfRu
}

/** Apply html lang as early as possible */
try {
  document.documentElement.lang = getLocale() === 'be' ? 'be' : 'ru'
} catch {
  /* ignore */
}
