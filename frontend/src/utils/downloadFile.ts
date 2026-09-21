import { emitSyncStatus } from '@/components/layout/SyncStatusBanner'
import { apiFetch } from '@/api/client'
import { t } from '@/lib/i18n'

export type ApiDownloadKind = 'json-backup' | 'tax-csv' | 'tax-xlsx'

type TokenResponse = { success: true; url: string; fileName: string }

type TelegramWebApp = {
  platform?: string
  initData?: string
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

/** Real Mini App — not plain browser with telegram-web-app.js stub. */
function isTelegramMiniApp(): boolean {
  const tg = telegramWebApp()
  if (!tg) return false
  const platform = tg.platform?.trim()
  if (platform && platform !== 'unknown') return true
  return Boolean(tg.initData?.trim())
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
    document.body.appendChild(a)
    a.click()
    a.remove()
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
    }, 5_000)

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

export async function triggerFileDownload(url: string, fileName: string): Promise<void> {
  const tg = telegramWebApp()
  const mini = isTelegramMiniApp()
  const hasNative = Boolean(tg?.downloadFile)
  const https = url.startsWith('https://')

  if (mini && https && hasNative) {
    const accepted = await nativeDownload(url, fileName)
    if (accepted) {
      emitSyncStatus(t('download.started', { name: fileName }), 'ok')
      return
    }
  }

  try {
    await saveBlobDownload(url, fileName)
    emitSyncStatus(t('download.started', { name: fileName }), 'ok')
    return
  } catch (error) {
    console.warn('[download] blob save failed, opening link', error)
  }

  openExternal(url)
  emitSyncStatus(t('download.openInBrowser'), 'info')
}

export async function requestApiDownload(
  kind: ApiDownloadKind,
  params?: { year?: number; month?: number; groupBy?: string },
): Promise<void> {
  try {
    const res = await apiFetch<TokenResponse>('/api/download/token', {
      method: 'POST',
      body: JSON.stringify({ kind, ...params }),
    })
    if (!res?.url || !res.fileName) {
      throw new Error(t('download.linkMissing'))
    }
    await triggerFileDownload(res.url, res.fileName)
  } catch (error) {
    const message = error instanceof Error ? error.message : t('download.failed')
    emitSyncStatus(message, 'error')
    throw error
  }
}
