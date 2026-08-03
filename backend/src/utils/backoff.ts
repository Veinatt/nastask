/** Exponential-ish backoff for failed Telegram sends: 1m → 5m → 15m → 1h (cap). */
export function nextBackoffSec(failCount: number): number {
  const steps = [60, 5 * 60, 15 * 60, 60 * 60]
  const index = Math.min(Math.max(failCount - 1, 0), steps.length - 1)
  return steps[index] ?? 60 * 60
}

export function computeNextRetryAt(nowSec: number, failCount: number): number {
  return nowSec + nextBackoffSec(failCount)
}
