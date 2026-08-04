import { db } from '@/db'
import type { DictItem, DictKind } from '@/db/types'

function table(kind: DictKind) {
  switch (kind) {
    case 'categories':
      return db.categories
    case 'descriptions':
      return db.descriptions
    case 'units':
      return db.units
  }
}

export const dictsLocal = {
  async list(kind: DictKind): Promise<DictItem[]> {
    return table(kind).orderBy('name').toArray()
  },

  async put(kind: DictKind, item: DictItem): Promise<void> {
    await table(kind).put(item)
  },

  async remove(kind: DictKind, id: string): Promise<void> {
    await table(kind).delete(id)
  },

  async replaceAll(kind: DictKind, items: DictItem[]): Promise<void> {
    const t = table(kind)
    await db.transaction('rw', t, async () => {
      await t.clear()
      if (items.length) await t.bulkPut(items)
    })
  },
}
