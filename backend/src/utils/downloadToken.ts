import crypto from 'node:crypto'
import { config } from '../config'

export type DownloadKind = 'json-backup' | 'tax-csv' | 'tax-xlsx'

export type DownloadTokenPayload = {
  userId: number
  kind: DownloadKind
  year?: number
  month?: number
  groupBy?: string
  exp: number
}

const TOKEN_TTL_MS = 5 * 60 * 1000

function signingSecret(): string {
  if (config.botToken) return config.botToken
  if (config.authDevBypass) return 'nastask-dev-download'
  throw new Error('BOT_TOKEN required for download tokens')
}

function b64url(data: string): string {
  return Buffer.from(data, 'utf8').toString('base64url')
}

function fromB64url(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf8')
}

export function createDownloadToken(
  input: Omit<DownloadTokenPayload, 'exp'>,
): string {
  const payload: DownloadTokenPayload = {
    ...input,
    exp: Date.now() + TOKEN_TTL_MS,
  }
  const body = b64url(JSON.stringify(payload))
  const sig = crypto.createHmac('sha256', signingSecret()).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyDownloadToken(token: string): DownloadTokenPayload | null {
  try {
    const [body, sig] = token.split('.')
    if (!body || !sig) return null
    const expected = crypto.createHmac('sha256', signingSecret()).update(body).digest('base64url')
    const sigBuf = Buffer.from(sig)
    const expBuf = Buffer.from(expected)
    if (sigBuf.length !== expBuf.length) return null
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null
    const payload = JSON.parse(fromB64url(body)) as DownloadTokenPayload
    if (!payload?.userId || !payload?.kind || !payload?.exp) return null
    if (Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}
