import { randomUUID } from 'node:crypto'
import { getDb } from './index'
import type { WorkTemplate } from '../types'
import { nowIso } from '../utils/iso'

function mapRow(row: Record<string, unknown>): WorkTemplate {
  return {
    id: String(row.id),
    userId: Number(row.userId),
    name: String(row.name),
    categoryId: String(row.categoryId),
    descriptionId: String(row.descriptionId),
    unitId: String(row.unitId),
    defaultQuantity: Number(row.defaultQuantity),
    createdAt: String(row.createdAt),
  }
}

export type WorkTemplateCreateInput = {
  name: string
  categoryId: string
  descriptionId: string
  unitId: string
  defaultQuantity?: number
  id?: string
}

export type WorkTemplateUpdateFields = {
  name?: string
  categoryId?: string
  descriptionId?: string
  unitId?: string
  defaultQuantity?: number
}

export const workTemplatesRepo = {
  list(userId: number): WorkTemplate[] {
    return (
      getDb()
        .prepare(
          `SELECT * FROM work_templates WHERE userId = ? ORDER BY name COLLATE NOCASE`,
        )
        .all(userId) as Record<string, unknown>[]
    ).map(mapRow)
  },

  get(id: string): WorkTemplate | undefined {
    const row = getDb()
      .prepare(`SELECT * FROM work_templates WHERE id = ?`)
      .get(id) as Record<string, unknown> | undefined
    return row ? mapRow(row) : undefined
  },

  create(userId: number, input: WorkTemplateCreateInput): WorkTemplate {
    const name = String(input.name ?? '').trim()
    if (!name) throw new Error('name is required')
    const categoryId = String(input.categoryId ?? '').trim()
    const descriptionId = String(input.descriptionId ?? '').trim()
    const unitId = String(input.unitId ?? '').trim()
    if (!categoryId || !descriptionId || !unitId) {
      throw new Error('categoryId, descriptionId, unitId are required')
    }
    const defaultQuantity =
      input.defaultQuantity == null ? 1 : Number(input.defaultQuantity)
    if (!Number.isFinite(defaultQuantity) || defaultQuantity <= 0) {
      throw new Error('defaultQuantity must be > 0')
    }
    const id = input.id ? String(input.id) : randomUUID()
    const createdAt = nowIso()
    getDb()
      .prepare(
        `
        INSERT INTO work_templates (
          id, userId, name, categoryId, descriptionId, unitId, defaultQuantity, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        id,
        userId,
        name,
        categoryId,
        descriptionId,
        unitId,
        defaultQuantity,
        createdAt,
      )
    const saved = this.get(id)
    if (!saved) throw new Error('Failed to create work template')
    return saved
  },

  update(id: string, fields: WorkTemplateUpdateFields): WorkTemplate {
    const existing = this.get(id)
    if (!existing) throw new Error('Work template not found')

    const name =
      fields.name !== undefined ? String(fields.name).trim() : existing.name
    if (!name) throw new Error('name is required')

    const categoryId =
      fields.categoryId !== undefined
        ? String(fields.categoryId).trim()
        : existing.categoryId
    const descriptionId =
      fields.descriptionId !== undefined
        ? String(fields.descriptionId).trim()
        : existing.descriptionId
    const unitId =
      fields.unitId !== undefined ? String(fields.unitId).trim() : existing.unitId
    if (!categoryId || !descriptionId || !unitId) {
      throw new Error('categoryId, descriptionId, unitId are required')
    }

    const defaultQuantity =
      fields.defaultQuantity !== undefined
        ? Number(fields.defaultQuantity)
        : existing.defaultQuantity
    if (!Number.isFinite(defaultQuantity) || defaultQuantity <= 0) {
      throw new Error('defaultQuantity must be > 0')
    }

    getDb()
      .prepare(
        `
        UPDATE work_templates SET
          name = ?,
          categoryId = ?,
          descriptionId = ?,
          unitId = ?,
          defaultQuantity = ?
        WHERE id = ?
        `,
      )
      .run(name, categoryId, descriptionId, unitId, defaultQuantity, id)

    const saved = this.get(id)
    if (!saved) throw new Error('Failed to update work template')
    return saved
  },

  delete(id: string): boolean {
    return getDb().prepare(`DELETE FROM work_templates WHERE id = ?`).run(id).changes > 0
  },
}
