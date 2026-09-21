import { categoriesRepo, descriptionsRepo, unitsRepo } from '../db/dictRepo'
import { intervalsRepo } from '../db/intervalsRepo'

export type TaxReportRow = {
  categoryId: string | null
  descriptionId: string | null
  categoryName: string | null
  descriptionName: string | null
  unitId: string
  unitName: string
  quantity: number
}

export type TaxReport = {
  year: number
  month: number
  groupBy: string
  rows: TaxReportRow[]
}

export function buildTaxReport(
  userId: number,
  year: number,
  month: number,
  groupBy: string,
): TaxReport {
  const entries = intervalsRepo.listCompletedInMonth(userId, year, month)
  const cats = new Map(categoriesRepo.list(userId).map((c) => [c.id, c.name]))
  const descs = new Map(descriptionsRepo.list(userId).map((d) => [d.id, d.name]))
  const units = new Map(unitsRepo.list(userId).map((u) => [u.id, u.name]))

  type Agg = TaxReportRow
  const map = new Map<string, Agg>()

  for (const entry of entries) {
    for (const w of intervalsRepo.listWorkItems(entry.id)) {
      const catKey = groupBy === 'description' ? '' : w.categoryId
      const descKey = groupBy === 'category' ? '' : w.descriptionId
      const key = `${catKey}|${descKey}|${w.unitId}`
      const prev = map.get(key)
      if (prev) {
        prev.quantity = Math.round((prev.quantity + w.quantity) * 1000) / 1000
      } else {
        map.set(key, {
          categoryId: catKey || null,
          descriptionId: descKey || null,
          categoryName: catKey ? (cats.get(catKey) ?? null) : null,
          descriptionName: descKey ? (descs.get(descKey) ?? null) : null,
          unitId: w.unitId,
          unitName: units.get(w.unitId) ?? '',
          quantity: Math.round(w.quantity * 1000) / 1000,
        })
      }
    }
  }

  return {
    year,
    month,
    groupBy,
    rows: [...map.values()].sort((a, b) =>
      `${a.categoryName}-${a.descriptionName}`.localeCompare(
        `${b.categoryName}-${b.descriptionName}`,
      ),
    ),
  }
}

export function taxReportToCsv(report: TaxReport): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const lines = [
    ['category', 'description', 'quantity', 'unit'].join(','),
    ...report.rows.map((r) =>
      [
        escape(r.categoryName ?? ''),
        escape(r.descriptionName ?? ''),
        String(Math.round(r.quantity * 1000) / 1000),
        escape(r.unitName ?? ''),
      ].join(','),
    ),
  ]
  return lines.join('\r\n')
}
