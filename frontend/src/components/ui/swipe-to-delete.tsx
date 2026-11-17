import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { Check, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const ACTION_WIDTH = 76
const OPEN_THRESHOLD = 34
const COMMIT_RATIO = 0.88
/** px/ms — strong flick commits the revealed action. */
const COMMIT_VELOCITY = 0.45
const DIRECTION_LOCK = 8
/** Movement beyond this counts as a swipe, not a tap. */
const DRAG_THRESHOLD = 12
const UNDERLAP = 20

type Props = {
  children: ReactNode
  onDelete: () => void
  deleteAriaLabel: string
  /** Active intervals: swipe right to complete. */
  onComplete?: () => void
  completeAriaLabel?: string
  /** Fired on a clean tap (not a swipe). */
  onTap?: () => void
  className?: string
  /** Extra classes for the sliding foreground (e.g. card surface). */
  contentClassName?: string
}

export function SwipeToDelete({
  children,
  onDelete,
  deleteAriaLabel,
  onComplete,
  completeAriaLabel,
  onTap,
  className,
  contentClassName,
}: Props) {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const startT = useRef(0)
  const startOffset = useRef(0)
  const axisLock = useRef<'h' | 'v' | null>(null)
  const moved = useRef(false)
  const tracking = useRef(false)
  const openRef = useRef(false)
  const lastSample = useRef({ x: 0, t: 0 })
  const velocityX = useRef(0)
  const offsetRef = useRef(0)
  const sheetRef = useRef<HTMLDivElement>(null)
  const canComplete = Boolean(onComplete)

  useEffect(() => {
    offsetRef.current = offset
    openRef.current = Math.abs(offset) >= OPEN_THRESHOLD
  }, [offset])

  const close = () => setOffset(0)

  const clamp = (value: number) => {
    const min = -ACTION_WIDTH
    const max = canComplete ? ACTION_WIDTH : 0
    return Math.min(max, Math.max(min, value))
  }

  const onPointerDown = (ev: ReactPointerEvent) => {
    const target = ev.target as HTMLElement
    if (target.closest('button, a, input, textarea, select')) return

    tracking.current = true
    startX.current = ev.clientX
    startY.current = ev.clientY
    startT.current = performance.now()
    startOffset.current = offsetRef.current
    axisLock.current = null
    moved.current = false
    velocityX.current = 0
    lastSample.current = { x: ev.clientX, t: startT.current }
    setDragging(true)
    // Capture only after horizontal lock — keeps taps/clicks reliable.
  }

  const onPointerMove = (ev: ReactPointerEvent) => {
    if (!tracking.current || !dragging) return
    const dx = ev.clientX - startX.current
    const dy = ev.clientY - startY.current
    const now = performance.now()
    const dt = Math.max(1, now - lastSample.current.t)
    velocityX.current = (ev.clientX - lastSample.current.x) / dt
    lastSample.current = { x: ev.clientX, t: now }

    if (!axisLock.current) {
      if (Math.abs(dx) < DIRECTION_LOCK && Math.abs(dy) < DIRECTION_LOCK) return
      axisLock.current = Math.abs(dx) > Math.abs(dy) * 1.05 ? 'h' : 'v'
      if (axisLock.current === 'v') {
        tracking.current = false
        setDragging(false)
        return
      }
      sheetRef.current?.setPointerCapture(ev.pointerId)
    }
    if (axisLock.current !== 'h') return

    if (Math.abs(dx) >= DRAG_THRESHOLD || Math.abs(startOffset.current) > 0) {
      moved.current = true
    }
    if (!moved.current) return

    setOffset(clamp(startOffset.current + dx))
  }

  const commitAction = (kind: 'delete' | 'complete') => {
    setOffset(kind === 'delete' ? -ACTION_WIDTH : ACTION_WIDTH)
    window.setTimeout(() => {
      close()
      if (kind === 'delete') onDelete()
      else onComplete?.()
    }, 160)
  }

  const onPointerUp = (ev: ReactPointerEvent) => {
    if (!tracking.current && !dragging) return
    tracking.current = false
    setDragging(false)
    try {
      sheetRef.current?.releasePointerCapture(ev.pointerId)
    } catch {
      /* not capturing */
    }

    const current = offsetRef.current
    const wasOpen = Math.abs(startOffset.current) >= OPEN_THRESHOLD

    // Clean tap — edit, or close an open swipe sheet.
    if (!moved.current) {
      if (wasOpen) close()
      else onTap?.()
      return
    }

    const elapsed = Math.max(1, performance.now() - startT.current)
    const avgVelocity = (current - startOffset.current) / elapsed

    const strongLeft =
      current <= -ACTION_WIDTH * COMMIT_RATIO ||
      velocityX.current < -COMMIT_VELOCITY ||
      avgVelocity < -COMMIT_VELOCITY
    const strongRight =
      canComplete &&
      (current >= ACTION_WIDTH * COMMIT_RATIO ||
        velocityX.current > COMMIT_VELOCITY ||
        avgVelocity > COMMIT_VELOCITY)

    if (strongLeft && current < -OPEN_THRESHOLD) {
      commitAction('delete')
      return
    }
    if (strongRight && current > OPEN_THRESHOLD) {
      commitAction('complete')
      return
    }

    if (current <= -OPEN_THRESHOLD) setOffset(-ACTION_WIDTH)
    else if (canComplete && current >= OPEN_THRESHOLD) setOffset(ACTION_WIDTH)
    else setOffset(0)
  }

  const deleteRevealed = offset < -2
  const completeRevealed = canComplete && offset > 2

  return (
    <div
      data-no-swipe
      className={cn('rounded-2xl surface-elevate', className)}
    >
      {/* Overflow clip is inner so outer elevation shadow is not cropped. */}
      <div className="relative overflow-hidden rounded-2xl">
        {/* Delete — under card on the right */}
        <div
          className={cn(
            'absolute inset-y-0 right-0 bg-destructive',
            'rounded-r-2xl rounded-l-none',
            deleteRevealed ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
          style={{ width: ACTION_WIDTH + UNDERLAP }}
          aria-hidden={!deleteRevealed}
        >
          <button
            type="button"
            data-swipe-action
            tabIndex={offset <= -OPEN_THRESHOLD ? 0 : -1}
            className="absolute inset-y-0 right-0 flex w-[76px] items-center justify-center text-white"
            aria-label={deleteAriaLabel}
            onClick={(ev) => {
              ev.stopPropagation()
              close()
              onDelete()
            }}
          >
            <Trash2 className="h-[1.25rem] w-[1.25rem]" strokeWidth={2} />
          </button>
        </div>

        {/* Complete — under card on the left (active only) */}
        {canComplete ? (
          <div
            className={cn(
              'absolute inset-y-0 left-0 bg-success',
              'rounded-l-2xl rounded-r-none',
              completeRevealed ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
            style={{ width: ACTION_WIDTH + UNDERLAP }}
            aria-hidden={!completeRevealed}
          >
            <button
              type="button"
              data-swipe-action
              tabIndex={offset >= OPEN_THRESHOLD ? 0 : -1}
              className="absolute inset-y-0 left-0 flex w-[76px] items-center justify-center text-white"
              aria-label={completeAriaLabel ?? deleteAriaLabel}
              onClick={(ev) => {
                ev.stopPropagation()
                close()
                onComplete?.()
              }}
            >
              <Check className="h-[1.25rem] w-[1.25rem]" strokeWidth={2} />
            </button>
          </div>
        ) : null}

        <div
          ref={sheetRef}
          data-swipe-sheet
          className={cn(
            'relative z-[1] rounded-2xl bg-card will-change-transform !shadow-none',
            dragging && axisLock.current === 'h' ? 'touch-none' : 'touch-pan-y',
            !dragging &&
              'transition-transform duration-[360ms] ease-[var(--ease-out-soft)]',
            contentClassName,
          )}
          style={{ transform: `translate3d(${offset}px, 0, 0)` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
