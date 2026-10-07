import { useEffect, useRef, useState } from 'react'
import { Check, LoaderCircle, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

type BannerTone = 'error' | 'info' | 'ok'

type StatusDetail = {
  message: string
  tone?: BannerTone
}

type SyncVisual = 'idle' | 'loading' | 'ok' | 'error'

const OK_VISIBLE_MS = 2200
const ERROR_VISIBLE_MS = 4500

/** Compact sync glyph beside the logo — no layout jump, no toast. */
export function SyncStatusIcon({ className }: { className?: string }) {
  const [visual, setVisual] = useState<SyncVisual>('idle')
  const [label, setLabel] = useState<string | null>(null)
  const hideTimer = useRef<number | null>(null)

  useEffect(() => {
    const clearHide = () => {
      if (hideTimer.current != null) {
        window.clearTimeout(hideTimer.current)
        hideTimer.current = null
      }
    }

    const onMessage = (event: Event) => {
      const raw = (event as CustomEvent<string | StatusDetail | null>).detail
      clearHide()

      if (!raw) {
        setVisual('idle')
        setLabel(null)
        return
      }

      const nextMessage = typeof raw === 'string' ? raw : raw.message
      const nextTone: BannerTone =
        typeof raw === 'string' ? 'error' : (raw.tone ?? 'error')

      setLabel(nextMessage)

      if (nextTone === 'ok') {
        setVisual('ok')
        hideTimer.current = window.setTimeout(() => {
          setVisual('idle')
          setLabel(null)
          hideTimer.current = null
        }, OK_VISIBLE_MS)
        return
      }

      if (nextTone === 'info') {
        setVisual('loading')
        return
      }

      setVisual('error')
      hideTimer.current = window.setTimeout(() => {
        setVisual('idle')
        setLabel(null)
        hideTimer.current = null
      }, ERROR_VISIBLE_MS)
    }

    window.addEventListener('nastask:sync-status', onMessage)
    return () => {
      clearHide()
      window.removeEventListener('nastask:sync-status', onMessage)
    }
  }, [])

  if (visual === 'idle') return null

  return (
    <span
      className={cn(
        'inline-flex h-5 w-5 shrink-0 items-center justify-center',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={label ?? undefined}
      title={label ?? undefined}
    >
      {visual === 'loading' ? (
        <LoaderCircle className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      ) : null}
      {visual === 'ok' ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2.6} />
      ) : null}
      {visual === 'error' ? (
        <TriangleAlert className="h-3.5 w-3.5 text-destructive" />
      ) : null}
    </span>
  )
}

/** @deprecated Use SyncStatusIcon near the logo. Kept so old imports keep working. */
export function SyncStatusBanner() {
  return null
}

export function emitSyncStatus(
  message: string | null,
  tone: BannerTone = 'error',
): void {
  window.dispatchEvent(
    new CustomEvent('nastask:sync-status', {
      detail: message ? { message, tone } : null,
    }),
  )
}
