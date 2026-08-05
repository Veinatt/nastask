import { useLiveQuery } from 'dexie-react-hooks'
import { dictsLocal } from '@/api/dictsLocal'
import { dictsRemote } from '@/api/dictsRemote'
import { enqueueOp } from '@/api/pendingOps'
import { t } from '@/lib/i18n'
import { generateId } from '@/utils/idGenerator'
import type { DictItem, DictKind } from '@/db/types'
import { ApiError } from '@/api/client'

export function useDictionaries(kind: DictKind) {
  const items = useLiveQuery(() => dictsLocal.list(kind), [kind]) ?? []

  const create = async (name: string, id = generateId()): Promise<DictItem> => {
    const trimmed = name.trim()
    if (!trimmed) throw new Error(t('dicts.nameRequired'))
    const existing = items.find(
      (i) => i.name.toLowerCase() === trimmed.toLowerCase(),
    )
    if (existing) return existing

    const item: DictItem = { id, name: trimmed }
    await dictsLocal.put(kind, item)
    try {
      return await dictsRemote.create(kind, trimmed, id)
    } catch (error) {
      if (!navigator.onLine || error instanceof TypeError) {
        await enqueueOp('dict_create', id, { kind, name: trimmed, id })
        return item
      }
      if (error instanceof ApiError && error.status === 409) {
        const remote = await dictsRemote.list(kind)
        await dictsLocal.replaceAll(kind, remote)
        const found = remote.find(
          (i) => i.name.toLowerCase() === trimmed.toLowerCase(),
        )
        if (found) return found
      }
      throw error
    }
  }

  const rename = async (id: string, name: string): Promise<DictItem> => {
    const trimmed = name.trim()
    if (!trimmed) throw new Error(t('dicts.nameRequired'))
    const dup = items.find(
      (i) => i.id !== id && i.name.toLowerCase() === trimmed.toLowerCase(),
    )
    if (dup) throw new Error(t('dicts.duplicateName'))

    const item: DictItem = { id, name: trimmed }
    await dictsLocal.put(kind, item)
    try {
      return await dictsRemote.update(kind, id, trimmed)
    } catch (error) {
      if (!navigator.onLine || error instanceof TypeError) {
        await enqueueOp('dict_update', id, { kind, name: trimmed })
        return item
      }
      if (error instanceof ApiError && error.status === 409) {
        throw new Error(t('dicts.duplicateName'))
      }
      throw error
    }
  }

  const remove = async (id: string): Promise<void> => {
    try {
      await dictsRemote.remove(kind, id)
      await dictsLocal.remove(kind, id)
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        throw new Error(
          kind === 'expenses'
            ? t('dicts.deleteInUseExpenses')
            : t('dicts.deleteInUse'),
        )
      }
      if (!navigator.onLine || error instanceof TypeError) {
        await dictsLocal.remove(kind, id)
        await enqueueOp('dict_delete', id, { kind })
        return
      }
      throw error
    }
  }

  return { items, create, rename, remove }
}

/** Resolve existing by id/name, or create only when explicitly requested. */
export function useAutoComplete(kind: DictKind) {
  const { items, create } = useDictionaries(kind)

  const findExact = (name: string): DictItem | undefined => {
    const q = name.trim().toLowerCase()
    if (!q) return undefined
    return items.find((i) => i.name.toLowerCase() === q)
  }

  const resolveExisting = (nameOrId: string): DictItem | undefined => {
    const byId = items.find((i) => i.id === nameOrId)
    if (byId) return byId
    return findExact(nameOrId)
  }

  const suggestions = (query: string, limit = 8): DictItem[] => {
    const q = query.trim().toLowerCase()
    if (!q) return items.slice(0, limit)
    return items.filter((i) => i.name.toLowerCase().includes(q)).slice(0, limit)
  }

  return { items, create, findExact, resolveExisting, suggestions }
}
