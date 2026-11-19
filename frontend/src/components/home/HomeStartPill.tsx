import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Play, Plus } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { cn } from '@/lib/utils'

const ACTION_WIDTH = 76
const OPEN_THRESHOLD = 34
const COMMIT_RATIO = 0.88
const COMMIT_VELOCITY = 0.45
const DIRECTION_LOCK = 8
const DRAG_THRESHOLD = 12
const UNDERLAP = 20

type Props = {
  onStart: () => void
  onManual: () => void
  disabled?: boolean
  label?: string
  className?: string
}

/** White start pill: tap / swipe right → start, swipe left → manual. */
export function HomeStartPill({
  onStart,
  onManual,
  disabled = false,
  label,
  className,
}: Props) {
  const { t } = useI18n()
  const text = label ?? t('home.start')

  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const startT = useRef(0)
  const startOffset = useRef(0)
  const axisLock = useRef<'h' | 'v' | null>(null)
  const moved = useRef(false)
  const tracking = useRef(false)
  const draggingRef = useRef(false)
  const suppressTap = useRef(false)
  const lastSample = useRef({ x: 0, t: 0 })
  const velocityX = useRef(0)
  const offsetRef = useRef(0)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    offsetRef.current = offset
  }, [offset])

  const close = () => setOffset(0)

  const clamp = (value: number) =>
    Math.min(ACTION_WIDTH, Math.max(-ACTION_WIDTH, value))

  const onPointerDown = (ev: ReactPointerEvent) => {
    if (disabled) return
    const target = ev.target as HTMLElement
    if (target.closest('button, a, input, textarea, select')) return

    tracking.current = true
    draggingRef.current = true
    suppressTap.current = false
    startX.current = ev.clientX
    startY.current = ev.clientY
    startT.current = performance.now()
    startOffset.current = offsetRef.current
    axisLock.current = null
    moved.current = false
    velocityX.current = 0
    lastSample.current = { x: ev.clientX, t: startT.current }
    setDragging(true)
  }

  const onPointerMove = (ev: ReactPointerEvent) => {
    if (!tracking.current || !draggingRef.current) return
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
        suppressTap.current = true
        tracking.current = false
        draggingRef.current = false
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

  const commitManual = () => {
    setOffset(-ACTION_WIDTH)
    window.setTimeout(() => {
      close()
      onManual()
    }, 160)
  }

  const commitStart = () => {
    setOffset(ACTION_WIDTH)
    window.setTimeout(() => {
      close()
      onStart()
    }, 160)
  }

  const endGesture = (ev: ReactPointerEvent, allowTap: boolean) => {
    const wasActive =
      tracking.current || draggingRef.current || suppressTap.current
    if (!wasActive) return

    const skipTap =
      suppressTap.current || !allowTap || axisLock.current === 'v'
    tracking.current = false
    draggingRef.current = false
    suppressTap.current = false
    setDragging(false)
    try {
      sheetRef.current?.releasePointerCapture(ev.pointerId)
    } catch {
      /* not capturing */
    }

    if (skipTap) {
      if (Math.abs(offsetRef.current) > 0 && Math.abs(startOffset.current) === 0) {
        setOffset(0)
      }
      return
    }

    const current = offsetRef.current
    const wasOpen = Math.abs(startOffset.current) >= OPEN_THRESHOLD

    if (!moved.current) {
      if (wasOpen) close()
      else if (!disabled) onStart()
      return
    }

    const elapsed = Math.max(1, performance.now() - startT.current)
    const avgVelocity = (current - startOffset.current) / elapsed
    const strongLeft =
      current <= -ACTION_WIDTH * COMMIT_RATIO ||
      velocityX.current < -COMMIT_VELOCITY ||
      avgVelocity < -COMMIT_VELOCITY
    const strongRight =
      current >= ACTION_WIDTH * COMMIT_RATIO ||
      velocityX.current > COMMIT_VELOCITY ||
      avgVelocity > COMMIT_VELOCITY

    if (strongLeft && current < -OPEN_THRESHOLD) {
      commitManual()
      return
    }
    if (strongRight && current > OPEN_THRESHOLD) {
      commitStart()
      return
    }

    if (current <= -OPEN_THRESHOLD) setOffset(-ACTION_WIDTH)
    else if (current >= OPEN_THRESHOLD) setOffset(ACTION_WIDTH)
    else setOffset(0)
  }

  const manualRevealed = offset < -2
  const startRevealed = offset > 2

  return (
    <div
      data-no-swipe
      className={cn(
        'rounded-[31px] surface-elevate w-full',
        disabled && 'pointer-events-none opacity-60',
        className,
      )}
    >
      <div className="relative overflow-hidden rounded-[inherit]">
        {/* Start — under sheet on the left */}
        <div
          className={cn(
            'absolute top-px bottom-px left-0 bg-primary',
            'rounded-l-[inherit] rounded-r-none',
            startRevealed ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
          style={{ width: ACTION_WIDTH + UNDERLAP }}
          aria-hidden={!startRevealed}
        >
          <button
            type="button"
            data-swipe-action
            tabIndex={offset >= OPEN_THRESHOLD ? 0 : -1}
            className="absolute inset-y-0 left-0 flex w-[76px] items-center justify-center text-primary-foreground dark:text-primary-soft"
            aria-label={t('home.start')}
            onClick={(ev) => {
              ev.stopPropagation()
              close()
              onStart()
            }}
          >
            <Play className="h-7 w-7" fill="currentColor" strokeWidth={0} />
          </button>
        </div>

        {/* Manual — under sheet on the right */}
        <div
          className={cn(
            'absolute top-px bottom-px right-0 bg-primary',
            'rounded-r-[inherit] rounded-l-none',
            manualRevealed ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
          style={{ width: ACTION_WIDTH + UNDERLAP }}
          aria-hidden={!manualRevealed}
        >
          <button
            type="button"
            data-swipe-action
            tabIndex={offset <= -OPEN_THRESHOLD ? 0 : -1}
            className="absolute inset-y-0 right-0 flex w-[76px] items-center justify-center text-primary-foreground dark:text-primary-soft"
            aria-label={t('home.manual')}
            onClick={(ev) => {
              ev.stopPropagation()
              close()
              onManual()
            }}
          >
            <Plus className="h-7 w-7" strokeWidth={2.5} />
          </button>
        </div>

        <div
          ref={sheetRef}
          data-swipe-sheet
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={text}
          className={cn(
            'relative z-[1] select-none rounded-[inherit] bg-card text-primary dark:text-foreground',
            'p-5 text-center text-2xl font-medium leading-none',
            'will-change-transform !shadow-none outline-none',
            dragging && axisLock.current === 'h' ? 'touch-none' : 'touch-pan-y',
            !dragging &&
              'transition-transform duration-[360ms] ease-[var(--ease-out-soft)]',
          )}
          style={{ transform: `translate3d(${offset}px, 0, 0)` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(ev) => endGesture(ev, true)}
          onPointerCancel={(ev) => endGesture(ev, false)}
          onKeyDown={(ev) => {
            if (disabled) return
            if (ev.key === 'Enter' || ev.key === ' ') {
              ev.preventDefault()
              onStart()
            }
          }}
        >
          {text}
        </div>
      </div>
    </div>
  )
}
