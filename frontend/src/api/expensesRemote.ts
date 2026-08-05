import { apiFetch } from '@/api/client'
import type { SalaryExpense } from '@/db/types'

export const expensesRemote = {
  async listMonth(
    year: number,
    month: number,
  ): Promise<{ items: SalaryExpense[]; total: number }> {
    const data = await apiFetch<{
      success: boolean
      items: SalaryExpense[]
      total: number
    }>(`/api/expenses?year=${year}&month=${month}`)
    return { items: data?.items ?? [], total: data?.total ?? 0 }
  },

  async create(input: {
    year: number
    month: number
    name: string
    amount: number
  }): Promise<SalaryExpense> {
    const data = await apiFetch<{ success: boolean; item: SalaryExpense }>(
      '/api/expenses',
      { method: 'POST', body: JSON.stringify(input) },
    )
    if (!data?.item) throw new Error('Failed to create expense')
    return data.item
  },

  async remove(id: string): Promise<void> {
    await apiFetch(`/api/expenses/${id}`, { method: 'DELETE' })
  },
}
