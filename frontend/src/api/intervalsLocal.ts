import { db } from '@/db'
import type { TimeEntry, WorkItem } from '@/db/types'

export const intervalsLocal = {
  async putEntry(entry: TimeEntry, workItems?: WorkItem[]): Promise<void> {
    await db.timeEntries.put(entry)
    if (workItems) {
      await db.workItems.where('timeEntryId').equals(entry.id).delete()
      if (workItems.length) await db.workItems.bulkPut(workItems)
    }
  },

  async remove(id: string): Promise<void> {
    await db.transaction('rw', db.timeEntries, db.workItems, async () => {
      await db.workItems.where('timeEntryId').equals(id).delete()
      await db.timeEntries.delete(id)
    })
  },

  async listActive(): Promise<TimeEntry[]> {
    return db.timeEntries.filter((e) => e.end == null).toArray()
  },

  async listByDate(date: string): Promise<TimeEntry[]> {
    return db.timeEntries.where('date').equals(date).toArray()
  },

  async workItemsFor(timeEntryId: string): Promise<WorkItem[]> {
    return db.workItems.where('timeEntryId').equals(timeEntryId).toArray()
  },

  async replaceActive(entries: Array<{ entry: TimeEntry; workItems: WorkItem[] }>): Promise<void> {
    await db.transaction('rw', db.timeEntries, db.workItems, async () => {
      const active = await db.timeEntries.filter((e) => e.end == null).toArray()
      for (const a of active) {
        await db.workItems.where('timeEntryId').equals(a.id).delete()
        await db.timeEntries.delete(a.id)
      }
      for (const { entry, workItems } of entries) {
        await db.timeEntries.put(entry)
        if (workItems.length) await db.workItems.bulkPut(workItems)
      }
    })
  },
}
