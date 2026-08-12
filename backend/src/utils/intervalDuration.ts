/**
 * Recompute work/pause when the calendar frame (start–end) changes.
 * - Compress: keep work if possible, shrink pause first.
 * - Expand: keep pause, add the extra time to work.
 */
export function recomputeWorkAndPause(opts: {
  wallSeconds: number
  prevTotalSeconds: number
  prevPauseSeconds: number
}): { totalSeconds: number; pauseTotalSeconds: number } {
  const wall = Math.max(0, Math.floor(opts.wallSeconds))
  const prevWork = Math.max(0, Math.floor(opts.prevTotalSeconds))
  const prevPause = Math.max(0, Math.floor(opts.prevPauseSeconds))
  const prevSpan = prevWork + prevPause

  if (wall >= prevSpan) {
    // Expanded (or same span): keep pause, extra → work
    const pauseTotalSeconds = Math.min(prevPause, wall)
    return {
      totalSeconds: wall - pauseTotalSeconds,
      pauseTotalSeconds,
    }
  }

  // Compressed: preserve work, shrink pause
  const totalSeconds = Math.min(prevWork, wall)
  return {
    totalSeconds,
    pauseTotalSeconds: wall - totalSeconds,
  }
}

/**
 * Edit form only has minute precision (split/join drops seconds).
 * Treat same local minute as "unchanged" so notes-only saves keep pause/work.
 */
export function sameEditInstant(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (a == null && b == null) return true
  if (a == null || b == null) return false
  const ta = Date.parse(a)
  const tb = Date.parse(b)
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return a === b
  return Math.floor(ta / 60_000) === Math.floor(tb / 60_000)
}
