import { useEffect, useRef, type RefObject } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const MIN_DX = 64
const MAX_DURATION_MS = 700
const HORIZONTAL_RATIO = 1.35

function normalizePath(pathname: string): string {
  if (pathname === '' || pathname === '/') return '/'
  return pathname.replace(/\/$/, '') || '/'
}

function shouldIgnoreTarget(target: EventTarget | null): boolean {
  const el = target instanceof Element ? target : null
  if (!el) return false
  if (el.closest('[data-no-swipe]')) return true
  if (el.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], [role="slider"]')) {
    return true
  }

  let node: HTMLElement | null = el as HTMLElement
  while (node && node !== document.body) {
    const { overflowX } = getComputedStyle(node)
    if (
      (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'overlay') &&
      node.scrollWidth > node.clientWidth + 4
    ) {
      return true
    }
    node = node.parentElement
  }
  return false
}

/** Horizontal swipe between primary app tabs (mobile). */
export function useSwipeNavigation(
  routes: readonly string[],
  containerRef: RefObject<HTMLElement | null>,
) {
  const navigate = useNavigate()
  const location = useLocation()
  const startRef = useRef<{
    x: number
    y: number
    t: number
    ignore: boolean
  } | null>(null)
  const pathRef = useRef(location.pathname)
  pathRef.current = location.pathname

  useEffect(() => {
    const root = containerRef.current
    if (!root) return

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        startRef.current = null
        return
      }
      const touch = e.touches[0]!
      startRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        t: Date.now(),
        ignore: shouldIgnoreTarget(e.target),
      }
    }

    const onEnd = (e: TouchEvent) => {
      const start = startRef.current
      startRef.current = null
      if (!start || start.ignore || e.changedTouches.length !== 1) return

      const touch = e.changedTouches[0]!
      const dx = touch.clientX - start.x
      const dy = touch.clientY - start.y
      const dt = Date.now() - start.t

      if (dt > MAX_DURATION_MS) return
      if (Math.abs(dx) < MIN_DX) return
      if (Math.abs(dx) < Math.abs(dy) * HORIZONTAL_RATIO) return

      const current = normalizePath(pathRef.current)
      const index = routes.findIndex((r) => normalizePath(r) === current)
      if (index < 0) return

      // Swipe left → next tab; swipe right → previous
      if (dx < 0 && index < routes.length - 1) {
        navigate(routes[index + 1]!)
      } else if (dx > 0 && index > 0) {
        navigate(routes[index - 1]!)
      }
    }

    const onCancel = () => {
      startRef.current = null
    }

    root.addEventListener('touchstart', onStart, { passive: true })
    root.addEventListener('touchend', onEnd, { passive: true })
    root.addEventListener('touchcancel', onCancel, { passive: true })

    return () => {
      root.removeEventListener('touchstart', onStart)
      root.removeEventListener('touchend', onEnd)
      root.removeEventListener('touchcancel', onCancel)
    }
  }, [containerRef, navigate, routes])
}
