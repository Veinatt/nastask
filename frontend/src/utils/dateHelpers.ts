/** Localized month label, e.g. «август 2026» */
export function monthLabel(year: number, month: number, locale = 'ru-RU'): string {
  const d = new Date(year, month - 1, 1)
  const label = d.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
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
