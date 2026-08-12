import { useLiveQuery } from 'dexie-react-hooks'
import { workTemplatesLocal } from '@/api/workTemplatesLocal'
import { workTemplatesRemote } from '@/api/workTemplatesRemote'
import { generateId } from '@/utils/idGenerator'
import type { WorkTemplate } from '@/db/types'
import { ApiError } from '@/api/client'

export function useWorkTemplates() {
  const items = useLiveQuery(() => workTemplatesLocal.list(), []) ?? []

  const create = async (input: {
    name: string
    categoryId: string
    descriptionId: string
    unitId: string
    defaultQuantity?: number
  }): Promise<WorkTemplate> => {
    const id = generateId()
    const now = new Date().toISOString()
    const local: WorkTemplate = {
      id,
      name: input.name.trim(),
      categoryId: input.categoryId,
      descriptionId: input.descriptionId,
      unitId: input.unitId,
      defaultQuantity: input.defaultQuantity ?? 1,
      createdAt: now,
    }
    await workTemplatesLocal.put(local)
    try {
      const remote = await workTemplatesRemote.create({
        ...input,
        id,
        name: local.name,
      })
      await workTemplatesLocal.put(remote)
      return remote
    } catch (error) {
      // Keep local if offline / server not ready — sync will reconcile later
      if (
        !navigator.onLine ||
        error instanceof TypeError ||
        (error instanceof ApiError && (error.status === 0 || error.status >= 500 || error.status === 404))
      ) {
        return local
      }
      await workTemplatesLocal.remove(id)
      throw error
    }
  }

  const remove = async (id: string): Promise<void> => {
    try {
      await workTemplatesRemote.remove(id)
      await workTemplatesLocal.remove(id)
    } catch (error) {
      if (!navigator.onLine || error instanceof TypeError) {
        await workTemplatesLocal.remove(id)
        return
      }
      throw error
    }
  }

  const rename = async (id: string, name: string): Promise<WorkTemplate> => {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('name is required')
    const existing = items.find((x) => x.id === id)
    if (!existing) throw new Error('Not found')
    const next = { ...existing, name: trimmed }
    await workTemplatesLocal.put(next)
    try {
      const remote = await workTemplatesRemote.update(id, { name: trimmed })
      await workTemplatesLocal.put(remote)
      return remote
    } catch (error) {
      if (
        !navigator.onLine ||
        error instanceof TypeError ||
        (error instanceof ApiError && (error.status === 0 || error.status >= 500 || error.status === 404))
      ) {
        return next
      }
      await workTemplatesLocal.put(existing)
      throw error
    }
  }

  return { items, create, remove, rename }
}
