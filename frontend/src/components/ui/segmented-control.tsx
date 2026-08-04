import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type SegmentOption<T extends string = string> = {
  value: T
  /** Visible text, or accessible name when `icon` is set */
  label: string
  icon?: ReactNode
}

type Props<T extends string> = {
  value: T
  options: readonly SegmentOption<T>[] | SegmentOption<T>[]
  onChange: (value: T) => void
  className?: string
  fullWidth?: boolean
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
  fullWidth,
}: Props<T>) {
  const rootRef = useRef<HTMLDivElement>(null)
  const btnRefs = useRef(new Map<string, HTMLButtonElement>())
  const [pill, setPill] = useState({ x: 0, w: 0, ready: false })
  const iconOnly = options.every((o) => o.icon != null)

  const updatePill = () => {
    const btn = btnRefs.current.get(value)
    if (!btn) return
    setPill({ x: btn.offsetLeft, w: btn.offsetWidth, ready: true })
  }

  useLayoutEffect(() => {
    updatePill()
  }, [value, options])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const ro = new ResizeObserver(() => updatePill())
    ro.observe(root)
    window.addEventListener('resize', updatePill)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updatePill)
    }
  }, [value, options])

  return (
    <div
      ref={rootRef}
      role="tablist"
      className={cn(
        'relative inline-flex rounded-xl border border-primary/15 bg-muted/50 p-1',
        fullWidth && 'flex w-full',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute top-1 bottom-1 left-0 rounded-lg bg-primary shadow-sm shadow-primary/30"
        style={{
          width: pill.w,
          transform: `translate3d(${pill.x}px, 0, 0)`,
          opacity: pill.ready ? 1 : 0,
          transition: pill.ready
            ? 'transform 0.4s var(--ease-bounce), width 0.4s var(--ease-bounce), opacity 0.15s ease'
            : 'none',
        }}
      />
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={opt.label}
            title={opt.label}
            ref={(el) => {
              if (el) btnRefs.current.set(opt.value, el)
              else btnRefs.current.delete(opt.value)
            }}
            onClick={() => {
              if (opt.value !== value) onChange(opt.value)
            }}
            className={cn(
              'relative z-10 flex min-w-0 items-center justify-center rounded-lg text-sm font-medium transition-colors duration-200',
              iconOnly ? 'px-2 py-2.5' : 'px-3 py-2',
              fullWidth && 'flex-1',
              active
                ? 'text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.icon ? (
              <>
                <span className="inline-flex [&_svg]:h-5 [&_svg]:w-5">{opt.icon}</span>
                <span className="sr-only">{opt.label}</span>
              </>
            ) : (
              <span className="truncate">{opt.label}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
