import { format } from 'date-fns'
import { dateFnsLocale, getLocale, type AppLocale } from '@/lib/i18n'

/** Localized month label via date-fns (avoids broken Intl be-BY → "2026 MO8"). */
export function monthLabel(
  year: number,
  month: number,
  locale: AppLocale = getLocale(),
): string {
  const d = new Date(year, month - 1, 1)
  const label = format(d, 'LLLL yyyy', { locale: dateFnsLocale(locale) })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function addMonthsSafe(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}
