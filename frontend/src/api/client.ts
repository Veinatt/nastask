import { initData, retrieveRawInitData, restoreInitData } from '@telegram-apps/sdk-react'

export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:5000'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function readNativeInitData(): string | null {
  try {
    const raw = (
      window as unknown as { Telegram?: { WebApp?: { initData?: string } } }
    ).Telegram?.WebApp?.initData
    if (raw && String(raw).trim()) return String(raw)
  } catch {
    // ignore
  }
  return null
}

function getTelegramInitDataRaw(): string | null {
  try {
    restoreInitData()
  } catch {
    // ignore
  }

  try {
    const fromSdk = typeof initData.raw === 'function' ? initData.raw() : null
    if (fromSdk && String(fromSdk).trim()) return String(fromSdk)
  } catch {
    // ignore
  }

  try {
    const retrieved = retrieveRawInitData()
    if (retrieved && String(retrieved).trim()) return String(retrieved)
  } catch {
    // ignore
  }

  return readNativeInitData()
}

function getTelegramAuthHeader(): string | null {
  const raw = getTelegramInitDataRaw()
  return raw ? `tma ${raw}` : null
}

/** Local DEV without Telegram initData — matches VITE_DEV_USER_ID / useTelegram fake user. */
function getDevUserIdHeader(): string | null {
  if (!import.meta.env.DEV) return null
  const id = Number(import.meta.env.VITE_DEV_USER_ID ?? 334808852)
  if (!Number.isFinite(id)) return null
  return String(id)
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T | void> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`

  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (!headers.has('Authorization')) {
    const auth = getTelegramAuthHeader()
    if (auth) {
      headers.set('Authorization', auth)
    } else {
      const devUserId = getDevUserIdHeader()
      if (devUserId && !headers.has('X-User-Id')) {
        headers.set('X-User-Id', devUserId)
      }
    }
  }

  const response = await fetch(url, { ...init, headers })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new ApiError(
      text || `Request failed: ${response.status} ${response.statusText}`,
      response.status,
    )
  }

  if (response.status === 204) return undefined

  const contentType = response.headers.get('Content-Type') ?? ''
  if (contentType.includes('application/json')) {
    return (await response.json()) as T
  }

  return undefined
}
