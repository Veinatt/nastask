import { db } from '@/db'
import type { TimeEntry, WorkItem } from '@/db/types'

export const intervalsLocal = {
  async putEntry(entry: TimeEntry, workItems?: WorkItem[]): Promise<void> {
    // undefined → leave works alone (pause/resume must not wipe them)
    if (workItems === undefined) {
      await db.timeEntries.put(entry)
      return
    }
    // One transaction so liveQuery never sees a brief workCount=0 flash
    await db.transaction('rw', db.timeEntries, db.workItems, async () => {
      await db.timeEntries.put(entry)
      await db.workItems.where('timeEntryId').equals(entry.id).delete()
      if (workItems.length) await db.workItems.bulkPut(workItems)
    })
  },

  async remove(id: string): Promise<void> {
    await db.transaction('rw', db.timeEntries, db.workItems, async () => {
      await db.workItems.where('timeEntryId').equals(id).delete()
      await db.timeEntries.delete(id)
    })
  },

  async listActive(): Promise<TimeEntry[]> {
    const rows = await db.timeEntries.filter((e) => e.end == null).toArray()
    // Dexie filter() has no ORDER BY — match server: running first, then newest start.
    return rows.sort((a, b) => {
      const aRun = a.pauseStartedAt ? 0 : 1
      const bRun = b.pauseStartedAt ? 0 : 1
      if (aRun !== bRun) return bRun - aRun
      return (b.start ?? '').localeCompare(a.start ?? '')
    })
  },

  async listByDate(date: string): Promise<TimeEntry[]> {
    return db.timeEntries.where('date').equals(date).toArray()
  },

  async workItemsFor(timeEntryId: string): Promise<WorkItem[]> {
    return db.workItems.where('timeEntryId').equals(timeEntryId).toArray()
  },

  async replaceActive(
    entries: Array<{ entry: TimeEntry; workItems: WorkItem[] }>,
    keepIds: Set<string> = new Set(),
  ): Promise<void> {
    const serverIds = new Set(entries.map(({ entry }) => entry.id))
    await db.transaction('rw', db.timeEntries, db.workItems, async () => {
      const active = await db.timeEntries.filter((e) => e.end == null).toArray()
      for (const a of active) {
        // Keep optimistic / queued locals until the server (or flush) confirms them.
        if (serverIds.has(a.id) || keepIds.has(a.id)) continue
        await db.workItems.where('timeEntryId').equals(a.id).delete()
        await db.timeEntries.delete(a.id)
      }
      for (const { entry, workItems } of entries) {
        // Do not clobber a local row that still has a pending op.
        if (keepIds.has(entry.id)) continue
        await db.timeEntries.put(entry)
        // Empty workItems from a partial payload must not erase local works
        // (pause/resume race with refreshActive). Only replace when server sent any
        // or local already has none.
        if (workItems.length > 0) {
          await db.workItems.where('timeEntryId').equals(entry.id).delete()
          await db.workItems.bulkPut(workItems)
        }
      }
    })
  },

  /**
   * Upsert server completed rows for a date and drop local completed orphans
   * that are not waiting in the pending queue (so Home matches Stats/server).
   */
  async replaceCompletedForDate(
    date: string,
    entries: Array<{ entry: TimeEntry; workItems: WorkItem[] }>,
    keepIds: Set<string>,
  ): Promise<void> {
    const serverIds = new Set(entries.map(({ entry }) => entry.id))
    await db.transaction('rw', db.timeEntries, db.workItems, async () => {
      const local = await db.timeEntries.where('date').equals(date).toArray()
      for (const row of local) {
        if (row.end == null) continue
        if (serverIds.has(row.id) || keepIds.has(row.id)) continue
        await db.workItems.where('timeEntryId').equals(row.id).delete()
        await db.timeEntries.delete(row.id)
      }
      for (const { entry, workItems } of entries) {
        await db.timeEntries.put(entry)
        await db.workItems.where('timeEntryId').equals(entry.id).delete()
        if (workItems.length) await db.workItems.bulkPut(workItems)
      }
    })
  },

  /**
   * Replace all completed entries (end != null): keep keepIds pending,
   * upsert server rows, delete orphans.
   */
  async replaceAllCompleted(
    entries: Array<{ entry: TimeEntry; workItems: WorkItem[] }>,
    keepIds: Set<string>,
  ): Promise<void> {
    const serverIds = new Set(entries.map(({ entry }) => entry.id))
    await db.transaction('rw', db.timeEntries, db.workItems, async () => {
      const local = await db.timeEntries.filter((e) => e.end != null).toArray()
      for (const row of local) {
        if (serverIds.has(row.id) || keepIds.has(row.id)) continue
        await db.workItems.where('timeEntryId').equals(row.id).delete()
        await db.timeEntries.delete(row.id)
      }
      for (const { entry, workItems } of entries) {
        await db.timeEntries.put(entry)
        await db.workItems.where('timeEntryId').equals(entry.id).delete()
        if (workItems.length) await db.workItems.bulkPut(workItems)
      }
    })
  },
}
