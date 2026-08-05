export interface UserSettings {
  id: 'app'
  hourlyRate: number
  taxRate: number
  currency: string
  timezone: string
  updatedAt: string
}

export interface TimeEntry {
  id: string
  title: string
  coefficient: number
  start: string
  end: string | null
  totalSeconds: number
  pauseTotalSeconds: number
  pauseStartedAt: string | null
  date: string
  createdAt: string
  updatedAt: string
  /** Present after server round-trip; recomputed locally for UI tick */
  liveTotalSeconds?: number
  isPaused?: boolean
  isActive?: boolean
}

export interface WorkItem {
  id: string
  timeEntryId: string
  categoryId: string
  descriptionId: string
  quantity: number
  unitId: string
}

export interface DictItem {
  id: string
  name: string
}

export interface WorkItemInput {
  id?: string
  categoryId: string
  descriptionId: string
  quantity: number
  unitId: string
}

export type PendingOpType =
  | 'interval_start'
  | 'interval_manual'
  | 'interval_pause'
  | 'interval_resume'
  | 'interval_complete'
  | 'interval_update'
  | 'interval_delete'
  | 'dict_create'
  | 'dict_update'
  | 'dict_delete'
  | 'settings_put'

export type DictKind = 'categories' | 'descriptions' | 'units' | 'expenses'

export interface PendingOp {
  id: string
  type: PendingOpType
  entityId: string
  payload: unknown
  createdAt: string
  tries: number
}

export interface SalaryReportRow {
  id: string
  date: string
  start?: string
  end?: string | null
  title: string
  hours: number
  coefficient: number
  amount: number
  totalSeconds: number
}

export interface SalaryExpense {
  id: string
  userId: number
  year: number
  month: number
  name: string
  amount: number
  createdAt: string
}

export interface ExpenseArticle {
  id: string
  userId: number
  name: string
}

export interface SalaryReport {
  year: number
  month: number
  currency: string
  hourlyRate: number
  taxRate: number
  rows: SalaryReportRow[]
  totalHours: number
  monthSum: number
  taxAmount: number
  expenses: SalaryExpense[]
  expensesSum: number
  employerPay: number
}

export interface TaxReportRow {
  categoryId: string | null
  descriptionId: string | null
  categoryName: string | null
  descriptionName: string | null
  unitId: string
  unitName: string
  quantity: number
}

export interface TaxReport {
  year: number
  month: number
  groupBy: string
  rows: TaxReportRow[]
}
