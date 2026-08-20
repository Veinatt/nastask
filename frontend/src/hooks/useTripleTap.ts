import { useCallback, useRef } from 'react'

const WINDOW_MS = 600
const TAPS = 3

/** Fire `onTriple` after 3 clicks/taps within WINDOW_MS. */
export function useTripleTap(onTriple: () => void) {
  const timesRef = useRef<number[]>([])
  const onTripleRef = useRef(onTriple)
  onTripleRef.current = onTriple

  return useCallback((e?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
    e?.stopPropagation?.()
    const now = Date.now()
    timesRef.current = [...timesRef.current.filter((t) => now - t < WINDOW_MS), now]
    if (timesRef.current.length >= TAPS) {
      timesRef.current = []
      onTripleRef.current()
    }
  }, [])
}
