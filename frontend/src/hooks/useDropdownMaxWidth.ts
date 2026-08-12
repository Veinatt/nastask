import { useLayoutEffect, useState, type RefObject } from 'react'

const VIEWPORT_PAD = 12

function findBoundary(el: HTMLElement): HTMLElement | null {
  return (
    el.closest<HTMLElement>('.dialog-content') ??
    el.closest<HTMLElement>('[role="dialog"]')
  )
}

/**
 * Max width from the trigger's left edge to the container's inner right padding
 * (dialog content when inside a modal; otherwise viewport).
 */
export function useDropdownMaxWidth(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
): number | undefined {
  const [maxWidth, setMaxWidth] = useState<number | undefined>()

  useLayoutEffect(() => {
    if (!open) {
      setMaxWidth(undefined)
      return
    }

    const update = () => {
      const el = triggerRef.current
      if (!el) return
      const left = el.getBoundingClientRect().left
      const boundary = findBoundary(el)

      let rightLimit: number
      if (boundary) {
        const rect = boundary.getBoundingClientRect()
        const padRight = parseFloat(getComputedStyle(boundary).paddingRight) || 0
        rightLimit = rect.right - padRight
      } else {
        rightLimit = window.innerWidth - VIEWPORT_PAD
      }

      setMaxWidth(Math.max(96, Math.floor(rightLimit - left)))
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, triggerRef])

  return maxWidth
}
