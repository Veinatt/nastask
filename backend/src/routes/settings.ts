import { Router, type Request, type Response } from 'express'
import { telegramAuth } from '../middleware/telegramAuth'
import { settingsRepo } from '../db/settingsRepo'
import { createDefaultUserSettings } from '../types'
import { nowIso } from '../utils/iso'

export const settingsRouter = Router()
settingsRouter.use(telegramAuth)

settingsRouter.get('/', (req: Request, res: Response) => {
  try {
    const userId = req.telegramUserId
    if (userId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }
    const settings = settingsRepo.getOrCreate(userId)
    res.json({ success: true, settings })
  } catch (error) {
    console.error('[api:settings] GET failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// legacy path compatibility
settingsRouter.get('/:userId', (req: Request, res: Response) => {
  try {
    const userId = req.telegramUserId
    if (userId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }
    if (Number(req.params.userId) !== userId) {
      res.status(403).json({ success: false, error: 'Forbidden' })
      return
    }
    const settings = settingsRepo.getOrCreate(userId)
    res.json({ success: true, settings })
  } catch (error) {
    console.error('[api:settings] GET/:userId failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

settingsRouter.put('/', (req: Request, res: Response) => {
  try {
    const userId = req.telegramUserId
    if (userId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }
    const body = (req.body ?? {}) as Record<string, unknown>
    const current = settingsRepo.getOrCreate(userId)
    const defaults = createDefaultUserSettings(userId)

    const hourlyRate =
      body.hourlyRate === undefined ? current.hourlyRate : Number(body.hourlyRate)
    const taxRate = body.taxRate === undefined ? current.taxRate : Number(body.taxRate)
    const currency =
      typeof body.currency === 'string' && body.currency.trim()
        ? body.currency.trim()
        : current.currency || defaults.currency
    const timezone =
      typeof body.timezone === 'string' && body.timezone.trim()
        ? body.timezone.trim()
        : current.timezone || defaults.timezone

    if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
      res.status(400).json({ success: false, error: 'hourlyRate must be ≥ 0' })
      return
    }
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
      res.status(400).json({ success: false, error: 'taxRate must be 0..100' })
      return
    }

    const settings = settingsRepo.upsert({
      userId,
      hourlyRate,
      taxRate,
      currency,
      timezone,
      updatedAt: nowIso(),
    })
    console.log(`[api:settings] PUT userId=${userId}`)
    res.json({ success: true, settings })
  } catch (error) {
    console.error('[api:settings] PUT failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})
