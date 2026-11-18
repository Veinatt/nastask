import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'
import { useAutoComplete } from '@/hooks/useDictionaries'
import { useI18n } from '@/hooks/useI18n'
import type { DictKind } from '@/db/types'
import { cn } from '@/lib/utils'

type Props = {
  kind: DictKind
  value: string
  onChange: (name: string) => void
  onResolved?: (id: string, name: string) => void
  /** Clear resolved id when user edits text away from confirmed value */
  onCleared?: () => void
  placeholder?: string
  className?: string
  resolvedId?: string
  autoFocus?: boolean
}

const MENU_MAX_H = 160
const VIEWPORT_PAD = 8

export function DictAutocomplete({
  kind,
  value,
  onChange,
  onResolved,
  placeholder,
  className,
  autoFocus = false,
}: Props) {
  const { t } = useI18n()
  const { suggestions, findExact, create } = useAutoComplete(kind)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [menuPos, setMenuPos] = useState<{
    top: number
    left: number
    width: number
    maxHeight: number
  } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const portalRef = useRef<HTMLElement | null>(null)
  const list = useMemo(() => suggestions(value), [suggestions, value])

  useLayoutEffect(() => {
    if (!autoFocus) return
    inputRef.current?.focus()
  }, [autoFocus])

  const exact = findExact(value)
  const trimmed = value.trim()
  const needsCreate = trimmed.length > 0 && !exact
  const showMenu = open && list.length > 0

  useLayoutEffect(() => {
    if (!showMenu) {
      setMenuPos(null)
      portalRef.current = null
      return
    }
    const update = () => {
      const el = rootRef.current
      if (!el) return
      // Portal into dialog content (RemoveScroll shard). Body portals stay
      // outside the dialog and clicks/scroll get blocked or dismiss the modal.
      const portal =
        el.closest<HTMLElement>('.dialog-content') ??
        el.closest<HTMLElement>('[role="dialog"]') ??
        document.body
      portalRef.current = portal
      const r = el.getBoundingClientRect()
      const pr = portal.getBoundingClientRect()
      const width = Math.floor(r.width)
      const spaceBelow = pr.bottom - r.bottom - VIEWPORT_PAD
      const spaceAbove = r.top - pr.top - VIEWPORT_PAD
      const openUp = spaceBelow < MENU_MAX_H && spaceAbove > spaceBelow
      const maxHeight = Math.max(
        72,
        Math.min(MENU_MAX_H, openUp ? spaceAbove : spaceBelow),
      )
      setMenuPos({
        top: openUp
          ? r.top - pr.top - 4 - maxHeight
          : r.bottom - pr.top + 4,
        left: r.left - pr.left,
        width,
        maxHeight,
      })
    }
    const onScroll = (e: Event) => {
      const menu = menuRef.current
      if (menu && (e.target === menu || menu.contains(e.target as Node))) return
      update()
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [showMenu, value, list.length])

  useLayoutEffect(() => {
    if (!showMenu) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null
      if (!target) return
      if (rootRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [showMenu])

  const pick = (id: string, name: string) => {
    setOpen(false)
    if (onResolved) onResolved(id, name)
    else onChange(name)
  }

  const confirmCreate = async () => {
    if (!needsCreate || busy) return
    setBusy(true)
    try {
      const item = await create(trimmed)
      if (onResolved) onResolved(item.id, item.name)
      else onChange(item.name)
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div ref={rootRef} className={cn('relative min-w-0', className)}>
      <input
        ref={inputRef}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          const next = e.target.value
          setOpen(true)
          const match = findExact(next)
          if (match && onResolved) {
            onResolved(match.id, match.name)
          } else {
            onChange(next)
          }
        }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        className={cn(
          'flex h-10 w-full min-w-0 rounded-md border border-input bg-card px-3 py-2 text-base transition-colors md:text-sm',
          'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:border-primary',
          'disabled:cursor-not-allowed disabled:opacity-50',
          needsCreate ? 'pr-10' : 'pr-3',
        )}
      />
      {needsCreate && (
        <button
          type="button"
          className="absolute right-1 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-success hover:bg-[hsl(var(--success)/0.1)] disabled:opacity-50"
          aria-label={t('dict.saveAria')}
          disabled={busy}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => void confirmCreate()}
        >
          <Check className="h-4 w-4" strokeWidth={2.5} />
        </button>
      )}
      {showMenu &&
        menuPos &&
        portalRef.current &&
        createPortal(
          <ul
            ref={menuRef}
            className="absolute z-[200] overflow-x-hidden overflow-y-auto overscroll-contain rounded-md border border-border bg-popover text-sm shadow-none [touch-action:pan-y]"
            style={{
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
              maxHeight: menuPos.maxHeight,
            }}
          >
            {list.map((item, index) => (
              <li
                key={item.id}
                className={cn(
                  'min-w-0',
                  index > 0 && 'border-t border-border/60',
                )}
              >
                <button
                  type="button"
                  className="block w-full truncate px-3 py-2 text-left hover:bg-accent"
                  title={item.name}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    pick(item.id, item.name)
                  }}
                >
                  {item.name}
                </button>
              </li>
            ))}
          </ul>,
          portalRef.current,
        )}
    </div>
  )
}
