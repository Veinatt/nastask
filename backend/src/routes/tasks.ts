import { Router, type Request, type Response } from 'express'
import { telegramAuth } from '../middleware/telegramAuth'
import { tasksRepo, type TaskInput, type TaskStatus } from '../db/tasksRepo'
import { remindersRepo } from '../db/remindersRepo'
import { syncReminderForTask } from '../services/syncTaskReminder'
import { isReminderInterval } from '../utils/time'
import { randomUUID } from 'node:crypto'

export const tasksRouter = Router()

tasksRouter.use(telegramAuth)

type Body = Record<string, unknown>

function nowIso(): string {
  return new Date().toISOString()
}

function parseTaskBody(
  body: Body,
  userId: number,
  existing?: ReturnType<typeof tasksRepo.getById>,
): { error?: string; status?: number; data?: TaskInput } {
  const id = String(body.id ?? existing?.id ?? randomUUID()).trim()
  const title = String(body.title ?? existing?.title ?? '').trim()
  const quantity = Number(body.quantity ?? existing?.quantity ?? 1)
  const coefficient = Number(body.coefficient ?? existing?.coefficient ?? 1)
  const reminderInterval = body.reminderInterval ?? existing?.reminderInterval
  const status = String(body.status ?? existing?.status ?? 'active') as TaskStatus

  if (!id) return { error: 'id is required' }
  if (!title) return { error: 'title is required' }
  if (!Number.isFinite(quantity) || quantity < 1) return { error: 'quantity must be ≥ 1' }
  if (!Number.isFinite(coefficient) || coefficient <= 0) {
    return { error: 'coefficient must be > 0' }
  }
  if (!isReminderInterval(reminderInterval)) {
    return { error: 'interval must be one of 3m|15m|30m|1h|2h|3h|4h|daily' }
  }
  if (status !== 'active' && status !== 'completed' && status !== 'cancelled') {
    return { error: 'status must be active|completed|cancelled' }
  }

  const startTime =
    body.startTime === undefined
      ? (existing?.startTime ?? null)
      : body.startTime
        ? String(body.startTime)
        : null
  const deadline =
    body.deadline === undefined
      ? (existing?.deadline ?? null)
      : body.deadline
        ? String(body.deadline)
        : null

  let completedAt =
    body.completedAt === undefined
      ? (existing?.completedAt ?? null)
      : body.completedAt
        ? String(body.completedAt)
        : null

  if (status === 'completed' && !completedAt) {
    completedAt = existing?.completedAt ?? nowIso()
  }
  if (status !== 'completed') {
    completedAt = null
  }

  const createdAt = existing?.createdAt ?? (body.createdAt ? String(body.createdAt) : nowIso())
  const updatedAt = body.updatedAt ? String(body.updatedAt) : nowIso()

  return {
    data: {
      id,
      userId,
      title,
      quantity,
      coefficient,
      reminderInterval,
      startTime,
      deadline,
      status,
      createdAt,
      completedAt,
      updatedAt,
    },
  }
}

tasksRouter.get('/', (req: Request, res: Response) => {
  try {
    const userId = req.telegramUserId
    if (userId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }
    const tasks = tasksRepo.listByUser(userId)
    console.log(`[api:tasks] GET userId=${userId} count=${tasks.length}`)
    res.json({ success: true, tasks })
  } catch (error) {
    console.error('[api:tasks] GET failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

tasksRouter.post('/', (req: Request, res: Response) => {
  try {
    const userId = req.telegramUserId
    if (userId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }

    const parsed = parseTaskBody((req.body ?? {}) as Body, userId)
    if (parsed.error || !parsed.data) {
      res.status(400).json({ success: false, error: parsed.error ?? 'Invalid body' })
      return
    }

    const existing = tasksRepo.getById(parsed.data.id)
    if (existing && existing.userId !== userId) {
      res.status(403).json({ success: false, error: 'Forbidden' })
      return
    }

    const task = tasksRepo.upsert(parsed.data)
    syncReminderForTask(task)
    console.log(`[api:tasks] POST «${task.title}» id=${task.id} userId=${userId}`)
    res.status(existing ? 200 : 201).json({ success: true, task })
  } catch (error) {
    console.error('[api:tasks] POST failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

tasksRouter.put('/:id', (req: Request, res: Response) => {
  try {
    const userId = req.telegramUserId
    if (userId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }

    const id = String(req.params.id ?? '').trim()
    const existing = tasksRepo.getById(id)
    if (!existing || existing.userId !== userId) {
      res.status(404).json({ success: false, error: 'Task not found' })
      return
    }

    const clientUpdatedAt = (req.body as Body)?.updatedAt
      ? String((req.body as Body).updatedAt)
      : null
    if (clientUpdatedAt && clientUpdatedAt < existing.updatedAt) {
      console.log(
        `[api:tasks] 409 conflict id=${id} client=${clientUpdatedAt} server=${existing.updatedAt}`,
      )
      res.status(409).json({ success: false, error: 'Conflict', task: existing })
      return
    }

    const parsed = parseTaskBody((req.body ?? {}) as Body, userId, existing)
    if (parsed.error || !parsed.data) {
      res.status(400).json({ success: false, error: parsed.error ?? 'Invalid body' })
      return
    }

    parsed.data.id = id
    parsed.data.createdAt = existing.createdAt
    const task = tasksRepo.upsert(parsed.data)
    syncReminderForTask(task)
    console.log(`[api:tasks] PUT «${task.title}» id=${task.id}`)
    res.json({ success: true, task })
  } catch (error) {
    console.error('[api:tasks] PUT failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

tasksRouter.post('/:id/complete', (req: Request, res: Response) => {
  try {
    const userId = req.telegramUserId
    if (userId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }

    const id = String(req.params.id ?? '').trim()
    const existing = tasksRepo.getById(id)
    if (!existing || existing.userId !== userId) {
      res.status(404).json({ success: false, error: 'Task not found' })
      return
    }

    const task = tasksRepo.complete(id)
    remindersRepo.deleteByTaskId(id)
    console.log(`[api:tasks] COMPLETE «${existing.title}» id=${id}`)
    res.json({ success: true, task })
  } catch (error) {
    console.error('[api:tasks] COMPLETE failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

tasksRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const userId = req.telegramUserId
    if (userId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }

    const id = String(req.params.id ?? '').trim()
    const existing = tasksRepo.getById(id)
    if (!existing || existing.userId !== userId) {
      res.status(404).json({ success: false, error: 'Task not found' })
      return
    }

    tasksRepo.delete(id)
    remindersRepo.deleteByTaskId(id)
    console.log(`[api:tasks] DELETE «${existing.title}» id=${id}`)
    res.json({ success: true, deleted: true })
  } catch (error) {
    console.error('[api:tasks] DELETE failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})
