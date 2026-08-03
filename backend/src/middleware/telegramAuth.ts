import type { NextFunction, Request, Response } from 'express'
import { extractInitDataFromAuthHeader, validateInitData } from '../auth/validateInitData'
import { config } from '../config'

declare global {
  namespace Express {
    interface Request {
      telegramUserId?: number
    }
  }
}

/**
 * Requires valid Telegram Mini App initData, unless AUTH_DEV_BYPASS is on.
 * Sets req.telegramUserId from the signed payload (never trust body userId alone).
 */
export function telegramAuth(req: Request, res: Response, next: NextFunction): void {
  const initDataRaw = extractInitDataFromAuthHeader(req.header('authorization'))

  if (!initDataRaw) {
    if (config.authDevBypass) {
      const fromHeader = req.header('x-user-id')
      const fromQuery = req.query.userId
      const fromBody = (req.body as { userId?: unknown } | undefined)?.userId
      const fromParams = req.params.userId
      const fallback = Number(fromHeader ?? fromQuery ?? fromBody ?? fromParams)
      if (!Number.isFinite(fallback)) {
        console.warn(`[auth] DEV bypass but no userId path=${req.method} ${req.path}`)
        res.status(401).json({ success: false, error: 'Unauthorized: userId required in dev bypass' })
        return
      }
      req.telegramUserId = fallback
      console.log(
        `[auth] DEV bypass userId=${fallback} ${req.method} ${req.originalUrl}`,
      )
      next()
      return
    }

    console.warn(`[auth] missing Authorization tma … ${req.method} ${req.originalUrl}`)
    res.status(401).json({ success: false, error: 'Unauthorized: missing Telegram initData' })
    return
  }

  if (!config.botToken) {
    console.error('[auth] BOT_TOKEN empty — cannot validate initData')
    res.status(503).json({ success: false, error: 'Auth unavailable: BOT_TOKEN not configured' })
    return
  }

  try {
    const validated = validateInitData(initDataRaw, config.botToken, config.initDataMaxAgeSec)
    req.telegramUserId = validated.userId
    console.log(
      `[auth] ok userId=${validated.userId}${validated.username ? ` @${validated.username}` : ''} ${req.method} ${req.originalUrl}`,
    )
    next()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'invalid initData'
    console.warn(`[auth] rejected: ${message} ${req.method} ${req.originalUrl}`)
    res.status(401).json({ success: false, error: `Unauthorized: ${message}` })
  }
}

/** Ensures body/params userId matches the authenticated Telegram user. */
export function assertUserIdMatch(
  req: Request,
  res: Response,
  claimedUserId: number,
): boolean {
  if (req.telegramUserId == null) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return false
  }
  if (claimedUserId !== req.telegramUserId) {
    console.warn(
      `[auth] userId mismatch claimed=${claimedUserId} auth=${req.telegramUserId} ${req.method} ${req.originalUrl}`,
    )
    res.status(403).json({ success: false, error: 'Forbidden: userId does not match Telegram user' })
    return false
  }
  return true
}
