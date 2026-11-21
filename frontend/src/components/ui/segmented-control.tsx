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
  /** Fires on every option click (even if already selected). */
  onOptionTap?: (value: T) => void
  className?: string
  fullWidth?: boolean
  /** Taller track + larger icons (e.g. floating mobile nav). */
  size?: 'md' | 'lg'
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  onOptionTap,
  className,
  fullWidth,
  size = 'md',
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
        'relative inline-flex items-stretch rounded-2xl bg-card p-1 surface-elevate',
        'transition-[background-color,box-shadow,color] duration-[280ms] ease-[var(--ease-out-soft)]',
        size === 'lg' ? 'h-14 rounded-[1.75rem]' : 'h-11',
        fullWidth && 'flex w-full min-w-0 max-w-full',
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute top-1 bottom-1 left-0 bg-primary',
          /* Outer lg radius 1.75rem − p-1 → inner ~1.5rem so pill matches the track. */
          size === 'lg' ? 'rounded-[1.5rem]' : 'rounded-xl',
        )}
        style={{
          width: pill.w,
          transform: `translate3d(${pill.x}px, 0, 0)`,
          opacity: pill.ready ? 1 : 0,
          transition: pill.ready
            ? 'transform 0.38s var(--ease-bounce), width 0.38s var(--ease-bounce), opacity 0.15s ease'
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
              onOptionTap?.(opt.value)
              if (opt.value !== value) onChange(opt.value)
            }}
            className={cn(
              'relative z-10 flex min-w-0 items-center justify-center text-sm font-medium transition-colors duration-[280ms] ease-[var(--ease-out-soft)]',
              size === 'lg' ? 'rounded-[1.5rem]' : 'rounded-lg',
              iconOnly ? 'px-2' : 'px-3',
              fullWidth && 'flex-1',
              active
                ? 'text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.icon ? (
              <>
                <span
                  className={cn(
                    'inline-flex',
                    size === 'lg' ? '[&_svg]:h-7 [&_svg]:w-7' : '[&_svg]:h-5 [&_svg]:w-5',
                  )}
                >
                  {opt.icon}
                </span>
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
