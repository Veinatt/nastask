import * as XLSX from 'xlsx'
import type { Task } from '@/db/types'
import { formatDateTime, monthLabel } from './dateHelpers'

export function exportTasksToExcel(tasks: Task[], year: number, month: number): void {
  const rows = tasks.map((task) => ({
    Название: task.title,
    Количество: task.quantity,
    Коэффициент: task.coefficient,
    'Дата создания': formatDateTime(task.createdAt),
    'Дата завершения': formatDateTime(task.completedAt),
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Отчёт')

  const label = monthLabel(year, month).replace(/\s+/g, '_')
  XLSX.writeFile(workbook, `NasTask_${label}.xlsx`)
}
