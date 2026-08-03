import { format, fromUnixTime } from 'date-fns'
import { schedule, type ScheduledTask } from 'node-cron'
import { sendReminder } from '../bot/telegram'
import { remindersRepo } from '../db/remindersRepo'
import { settingsRepo } from '../db/settingsRepo'
import { tasksRepo } from '../db/tasksRepo'
import { computeNextRetryAt } from '../utils/backoff'
import {
  advanceNewTaskNotify,
  computeNextNewTaskNotify,
  getNextNotifyTime,
  isWorkingTime,
  nextWorkingStart,
} from '../utils/getNextNotifyTime'
import { nowSec } from '../utils/time'
import type { ReminderInterval, ReminderRow } from '../types'

let task: ScheduledTask | null = null

function taskWhenLabel(row: ReminderRow): string {
  const ts = row.startTime ?? row.createdAt
  return format(fromUnixTime(ts), 'dd.MM HH:mm')
}

function deadlineLabel(deadlineSec: number): string {
  return format(fromUnixTime(deadlineSec), 'dd.MM HH:mm')
}

function buildCloseMessage(row: ReminderRow): string {
  return `⏰ Напоминание: задача «${row.title}» (${taskWhenLabel(row)}) ещё не завершена. Проверьте в приложении NasTask.`
}

function buildDeadlineWarnMessage(row: ReminderRow): string {
  return `⏳ Скоро дедлайн: задача «${row.title}» (${taskWhenLabel(row)}) — до ${deadlineLabel(row.deadline!)}. Успейте завершить в NasTask.`
}

function buildDeadlineReachedMessage(row: ReminderRow): string {
  return `✅ Дедлайн наступил: задача «${row.title}» (${taskWhenLabel(row)}) автоматически завершена.`
}

function buildNewTaskMessage(): string {
  return '📋 Проверьте, не появились ли новые задачи? Не забудьте внести их в трекер NasTask!'
}

async function processDeadlineEvents(now: number): Promise<void> {
  const rows = remindersRepo.findWithDeadline()

  for (const row of rows) {
    if (row.deadline == null) continue

    try {
      if (row.nextRetryAt != null && row.nextRetryAt > now) continue

      const settings = settingsRepo.getOrCreate(row.userId)
      const warnAt = row.deadline - Math.max(0, settings.deadlineLeadTime) * 3600

      if (now >= row.deadline) {
        console.log(`[cron] дедлайн «${row.title}» taskId=${row.taskId}`)
        tasksRepo.complete(row.taskId)
        const sent = await sendReminder(row.userId, buildDeadlineReachedMessage(row), {
          taskId: row.taskId,
          title: row.title,
        })
        if (!sent) {
          const failCount = (row.failCount ?? 0) + 1
          const nextRetryAt = computeNextRetryAt(now, failCount)
          remindersRepo.markSendFailure(row.taskId, failCount, nextRetryAt)
          console.warn(
            `[бот] backoff deadline userId=${row.userId} failCount=${failCount} nextRetry=${new Date(nextRetryAt * 1000).toISOString()}`,
          )
          continue
        }
        remindersRepo.deleteByTaskId(row.taskId)
        console.log(`[cron] задача завершена по дедлайну «${row.title}», reminder удалён`)
        continue
      }

      if (!row.deadlineWarned && now >= warnAt) {
        console.log(`[cron] упреждение дедлайна «${row.title}» taskId=${row.taskId}`)
        const sent = await sendReminder(row.userId, buildDeadlineWarnMessage(row), {
          taskId: row.taskId,
          title: row.title,
        })
        if (!sent) {
          const failCount = (row.failCount ?? 0) + 1
          const nextRetryAt = computeNextRetryAt(now, failCount)
          remindersRepo.markSendFailure(row.taskId, failCount, nextRetryAt)
          console.warn(
            `[бот] backoff warn userId=${row.userId} failCount=${failCount} nextRetry=${new Date(nextRetryAt * 1000).toISOString()}`,
          )
          continue
        }
        remindersRepo.markSendSuccess(row.taskId)
        remindersRepo.markDeadlineWarned(row.taskId)
      }
    } catch (error) {
      console.error(`[cron] deadline error «${row.title}»`, error)
    }
  }
}

