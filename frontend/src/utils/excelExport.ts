import * as XLSX from 'xlsx'
import type { TaxReport } from '@/db/types'
import { t } from '@/lib/i18n'
import { roundDecimal } from '@/utils/formatNumber'

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

/** UTF-8 CSV with BOM for Google Sheets. */
export function exportTaxCsv(report: TaxReport): void {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const lines = [
    ['category', 'description', 'quantity', 'unit'].join(','),
    ...report.rows.map((r) =>
      [
        escape(r.categoryName ?? ''),
        escape(r.descriptionName ?? ''),
        String(roundDecimal(r.quantity)),
        escape(r.unitName ?? ''),
      ].join(','),
    ),
  ]
  const csv = `\uFEFF${lines.join('\n')}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `nastask-tasks-${report.year}-${String(report.month).padStart(2, '0')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
