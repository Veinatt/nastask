import { apiFetch } from '@/api/client'
import type {
  SalaryReport,
  TaxReport,
  TimeEntry,
  WorkItem,
  WorkItemInput,
} from '@/db/types'

export type IntervalDto = TimeEntry & {
  liveTotalSeconds: number
  isPaused: boolean
  isActive: boolean
  workItems: WorkItem[]
}

type OkInterval = { success: true; interval: IntervalDto }
type OkList = { success: true; intervals: IntervalDto[] }

function mapInterval(dto: IntervalDto): { entry: TimeEntry; workItems: WorkItem[] } {
  const { workItems, liveTotalSeconds, isPaused, isActive, ...rest } = dto
  return {
    entry: {
      ...rest,
      liveTotalSeconds,
      isPaused,
      isActive,
    },
    workItems: workItems ?? [],
  }
}

export const intervalsRemote = {
  async start(title: string, id: string): Promise<{ entry: TimeEntry; workItems: WorkItem[] }> {
    const res = await apiFetch<OkInterval>('/api/intervals/start', {
      method: 'POST',
      body: JSON.stringify({ title, id }),
    })
    return mapInterval(res!.interval)
  },

  async manual(payload: {
    id: string
    title: string
    start: string
    end: string
    coefficient: number
    workItems: WorkItemInput[]
  }): Promise<{ entry: TimeEntry; workItems: WorkItem[] }> {
    const res = await apiFetch<OkInterval>('/api/intervals/manual', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return mapInterval(res!.interval)
  },

  async pause(id: string): Promise<{ entry: TimeEntry; workItems: WorkItem[] }> {
    const res = await apiFetch<OkInterval>(`/api/intervals/${id}/pause`, {
      method: 'PUT',
    })
    return mapInterval(res!.interval)
  },

  async resume(id: string): Promise<{ entry: TimeEntry; workItems: WorkItem[] }> {
    const res = await apiFetch<OkInterval>(`/api/intervals/${id}/resume`, {
      method: 'PUT',
    })
    return mapInterval(res!.interval)
  },

  async complete(
    id: string,
    payload: { coefficient: number; workItems: WorkItemInput[] },
  ): Promise<{ entry: TimeEntry; workItems: WorkItem[] }> {
    const res = await apiFetch<OkInterval>(`/api/intervals/${id}/complete`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    return mapInterval(res!.interval)
  },

  async update(
    id: string,
    payload: Partial<{
      title: string
      coefficient: number
      start: string
      end: string | null
      workItems: WorkItemInput[]
    }>,
  ): Promise<{ entry: TimeEntry; workItems: WorkItem[] }> {
    const res = await apiFetch<OkInterval>(`/api/intervals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    return mapInterval(res!.interval)
  },

  async remove(id: string): Promise<void> {
    await apiFetch(`/api/intervals/${id}`, { method: 'DELETE' })
  },

  async listActive(): Promise<Array<{ entry: TimeEntry; workItems: WorkItem[] }>> {
    const res = await apiFetch<OkList>('/api/intervals/active')
    return (res?.intervals ?? []).map(mapInterval)
  },

  async listCompleted(date: string): Promise<Array<{ entry: TimeEntry; workItems: WorkItem[] }>> {
    const res = await apiFetch<OkList>(
      `/api/intervals/completed?date=${encodeURIComponent(date)}`,
    )
    return (res?.intervals ?? []).map(mapInterval)
  },

  async listCompletedRange(
    from: string,
    to: string,
  ): Promise<Array<{ entry: TimeEntry; workItems: WorkItem[] }>> {
    const res = await apiFetch<OkList>(
      `/api/intervals/completed?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    )
    return (res?.intervals ?? []).map(mapInterval)
  },

  async listAllCompleted(): Promise<Array<{ entry: TimeEntry; workItems: WorkItem[] }>> {
    const res = await apiFetch<OkList>('/api/intervals/completed')
    return (res?.intervals ?? []).map(mapInterval)
  },

  async salaryReport(year: number, month: number): Promise<SalaryReport> {
    const res = await apiFetch<{ success: true; report: SalaryReport }>(
      `/api/intervals/report/salary?year=${year}&month=${month}`,
    )
    const report = res!.report
    return {
      ...report,
      expenses: report.expenses ?? [],
      expensesSum: report.expensesSum ?? 0,
    }
  },

  async taxReport(
    year: number,
    month: number,
    groupBy: 'category' | 'description' | 'both' = 'both',
  ): Promise<TaxReport> {
    const res = await apiFetch<{ success: true; report: TaxReport }>(
      `/api/intervals/report/tax?year=${year}&month=${month}&groupBy=${groupBy}`,
    )
    return res!.report
  },
}
