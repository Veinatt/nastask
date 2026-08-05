import * as XLSX from 'xlsx'
import type { SalaryReport, TaxReport } from '@/db/types'
import { t } from '@/lib/i18n'
import { roundDecimal } from '@/utils/formatNumber'
import { formatIntervalWhen } from '@/utils/timeDisplay'

export function exportSalaryExcel(report: SalaryReport): void {
  const colDateTime = t('excel.salary.dateTime')
  const colHours = t('excel.salary.hours')
  const colCoef = t('excel.salary.coefficient')
  const colAmount = t('excel.salary.amount')

  const rows = report.rows.map((r) => ({
    [colDateTime]: r.start ? formatIntervalWhen(r.start) : r.date,
    [colHours]: Number(r.hours.toFixed(4)),
    [colCoef]: roundDecimal(r.coefficient),
    [colAmount]: Number(r.amount.toFixed(2)),
  }))
  rows.push({
    [colDateTime]: t('excel.salary.total'),
    [colHours]: Number(report.totalHours.toFixed(4)),
    [colCoef]: '' as unknown as number,
    [colAmount]: Number(report.monthSum.toFixed(2)),
  })
  if ((report.expensesSum ?? 0) > 0) {
    rows.push({
      [colDateTime]: t('excel.salary.expenses'),
      [colHours]: '' as unknown as number,
      [colCoef]: '' as unknown as number,
      [colAmount]: Number(report.expensesSum.toFixed(2)),
    })
  }
  rows.push({
    [colDateTime]: t('excel.salary.tax', { rate: report.taxRate }),
    [colHours]: '' as unknown as number,
    [colCoef]: '' as unknown as number,
    [colAmount]: Number(report.taxAmount.toFixed(2)),
  })
  rows.push({
    [colDateTime]: t('excel.salary.employer'),
    [colHours]: '' as unknown as number,
    [colCoef]: '' as unknown as number,
    [colAmount]: Number(report.employerPay.toFixed(2)),
  })

  const sheet = XLSX.utils.json_to_sheet(rows)
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Salary')
  XLSX.writeFile(
    book,
    `nastask-salary-${report.year}-${String(report.month).padStart(2, '0')}.xlsx`,
  )
}

export function exportTaxExcel(report: TaxReport): void {
  const colCategory = t('excel.tasks.category')
  const colDescription = t('excel.tasks.description')
  const colQuantity = t('excel.tasks.quantity')
  const colUnit = t('excel.tasks.unit')

  const rows = report.rows.map((r) => ({
    [colCategory]: r.categoryName ?? '',
    [colDescription]: r.descriptionName ?? '',
    [colQuantity]: roundDecimal(r.quantity),
    [colUnit]: r.unitName,
  }))
  const sheet = XLSX.utils.json_to_sheet(rows)
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Tax')
  XLSX.writeFile(
    book,
    `nastask-tax-${report.year}-${String(report.month).padStart(2, '0')}.xlsx`,
  )
}
