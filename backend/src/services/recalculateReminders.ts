import { remindersRepo } from '../db/remindersRepo'
import { settingsRepo } from '../db/settingsRepo'
import { recomputeNextNotifyAfterScheduleChange } from '../utils/getNextNotifyTime'
import { nowSec } from '../utils/time'

/**
 * Recalculate nextNotify for all reminders of a user after settings change.
 * Extending today's work hours resumes notifications in the new window immediately.
 */
export function recalculateRemindersForUser(userId: number): {
  updated: number
  removed: number
} {
  const settings = settingsRepo.getOrCreate(userId)
  const rows = remindersRepo.findByUserId(userId)
  const now = nowSec()
  let updated = 0
  let removed = 0

  console.log(`[recalc] userId=${userId} reminders=${rows.length}`)

  for (const row of rows) {
    const nextNotify = recomputeNextNotifyAfterScheduleChange({
      nowSec: now,
      startTime: row.startTime,
      settings,
    })

    if (row.deadline != null && nextNotify > row.deadline) {
      remindersRepo.deleteByTaskId(row.taskId)
      removed += 1
      console.log(`[recalc] removed taskId=${row.taskId} (past deadline)`)
      continue
    }

    remindersRepo.updateNextNotify(row.taskId, nextNotify)
    updated += 1
    console.log(
      `[recalc] taskId=${row.taskId} nextNotify=${new Date(nextNotify * 1000).toISOString()}`,
    )
  }

  console.log(`[recalc] done userId=${userId} updated=${updated} removed=${removed}`)
  return { updated, removed }
}
