import { useEffect, useRef, type RefObject } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const MIN_DX = 56
const MAX_DURATION_MS = 800
const HORIZONTAL_RATIO = 1.25

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

type Point = { x: number; y: number; t: number; ignore: boolean }

/** Horizontal swipe / drag between primary app tabs. */
export function useSwipeNavigation(
  routes: readonly string[],
  containerRef: RefObject<HTMLElement | null>,
) {
  const navigate = useNavigate()
  const location = useLocation()
  const startRef = useRef<Point | null>(null)
  const pathRef = useRef(location.pathname)
  pathRef.current = location.pathname

  useEffect(() => {
    const root = containerRef.current
    if (!root) return

    const finish = (clientX: number, clientY: number) => {
      const start = startRef.current
      startRef.current = null
      if (!start || start.ignore) return

      const dx = clientX - start.x
      const dy = clientY - start.y
      const dt = Date.now() - start.t

      if (dt > MAX_DURATION_MS) return
      if (Math.abs(dx) < MIN_DX) return
      if (Math.abs(dx) < Math.abs(dy) * HORIZONTAL_RATIO) return

      const current = normalizePath(pathRef.current)
      const index = routes.findIndex((r) => normalizePath(r) === current)
      if (index < 0) return

      if (dx < 0 && index < routes.length - 1) {
        navigate(routes[index + 1]!)
      } else if (dx > 0 && index > 0) {
        navigate(routes[index - 1]!)
      }
    }

    const onTouchStart = (e: TouchEvent) => {
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

    const onTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length !== 1) {
        startRef.current = null
        return
      }
      const touch = e.changedTouches[0]!
      finish(touch.clientX, touch.clientY)
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return // handled by touch events
      if (e.button !== 0) return
      startRef.current = {
        x: e.clientX,
        y: e.clientY,
        t: Date.now(),
        ignore: shouldIgnoreTarget(e.target),
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      finish(e.clientX, e.clientY)
    }

    const onCancel = () => {
      startRef.current = null
    }

    root.addEventListener('touchstart', onTouchStart, { passive: true })
    root.addEventListener('touchend', onTouchEnd, { passive: true })
    root.addEventListener('touchcancel', onCancel, { passive: true })
    root.addEventListener('pointerdown', onPointerDown)
    root.addEventListener('pointerup', onPointerUp)
    root.addEventListener('pointercancel', onCancel)

    return () => {
      root.removeEventListener('touchstart', onTouchStart)
      root.removeEventListener('touchend', onTouchEnd)
      root.removeEventListener('touchcancel', onCancel)
      root.removeEventListener('pointerdown', onPointerDown)
      root.removeEventListener('pointerup', onPointerUp)
      root.removeEventListener('pointercancel', onCancel)
    }
  }, [containerRef, navigate, routes])
}
