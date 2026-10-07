import { useEffect, useRef, useState } from 'react'

type BannerTone = 'error' | 'info' | 'ok'

type StatusDetail = {
  message: string
  tone?: BannerTone
}

const SHOW_DELAY_MS = 2500
const SHOW_DELAY_OK_MS = 200
const VISIBLE_MS = 7000

/** Floating overlay toast for sync status — does not shift page layout. */
export function SyncStatusBanner() {
  const [message, setMessage] = useState<string | null>(null)
  const [tone, setTone] = useState<BannerTone>('error')
  const showTimer = useRef<number | null>(null)
  const hideTimer = useRef<number | null>(null)

  useEffect(() => {
    const clearTimers = () => {
      if (showTimer.current != null) {
        window.clearTimeout(showTimer.current)
        showTimer.current = null
      }
      if (hideTimer.current != null) {
        window.clearTimeout(hideTimer.current)
        hideTimer.current = null
      }
    }

    const onMessage = (event: Event) => {
      const raw = (event as CustomEvent<string | StatusDetail | null>).detail
      clearTimers()

      if (!raw) {
        setMessage(null)
        return
      }

      const nextMessage = typeof raw === 'string' ? raw : raw.message
      const nextTone: BannerTone =
        typeof raw === 'string' ? 'error' : (raw.tone ?? 'error')
      const delay = nextTone === 'ok' ? SHOW_DELAY_OK_MS : SHOW_DELAY_MS

      showTimer.current = window.setTimeout(() => {
        setMessage(nextMessage)
        setTone(nextTone)
        hideTimer.current = window.setTimeout(() => {
          setMessage(null)
          hideTimer.current = null
        }, VISIBLE_MS)
        showTimer.current = null
      }, delay)
    }

    window.addEventListener('nastask:sync-status', onMessage)
    return () => {
      clearTimers()
      window.removeEventListener('nastask:sync-status', onMessage)
    }
  }, [])

  if (!message) return null

  const toneClass =
    tone === 'ok'
      ? 'border-emerald-500/35 bg-emerald-500 text-white shadow-emerald-900/25'
      : tone === 'info'
        ? 'border-primary/35 bg-card text-foreground shadow-black/20'
        : 'border-destructive/40 bg-destructive text-destructive-foreground shadow-black/25'

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[120] flex justify-center px-3 pt-[max(0.75rem,var(--tg-content-safe-area-inset-top,0px))]"
      role="status"
      aria-live="polite"
    >
      <div
        className={`pointer-events-none max-w-md rounded-xl border px-4 py-2.5 text-center text-sm shadow-lg backdrop-blur-md ${toneClass}`}
      >
        {message}
      </div>
    </div>
  )
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
