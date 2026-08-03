import { Router, type Request, type Response } from 'express'
import { remindersRepo } from '../db/remindersRepo'
import { settingsRepo } from '../db/settingsRepo'
import { assertUserIdMatch, telegramAuth } from '../middleware/telegramAuth'
import { computeInitialNextNotify } from '../utils/getNextNotifyTime'
import { isReminderInterval, nowSec, toUnixSeconds } from '../utils/time'
import type { ReminderInterval } from '../types'

export const remindersRouter = Router()

remindersRouter.use(telegramAuth)

type Body = Record<string, unknown>

function formatTs(sec: number | null): string {
  if (sec == null) return 'null'
  return new Date(sec * 1000).toISOString()
}

function parseUpsertBody(
  body: Body,
  authUserId: number,
  taskIdOverride?: string,
) {
  const taskId = String(taskIdOverride ?? body.taskId ?? '').trim()
  const claimedUserId = Number(body.userId)
  const title = String(body.title ?? '').trim()
  const interval = body.interval

  if (!taskId) return { error: 'taskId is required' as const }
  if (!title) return { error: 'title is required' as const }
  if (!isReminderInterval(interval)) {
    return { error: 'interval must be one of 3m|15m|30m|1h|2h|3h|4h|daily' as const }
  }
  if (Number.isFinite(claimedUserId) && claimedUserId !== authUserId) {
    return { error: 'userId does not match Telegram user' as const, status: 403 as const }
  }

  const userId = authUserId
  const startTime = toUnixSeconds(body.startTime)
  const deadline = toUnixSeconds(body.deadline)
  const settings = settingsRepo.getOrCreate(userId)
  const nextNotify = computeInitialNextNotify({
    nowSec: nowSec(),
    startTime,
    interval: interval as ReminderInterval,
    settings,
  })

  return {
    data: {
      taskId,
      userId,
      title,
      interval: interval as ReminderInterval,
      startTime,
      deadline,
      nextNotify,
    },
  }
}

function upsertHandler(req: Request, res: Response, taskIdOverride?: string): void {
  try {
    const authUserId = req.telegramUserId
    if (authUserId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }

    const parsed = parseUpsertBody((req.body ?? {}) as Body, authUserId, taskIdOverride)
    if ('error' in parsed && parsed.error) {
      const status = 'status' in parsed && parsed.status ? parsed.status : 400
      res.status(status).json({ success: false, error: parsed.error })
      return
    }

    if (!('data' in parsed) || !parsed.data) {
      res.status(400).json({ success: false, error: 'Invalid body' })
      return
    }

    const { data } = parsed

    const existing = remindersRepo.getByTaskId(data.taskId)
    if (existing && existing.userId !== authUserId) {
      console.warn(
        `[задача] отказ: taskId=${data.taskId} принадлежит userId=${existing.userId}, запрос от ${authUserId}`,
      )
      res.status(403).json({ success: false, error: 'Forbidden: task belongs to another user' })
      return
    }

    const { row, created } = remindersRepo.upsert(data)
    const action = created ? 'СОЗДАНА' : 'ОБНОВЛЕНА'

    console.log(
      `[задача] ${action} «${row.title}» | taskId=${row.taskId} userId=${row.userId} interval=${row.interval} nextNotify=${formatTs(row.nextNotify)} start=${formatTs(row.startTime)} deadline=${formatTs(row.deadline)}`,
    )

    res.json({ success: true, created })
  } catch (error) {
    console.error('[задача] ошибка create/update', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

remindersRouter.post('/', (req, res) => {
  upsertHandler(req, res)
})

remindersRouter.put('/:taskId', (req, res) => {
  upsertHandler(req, res, req.params.taskId)
})

remindersRouter.delete('/:taskId', (req, res) => {
  try {
    const authUserId = req.telegramUserId
    if (authUserId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }

    const taskId = String(req.params.taskId ?? '').trim()
    if (!taskId) {
      res.status(400).json({ success: false, error: 'taskId is required' })
      return
    }

    const queryUserId = req.query.userId != null ? Number(req.query.userId) : NaN
    if (Number.isFinite(queryUserId) && !assertUserIdMatch(req, res, queryUserId)) {
      return
    }

    const existing = remindersRepo.getByTaskId(taskId)
    if (existing && existing.userId !== authUserId) {
      console.warn(
        `[задача] отказ удаления: taskId=${taskId} userId=${existing.userId}, запрос от ${authUserId}`,
      )
      res.status(403).json({ success: false, error: 'Forbidden: task belongs to another user' })
      return
    }

    const deleted = remindersRepo.deleteByTaskId(taskId)

    if (deleted && existing) {
      console.log(
        `[задача] УДАЛЕНА «${existing.title}» | taskId=${taskId} userId=${existing.userId}`,
      )
    } else {
      console.log(`[задача] УДАЛЕНИЕ: запись не найдена taskId=${taskId}`)
    }

    res.json({ success: true, deleted })
  } catch (error) {
    console.error('[задача] ошибка delete', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})
