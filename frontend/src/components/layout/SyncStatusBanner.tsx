import { useEffect, useState } from 'react'

type BannerTone = 'error' | 'info' | 'ok'

/** Lightweight toast/banner for sync status (phase 2). */
export function SyncStatusBanner() {
  const [message, setMessage] = useState<string | null>(null)
  const [tone, setTone] = useState<BannerTone>('error')

  useEffect(() => {
    const onMessage = (event: Event) => {
      const raw = (event as CustomEvent<string | { message: string; tone?: BannerTone } | null>)
        .detail
      if (!raw) {
        setMessage(null)
        return
      }
      if (typeof raw === 'string') {
        setMessage(raw)
        setTone('error')
      } else {
        setMessage(raw.message)
        setTone(raw.tone ?? 'error')
      }
      window.setTimeout(() => setMessage(null), 5000)
    }
    window.addEventListener('nastask:sync-status', onMessage)
    return () => window.removeEventListener('nastask:sync-status', onMessage)
  }, [])

  if (!message) return null

  const toneClass =
    tone === 'ok'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
      : tone === 'info'
        ? 'border-primary/30 bg-primary/10 text-primary'
        : 'border-destructive/30 bg-destructive/10 text-destructive'

  return (
    <div className={`border-b px-4 py-2 text-center text-sm ${toneClass}`}>
      {message}
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
