import { remindersRepo } from '../db/remindersRepo'
import { settingsRepo } from '../db/settingsRepo'
import type { TaskRow } from '../db/tasksRepo'
import { computeInitialNextNotify } from '../utils/getNextNotifyTime'
import { nowSec, toUnixSeconds } from '../utils/time'
import type { ReminderInterval } from '../types'

/** Keep reminders table in sync with an active task; remove if not active. */
export function syncReminderForTask(task: TaskRow): void {
  if (task.status !== 'active') {
    remindersRepo.deleteByTaskId(task.id)
    console.log(`[tasks→reminders] deleted for completed/inactive taskId=${task.id}`)
    return
  }

  const settings = settingsRepo.getOrCreate(task.userId)
  const startTime = toUnixSeconds(task.startTime)
  const deadline = toUnixSeconds(task.deadline)
  const nextNotify = computeInitialNextNotify({
    nowSec: nowSec(),
    startTime,
    interval: task.reminderInterval as ReminderInterval,
    settings,
  })

  if (deadline != null && nextNotify > deadline) {
    // Still keep reminder so deadline handler can fire
    remindersRepo.upsert({
      taskId: task.id,
      userId: task.userId,
      title: task.title,
      interval: task.reminderInterval as ReminderInterval,
      startTime,
      deadline,
      nextNotify: deadline,
    })
    console.log(`[tasks→reminders] upsert taskId=${task.id} nextNotify=deadline`)
    return
  }

  const { created } = remindersRepo.upsert({
    taskId: task.id,
    userId: task.userId,
    title: task.title,
    interval: task.reminderInterval as ReminderInterval,
    startTime,
    deadline,
    nextNotify,
  })
  console.log(
    `[tasks→reminders] ${created ? 'created' : 'updated'} taskId=${task.id} nextNotify=${new Date(nextNotify * 1000).toISOString()}`,
  )
}
