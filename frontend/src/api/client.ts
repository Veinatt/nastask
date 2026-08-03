import { initData } from '@telegram-apps/sdk-react'

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

function getTelegramAuthHeader(): string | null {
  try {
    const raw = typeof initData.raw === 'function' ? initData.raw() : null
    if (raw && String(raw).trim()) {
      return `tma ${raw}`
    }
  } catch {
    // SDK not ready / outside Telegram
  }
  return null
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
