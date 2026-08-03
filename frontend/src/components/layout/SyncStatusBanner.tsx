import { useEffect, useState } from 'react'

/** Lightweight toast/banner for sync status (phase 2). */
export function SyncStatusBanner() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const onMessage = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail
      setMessage(detail || null)
      if (detail) {
        window.setTimeout(() => setMessage(null), 5000)
      }
    }
    window.addEventListener('nastask:sync-status', onMessage)
    return () => window.removeEventListener('nastask:sync-status', onMessage)
  }, [])

  if (!message) return null

  return (
    <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
      {message}
    </div>
  )
}

export function emitSyncStatus(message: string | null): void {
  window.dispatchEvent(new CustomEvent('nastask:sync-status', { detail: message }))
}
