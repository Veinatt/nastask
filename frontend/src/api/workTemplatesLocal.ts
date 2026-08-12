import { db } from '@/db'
import type { WorkTemplate } from '@/db/types'

export const workTemplatesLocal = {
  async list(): Promise<WorkTemplate[]> {
    return db.workTemplates.orderBy('name').toArray()
  },

  async put(item: WorkTemplate): Promise<void> {
    await db.workTemplates.put(item)
  },

  async remove(id: string): Promise<void> {
    await db.workTemplates.delete(id)
  },

  async replaceAll(items: WorkTemplate[]): Promise<void> {
    await db.transaction('rw', db.workTemplates, async () => {
      await db.workTemplates.clear()
      if (items.length) await db.workTemplates.bulkPut(items)
    })
  },
}
