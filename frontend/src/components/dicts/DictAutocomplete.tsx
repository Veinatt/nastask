import { useMemo, useState } from 'react'
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
}

export function DictAutocomplete({
  kind,
  value,
  onChange,
  onResolved,
  placeholder,
  className,
}: Props) {
  const { t } = useI18n()
  const { suggestions, findExact, create } = useAutoComplete(kind)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const list = useMemo(() => suggestions(value), [suggestions, value])

  const exact = findExact(value)
  const trimmed = value.trim()
  // Show check when typed text has no exact match (need to create)
  const needsCreate = trimmed.length > 0 && !exact

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
    <div className={cn('relative', className)}>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          const next = e.target.value
          setOpen(true)
          const match = findExact(next)
          // One parent updater per keystroke — stacking onChange+onCleared/onResolved
          // against the same items snapshot drops the typed character.
          if (match && onResolved) {
            onResolved(match.id, match.name)
          } else {
            onChange(next)
          }
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150)
        }}
        autoComplete="off"
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors',
          'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          needsCreate ? 'pr-10' : 'pr-3',
        )}
      />
      {needsCreate && (
        <button
          type="button"
          className="absolute right-1 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-emerald-500 hover:bg-emerald-500/10 disabled:opacity-50"
          aria-label={t('dict.saveAria')}
          disabled={busy}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => void confirmCreate()}
        >
          <Check className="h-4 w-4" strokeWidth={2.5} />
        </button>
      )}
      {open && list.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-40 w-full overflow-auto rounded-md border bg-popover text-sm shadow-md">
          {list.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-accent"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(item.id, item.name)}
              >
                {item.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
