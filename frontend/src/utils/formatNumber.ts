/** Round to at most `maxDigits` decimal places (default 3). */
export function roundDecimal(n: number, maxDigits = 3): number {
  if (!Number.isFinite(n)) return 0
  const f = 10 ** maxDigits
  return Math.round(n * f) / f
}

/**
 * Format a decimal without float junk or trailing zeros.
 * 1.4000000000000001 → "1.4", 1.45 → "1.45", 1 → "1"
 */
export function formatDecimal(n: number, maxDigits = 3): string {
  const rounded = roundDecimal(n, maxDigits)
  if (Object.is(rounded, -0)) return '0'
  return String(rounded)
}
