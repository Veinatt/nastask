import { apiFetch } from '@/api/client'
import type { WorkTemplate } from '@/db/types'

type RemoteTemplate = WorkTemplate & { userId?: number }

function mapItem(item: RemoteTemplate): WorkTemplate {
  return {
    id: item.id,
    name: item.name,
    categoryId: item.categoryId,
    descriptionId: item.descriptionId,
    unitId: item.unitId,
    defaultQuantity: item.defaultQuantity,
    createdAt: item.createdAt,
  }
}

export type WorkTemplateCreateInput = {
  id?: string
  name: string
  categoryId: string
  descriptionId: string
  unitId: string
  defaultQuantity?: number
}

export const workTemplatesRemote = {
  async list(): Promise<WorkTemplate[]> {
    const res = await apiFetch<{ success: true; items: RemoteTemplate[] }>(
      '/api/work-templates',
    )
    return (res?.items ?? []).map(mapItem)
  },

  async create(input: WorkTemplateCreateInput): Promise<WorkTemplate> {
    const res = await apiFetch<{ success: true; item: RemoteTemplate }>(
      '/api/work-templates',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    )
    return mapItem(res!.item)
  },

  async update(
    id: string,
    fields: Partial<{
      name: string
      categoryId: string
      descriptionId: string
      unitId: string
      defaultQuantity: number
    }>,
  ): Promise<WorkTemplate> {
    const res = await apiFetch<{ success: true; item: RemoteTemplate }>(
      `/api/work-templates/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(fields),
      },
    )
    return mapItem(res!.item)
  },

  async remove(id: string): Promise<void> {
    await apiFetch(`/api/work-templates/${id}`, { method: 'DELETE' })
  },
}
