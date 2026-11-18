import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Pencil, Play, Plus } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { cn } from '@/lib/utils'

const RADIUS = 52
const MAX_ANGLE_DEG = 62
const COMMIT_T = 0.72
const DRAG_THRESHOLD = 10
const DIRECTION_LOCK = 8

type Props = {
  onStart: () => void
  onManual: () => void
  disabled?: boolean
  className?: string
}

/**
 * Center dock CTA: tap → start; drag along an arc down+side —
 * the knob orbits away and Plus (start) / Pencil (manual) grows in its place.
 */
export function OrbitalStartButton({
  onStart,
  onManual,
  disabled = false,
  className,
}: Props) {
  const { t } = useI18n()
  const [tProg, setTProg] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const startT = useRef(0)
  const axisLock = useRef<'h' | 'v' | null>(null)
  const moved = useRef(false)
  const tracking = useRef(false)
  const tRef = useRef(0)
  const rootRef = useRef<HTMLDivElement>(null)

  const setProgress = (next: number) => {
    const clamped = Math.max(-1, Math.min(1, next))
    tRef.current = clamped
    setTProg(clamped)
  }

  const reset = () => {
    setProgress(0)
    setDragging(false)
  }

  const onPointerDown = (ev: ReactPointerEvent) => {
    if (disabled) return
    tracking.current = true
    moved.current = false
    axisLock.current = null
    startX.current = ev.clientX
    startY.current = ev.clientY
    startT.current = performance.now()
    setDragging(true)
    rootRef.current?.setPointerCapture(ev.pointerId)
  }

  const onPointerMove = (ev: ReactPointerEvent) => {
    if (!tracking.current) return
    const dx = ev.clientX - startX.current
    const dy = ev.clientY - startY.current

    if (!axisLock.current) {
      if (Math.abs(dx) < DIRECTION_LOCK && Math.abs(dy) < DIRECTION_LOCK) return
      // Prefer horizontal; allow slight downward bias for the arc feel.
      axisLock.current =
        Math.abs(dx) > Math.abs(dy) * 0.85 || dy > Math.abs(dx) * 0.4
          ? 'h'
          : 'v'
      if (axisLock.current === 'v' && dy < 0) {
        tracking.current = false
        reset()
        return
      }
      if (axisLock.current === 'v' && Math.abs(dx) < Math.abs(dy) * 1.2) {
        tracking.current = false
        reset()
        return
      }
      axisLock.current = 'h'
    }

    if (Math.hypot(dx, Math.max(0, dy)) >= DRAG_THRESHOLD) moved.current = true
    if (!moved.current) return

    const raw = dx / 72 + Math.max(0, dy) / 140 * Math.sign(dx || 1) * 0.35
    setProgress(raw)
  }

  const endGesture = (ev: ReactPointerEvent) => {
    if (!tracking.current && !dragging) return
    tracking.current = false
    try {
      rootRef.current?.releasePointerCapture(ev.pointerId)
    } catch {
      /* */
    }

    const current = tRef.current
    const elapsed = Math.max(1, performance.now() - startT.current)
    const velocity = (ev.clientX - startX.current) / elapsed

    if (!moved.current) {
      reset()
      if (!disabled) onStart()
      return
    }

    const commitRight = current >= COMMIT_T || (current > 0.35 && velocity > 0.4)
    const commitLeft = current <= -COMMIT_T || (current < -0.35 && velocity < -0.4)

    if (commitRight) {
      setProgress(1)
      window.setTimeout(() => {
        reset()
        onStart()
      }, 140)
      return
    }
    if (commitLeft) {
      setProgress(-1)
      window.setTimeout(() => {
        reset()
        onManual()
      }, 140)
      return
    }

    reset()
  }

  const angleRad = (tProg * MAX_ANGLE_DEG * Math.PI) / 180
  const knobX = RADIUS * Math.sin(angleRad)
  const knobY = RADIUS * (1 - Math.cos(angleRad))
  const absT = Math.abs(tProg)
  const action = tProg < -0.04 ? 'manual' : tProg > 0.04 ? 'start' : null
  const iconFade = Math.min(1, absT / 0.22)

  return (
    <div
      ref={rootRef}
      data-no-swipe
      className={cn(
        'relative flex size-11 shrink-0 items-center justify-center',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
    >
      {/* Slot action — only while dragging so Play isn't doubled at rest */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-primary text-primary-foreground"
        style={{
          opacity: action ? absT : 0,
          transform: `scale(${0.35 + absT * 0.65})`,
          transition: dragging ? undefined : 'opacity 200ms ease, transform 200ms ease',
        }}
        aria-hidden
      >
        {action === 'manual' ? (
          <Pencil className="h-5 w-5" strokeWidth={2.25} />
        ) : (
          <Plus className="h-6 w-6" strokeWidth={2.5} />
        )}
      </div>

      {/* Orbiting knob — loses its icon as soon as it leaves the slot */}
      <button
        type="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={t('home.start')}
        className={cn(
          'absolute flex size-11 items-center justify-center rounded-full',
          'bg-primary text-primary-foreground',
          'touch-none select-none outline-none',
          !dragging &&
            'transition-transform duration-300 ease-[var(--ease-out-soft)]',
        )}
        style={{
          transform: `translate3d(${knobX}px, ${knobY}px, 0) scale(${1 - absT * 0.18})`,
          opacity: 1 - absT * 0.35,
        }}
        onKeyDown={(ev) => {
          if (disabled) return
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault()
            onStart()
          }
        }}
      >
        <Play
          className="h-6 w-6 translate-x-px"
          fill="currentColor"
          strokeWidth={0}
          style={{ opacity: 1 - iconFade }}
          aria-hidden
        />
      </button>
    </div>
  )
}
