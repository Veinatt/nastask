import type { TaxReport } from '@/db/types'
import { requestApiDownload } from '@/utils/downloadFile'

export async function exportTaxExcel(report: TaxReport): Promise<void> {
  await requestApiDownload('tax-xlsx', {
    year: report.year,
    month: report.month,
    groupBy: report.groupBy,
  })
}