async function processNewTaskReminders(now: number): Promise<void> {
  const due = settingsRepo.findDueNewTaskReminders(now)
  if (due.length === 0) return

  console.log(`[cron] processing ${due.length} new-task reminder(s)`)

  for (const settings of due) {
    try {
      if (!settings.newTaskReminder.enabled) {
        settingsRepo.updateNextNewTaskNotify(settings.userId, null)
        continue
      }

      const { workSchedule, exceptions, timezone } = settings

      if (!isWorkingTime(now, workSchedule, exceptions, timezone)) {
        const next = computeNextNewTaskNotify(now, settings)
        settingsRepo.updateNextNewTaskNotify(settings.userId, next)
        console.log(
          `[cron] new-task вне рабочего времени userId=${settings.userId} → ${next ? new Date(next * 1000).toISOString() : 'null'}`,
        )
        continue
      }

      console.log(`[cron] new-task reminder userId=${settings.userId}`)
      const sent = await sendReminder(settings.userId, buildNewTaskMessage(), {
        taskId: `new-task:${settings.userId}`,
        title: 'new-tasks',
      })
      if (!sent) {
        const failCount = (settings.newTaskFailCount ?? 0) + 1
        const nextRetryAt = computeNextRetryAt(now, failCount)
        settingsRepo.markNewTaskSendFailure(settings.userId, failCount, nextRetryAt)
        console.warn(
          `[бот] backoff new-task userId=${settings.userId} failCount=${failCount} nextRetry=${new Date(nextRetryAt * 1000).toISOString()}`,
        )
        continue
      }

      const next = advanceNewTaskNotify(now, settings)
      settingsRepo.updateNextNewTaskNotify(settings.userId, next)
      console.log(
        `[cron] new-task next userId=${settings.userId}: ${next ? new Date(next * 1000).toISOString() : 'null'}`,
      )
    } catch (error) {
      console.error(`[cron] new-task error userId=${settings.userId}`, error)
    }
  }
}

export async function processDueReminders(): Promise<void> {
  const now = nowSec()

  await processDeadlineEvents(now)
  await processNewTaskReminders(now)

  const due = remindersRepo.findDue(now)
  if (due.length === 0) return

  console.log(`[cron] processing ${due.length} close-reminder(s) at ${now}`)

  for (const row of due) {
    try {
      if (row.deadline != null && now >= row.deadline) continue

      const settings = settingsRepo.getOrCreate(row.userId)
      const { workSchedule, exceptions, timezone } = settings

      if (!isWorkingTime(now, workSchedule, exceptions, timezone)) {
        const next = nextWorkingStart(now, workSchedule, exceptions, timezone)
        remindersRepo.updateNextNotify(row.taskId, next)
        console.log(
          `[cron] «${row.title}» вне рабочего времени → next=${new Date(next * 1000).toISOString()}`,
        )
        continue
      }

      console.log(
        `[cron] due «${row.title}» taskId=${row.taskId} userId=${row.userId} nextNotify=${new Date(row.nextNotify * 1000).toISOString()}`,
      )

      const sent = await sendReminder(row.userId, buildCloseMessage(row), {
        taskId: row.taskId,
        title: row.title,
      })
      if (!sent) {
        const failCount = (row.failCount ?? 0) + 1
        const nextRetryAt = computeNextRetryAt(now, failCount)
        remindersRepo.markSendFailure(row.taskId, failCount, nextRetryAt)
        console.warn(
          `[бот] backoff close userId=${row.userId} «${row.title}» failCount=${failCount} nextRetry=${new Date(nextRetryAt * 1000).toISOString()}`,
        )
        continue
      }

      const next = getNextNotifyTime(
        now,
        row.interval as ReminderInterval,
        workSchedule,
        exceptions,
        timezone,
      )

      if (row.deadline != null && next > row.deadline) {
        remindersRepo.updateNextNotify(row.taskId, row.deadline)
        console.log(`[cron] «${row.title}» nextNotify ограничен дедлайном`)
        continue
      }

      remindersRepo.updateNextNotify(row.taskId, next)
      console.log(
        `[cron] «${row.title}» следующее уведомление: ${new Date(next * 1000).toISOString()}`,
      )
    } catch (error) {
      console.error(`[cron] ошибка для «${row.title}» taskId=${row.taskId}`, error)
    }
  }
}

export function startReminderCron(): ScheduledTask {
  console.log('[boot:cron] registering * * * * *')
  if (task) {
    console.log('[boot:cron] already running')
    return task
  }

  task = schedule('* * * * *', () => {
    void processDueReminders()
  })

  console.log('[boot:cron] READY — tick every minute')
  return task
}

export function stopReminderCron(): void {
  if (!task) return
  console.log('[boot:cron] stopping')
  void task.stop()
  task = null
}
