import { getDb } from './index'
import type { DictItem } from '../types'
import { randomUUID } from 'node:crypto'

type DictTable = 'categories' | 'work_descriptions' | 'units'

function mapRow(row: Record<string, unknown>): DictItem {
  return {
    id: String(row.id),
    userId: Number(row.userId),
    name: String(row.name),
  }
}

function createDictRepo(table: DictTable) {
  return {
    list(userId: number): DictItem[] {
      return (
        getDb()
          .prepare(`SELECT * FROM ${table} WHERE userId = ? ORDER BY name COLLATE NOCASE`)
          .all(userId) as Record<string, unknown>[]
      ).map(mapRow)
    },

    get(id: string): DictItem | undefined {
      const row = getDb()
        .prepare(`SELECT * FROM ${table} WHERE id = ?`)
        .get(id) as Record<string, unknown> | undefined
      return row ? mapRow(row) : undefined
    },

    create(userId: number, name: string, id: string = randomUUID()): DictItem {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('name is required')
      getDb()
        .prepare(`INSERT INTO ${table} (id, userId, name) VALUES (?, ?, ?)`)
        .run(id, userId, trimmed)
      const row = this.get(id)
      if (!row) throw new Error('Failed to create dict item')
      return row
    },

    update(id: string, name: string): DictItem {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('name is required')
      getDb()
        .prepare(`UPDATE ${table} SET name = ? WHERE id = ?`)
        .run(trimmed, id)
      const row = this.get(id)
      if (!row) throw new Error('Failed to update dict item')
      return row
    },

    delete(id: string): boolean {
      return getDb().prepare(`DELETE FROM ${table} WHERE id = ?`).run(id).changes > 0
    },

    isUsed(id: string): boolean {
      const column =
        table === 'categories'
          ? 'categoryId'
          : table === 'work_descriptions'
            ? 'descriptionId'
            : 'unitId'
      const row = getDb()
        .prepare(`SELECT 1 FROM work_items WHERE ${column} = ? LIMIT 1`)
        .get(id)
      return Boolean(row)
    },
  }
}

export const categoriesRepo = createDictRepo('categories')
export const descriptionsRepo = createDictRepo('work_descriptions')
export const unitsRepo = createDictRepo('units')
