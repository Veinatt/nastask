import { apiFetch } from '@/api/client'

export type ApiDownloadKind = 'json-backup' | 'tax-csv' | 'tax-xlsx'

type TokenResponse = { success: true; url: string; fileName: string }

type TelegramWebApp = {
  downloadFile?: (
    params: { url: string; file_name: string },
    callback?: (accepted: boolean) => void,
  ) => void
  openLink?: (url: string) => void
}

function telegramWebApp(): TelegramWebApp | null {
  try {
    return (
      window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }
    ).Telegram?.WebApp ?? null
  } catch {
    return null
  }
}

async function saveBlobDownload(url: string, fileName: string): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`)
  }
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = fileName
    a.rel = 'noopener'
    a.click()
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function openExternal(url: string): void {
  const tg = telegramWebApp()
  if (tg?.openLink) {
    tg.openLink(url)
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

function nativeDownload(url: string, fileName: string): Promise<boolean> {
  const tg = telegramWebApp()
  if (!tg?.downloadFile) return Promise.resolve(false)

  return new Promise<boolean>((resolve) => {
    let settled = false
    const timer = window.setTimeout(() => {
      if (settled) return
      settled = true
      resolve(false)
    }, 30_000)

    try {
      tg.downloadFile!({ url, file_name: fileName }, (accepted) => {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        resolve(accepted)
      })
    } catch {
      if (!settled) {
        settled = true
        window.clearTimeout(timer)
        resolve(false)
      }
    }
  })
}

/** Telegram Mini App blocks blob downloads — use signed HTTPS URL + downloadFile. */
export async function triggerFileDownload(url: string, fileName: string): Promise<void> {
  const usedNative = await nativeDownload(url, fileName)
  if (usedNative) return

  try {
    await saveBlobDownload(url, fileName)
    return
  } catch {
    // Last resort: open HTTPS link in browser (Telegram openLink or new tab).
    openExternal(url)
  }
}

export async function requestApiDownload(
  kind: ApiDownloadKind,
  params?: { year?: number; month?: number; groupBy?: string },
): Promise<void> {
  const res = await apiFetch<TokenResponse>('/api/download/token', {
    method: 'POST',
    body: JSON.stringify({ kind, ...params }),
  })
  if (!res?.url || !res.fileName) {
    throw new Error('Download link missing')
  }
  await triggerFileDownload(res.url, res.fileName)
}
