import { Router, type Request, type Response, type NextFunction } from 'express'
import { telegramAuth } from '../middleware/telegramAuth'
import { config } from '../config'
import { MEMORY_QUESTION_IDS } from '../memory/memoryQuestions'
import { memoryRepo } from '../db/memoryRepo'

export const memoryRouter = Router()

/** curl -H "X-Export-Key: $MEMORY_EXPORT_KEY" "https://host/api/memory/export?userId=123" */
function requireExportKey(req: Request, res: Response, next: NextFunction): void {
  const key = config.memoryExportKey
  if (!key) {
    res.status(503).json({ success: false, error: 'MEMORY_EXPORT_KEY not configured' })
    return
  }
  const provided = String(req.header('X-Export-Key') ?? '').trim()
  if (!provided || provided !== key) {
    res.status(401).json({ success: false, error: 'Invalid or missing X-Export-Key' })
    return
  }
  next()
}

memoryRouter.get('/export', requireExportKey, (req: Request, res: Response) => {
  try {
    const raw = req.query.userId
    const filterUserId =
      raw != null && String(raw).trim() !== '' ? Number(raw) : undefined
    if (filterUserId != null && !Number.isFinite(filterUserId)) {
      res.status(400).json({ success: false, error: 'userId must be a number' })
      return
    }
    const answers = memoryRepo.listAll(filterUserId)
    res.json({ success: true, answers })
  } catch (error) {
    console.error('[api:memory] export failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

memoryRouter.use(telegramAuth)

memoryRouter.get('/questions', (_req: Request, res: Response) => {
  res.json({
    success: true,
    questions: MEMORY_QUESTION_IDS.map((id) => ({ id })),
  })
})

memoryRouter.get('/answers', (req: Request, res: Response) => {
  try {
    const userId = req.telegramUserId
    if (userId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }
    const answers = memoryRepo.listByUser(userId)
    res.json({ success: true, answers })
  } catch (error) {
    console.error('[api:memory] GET answers failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

memoryRouter.post('/answers', (req: Request, res: Response) => {
  try {
    const userId = req.telegramUserId
    if (userId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }
    const body = (req.body ?? {}) as {
      answers?: Array<{ questionId?: string; answer?: string }>
    }
    const raw = Array.isArray(body.answers) ? body.answers : []
    const items = raw
      .filter((a) => typeof a?.questionId === 'string' && a.questionId.trim())
      .map((a) => ({
        questionId: String(a.questionId).trim(),
        answer: String(a.answer ?? ''),
      }))
    if (items.length === 0) {
      res.status(400).json({ success: false, error: 'answers array required' })
      return
    }
    const answers = memoryRepo.upsertAnswers(userId, items)
    console.log(`[api:memory] UPSERT userId=${userId} count=${answers.length}`)
    res.json({ success: true, answers })
  } catch (error) {
    console.error('[api:memory] POST answers failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})
