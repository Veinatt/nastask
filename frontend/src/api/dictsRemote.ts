import { apiFetch } from '@/api/client'
import type { DictItem, DictKind } from '@/db/types'

const paths: Record<DictKind, string> = {
  categories: '/api/categories',
  descriptions: '/api/descriptions',
  units: '/api/units',
}

export const dictsRemote = {
  async list(kind: DictKind): Promise<DictItem[]> {
    const res = await apiFetch<{ success: true; items: Array<DictItem & { userId?: number }> }>(
      paths[kind],
    )
    return (res?.items ?? []).map(({ id, name }) => ({ id, name }))
  },

  async create(kind: DictKind, name: string, id: string): Promise<DictItem> {
    const res = await apiFetch<{ success: true; item: DictItem & { userId?: number } }>(
      paths[kind],
      {
        method: 'POST',
        body: JSON.stringify({ name, id }),
      },
    )
    const item = res!.item
    return { id: item.id, name: item.name }
  },

  async update(kind: DictKind, id: string, name: string): Promise<DictItem> {
    const res = await apiFetch<{ success: true; item: DictItem & { userId?: number } }>(
      `${paths[kind]}/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify({ name }),
      },
    )
    const item = res!.item
    return { id: item.id, name: item.name }
  },

  async remove(kind: DictKind, id: string): Promise<void> {
    await apiFetch(`${paths[kind]}/${id}`, { method: 'DELETE' })
  },
}
