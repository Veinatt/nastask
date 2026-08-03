import { Router, type Request, type Response } from 'express'
import { settingsRepo } from '../db/settingsRepo'
import { assertUserIdMatch, telegramAuth } from '../middleware/telegramAuth'
import { recalculateRemindersForUser } from '../services/recalculateReminders'
import {
  createDefaultUserSettings,
  type ReminderInterval,
  type ScheduleException,
  type WorkScheduleMap,
} from '../types'
import { computeNextNewTaskNotify } from '../utils/getNextNotifyTime'
import { isReminderInterval, nowSec } from '../utils/time'

export const settingsRouter = Router()

settingsRouter.use(telegramAuth)

type Body = Record<string, unknown>

function isWorkScheduleMap(value: unknown): value is WorkScheduleMap {
  if (!value || typeof value !== 'object') return false
  const weekdays = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ] as const
  return weekdays.every((day) => day in (value as object))
}

settingsRouter.get('/:userId', (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.userId)
    if (!Number.isFinite(userId)) {
      res.status(400).json({ success: false, error: 'userId must be a number' })
      return
    }
    if (!assertUserIdMatch(req, res, userId)) return

    const settings = settingsRepo.getOrCreate(userId)
    console.log(`[api:settings] GET userId=${userId}`)
    res.json({ success: true, settings })
  } catch (error) {
    console.error('[api:settings] GET failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

settingsRouter.put('/', (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as Body
    const claimedUserId = Number(body.userId)
    const userId = req.telegramUserId

    if (userId == null || !Number.isFinite(userId)) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }

    if (Number.isFinite(claimedUserId) && claimedUserId !== userId) {
      if (!assertUserIdMatch(req, res, claimedUserId)) return
    }

    const defaults = createDefaultUserSettings(userId)
    const workSchedule = isWorkScheduleMap(body.workSchedule)
      ? body.workSchedule
      : defaults.workSchedule
    const exceptions = Array.isArray(body.exceptions)
      ? (body.exceptions as ScheduleException[])
      : defaults.exceptions

    let newTaskReminder = defaults.newTaskReminder
    if (body.newTaskReminder && typeof body.newTaskReminder === 'object') {
      const ntr = body.newTaskReminder as Record<string, unknown>
      const interval = isReminderInterval(ntr.interval)
        ? (ntr.interval as ReminderInterval)
        : defaults.newTaskReminder.interval
      const firstOffsetMinutes =
        typeof ntr.firstOffsetMinutes === 'number'
          ? ntr.firstOffsetMinutes
          : defaults.newTaskReminder.firstOffsetMinutes
      newTaskReminder = {
        enabled: Boolean(ntr.enabled),
        interval,
        ...(firstOffsetMinutes !== undefined ? { firstOffsetMinutes } : {}),
      }
    }

    const reminderLeadTime =
      body.reminderLeadTime === undefined || body.reminderLeadTime === null
        ? defaults.reminderLeadTime
        : Number(body.reminderLeadTime)

    const deadlineLeadTime =
      body.deadlineLeadTime === undefined || body.deadlineLeadTime === null
        ? defaults.deadlineLeadTime
        : Number(body.deadlineLeadTime)

    if (!Number.isFinite(reminderLeadTime) || reminderLeadTime < 1 || reminderLeadTime > 12) {
      res.status(400).json({ success: false, error: 'reminderLeadTime must be 1..12' })
      return
    }
    if (!Number.isFinite(deadlineLeadTime) || deadlineLeadTime < 1 || deadlineLeadTime > 12) {
      res.status(400).json({ success: false, error: 'deadlineLeadTime must be 1..12' })
      return
    }

    const existing = settingsRepo.get(userId)
    const timezone =
      typeof body.timezone === 'string' && body.timezone.trim()
        ? body.timezone.trim()
        : (existing?.timezone ?? defaults.timezone)
    const now = nowSec()
    const draft = {
      ...defaults,
      userId,
      workSchedule,
      exceptions,
      newTaskReminder,
      reminderLeadTime,
      deadlineLeadTime,
      nextNewTaskNotify: null as number | null,
      timezone,
      newTaskFailCount: existing?.newTaskFailCount ?? 0,
      newTaskNextRetryAt: existing?.newTaskNextRetryAt ?? null,
    }

    const workWindowChanged =
      !existing ||
      JSON.stringify(existing.workSchedule) !== JSON.stringify(workSchedule) ||
      JSON.stringify(existing.exceptions) !== JSON.stringify(exceptions) ||
      existing.timezone !== timezone

    const leadTimesChanged =
      !existing ||
      existing.reminderLeadTime !== reminderLeadTime ||
      existing.deadlineLeadTime !== deadlineLeadTime

    const newTaskConfigChanged =
      !existing ||
      existing.newTaskReminder.enabled !== newTaskReminder.enabled ||
      existing.newTaskReminder.interval !== newTaskReminder.interval ||
      (existing.newTaskReminder.firstOffsetMinutes ?? 60) !==
        (newTaskReminder.firstOffsetMinutes ?? 60)

    /** Close-task reminders need recalc when work window or start lead changes. */
    const shouldRecalcCloseReminders = workWindowChanged || leadTimesChanged

    /** New-task slot depends on work window + its own config. */
    const shouldRescheduleNewTask = workWindowChanged || newTaskConfigChanged

    let nextNewTaskNotify: number | null = null
    if (newTaskReminder.enabled) {
      if (!shouldRescheduleNewTask && existing?.nextNewTaskNotify != null) {
        nextNewTaskNotify = existing.nextNewTaskNotify
        console.log(
          `[api:settings] keep nextNewTaskNotify userId=${userId} (${new Date(nextNewTaskNotify * 1000).toISOString()})`,
        )
      } else {
        nextNewTaskNotify = computeNextNewTaskNotify(now, draft)
        console.log(
          `[api:settings] recompute nextNewTaskNotify userId=${userId} → ${nextNewTaskNotify ? new Date(nextNewTaskNotify * 1000).toISOString() : 'null'}`,
        )
      }
    } else if (existing?.newTaskReminder.enabled) {
      console.log(`[api:settings] new-task reminders disabled userId=${userId}`)
    }

    console.log(
      `[api:settings] PUT userId=${userId} workChanged=${workWindowChanged} leadsChanged=${leadTimesChanged} newTaskChanged=${newTaskConfigChanged} recalcClose=${shouldRecalcCloseReminders}`,
    )

    const settings = settingsRepo.upsert({
      userId,
      workSchedule,
      exceptions,
      newTaskReminder,
      reminderLeadTime,
      deadlineLeadTime,
      nextNewTaskNotify,
      timezone,
      newTaskFailCount: shouldRescheduleNewTask ? 0 : (existing?.newTaskFailCount ?? 0),
      newTaskNextRetryAt: shouldRescheduleNewTask
        ? null
        : (existing?.newTaskNextRetryAt ?? null),
    })

    const recalc = shouldRecalcCloseReminders
      ? recalculateRemindersForUser(userId)
      : { updated: 0, removed: 0 }

    if (!shouldRecalcCloseReminders) {
      console.log(`[api:settings] skip close-reminder recalc userId=${userId} (routine sync)`)
    }

    res.json({ success: true, settings, recalc })
  } catch (error) {
    console.error('[api:settings] PUT failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})
