import { formatInTimeZone } from 'date-fns-tz'
import { categoriesRepo, descriptionsRepo, unitsRepo } from '../db/dictRepo'
import { intervalsRepo } from '../db/intervalsRepo'
import type { TimeEntry } from '../types'

export type TaxReportRow = {
  categoryId: string | null
  descriptionId: string | null
  categoryName: string | null
  descriptionName: string | null
  unitId: string
  unitName: string
  quantity: number
  notes: string
}

export type TaxReport = {
  year: number
  month: number
  groupBy: string
  rows: TaxReportRow[]
}

const NOTE_TZ = 'Europe/Minsk'

function formatNoteStamp(startIso: string): string {
  try {
    return formatInTimeZone(new Date(startIso), NOTE_TZ, 'dd.MM HH:mm')
  } catch {
    return ''
  }
}

function noteFragment(entry: TimeEntry): string | null {
  const text = entry.notes?.trim()
  if (!text) return null
  const stamp = formatNoteStamp(entry.start)
  return stamp ? `${text} (${stamp})` : text
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

  type Agg = TaxReportRow & { noteByEntryId: Map<string, string> }
  const map = new Map<string, Agg>()

  for (const entry of entries) {
    const fragment = noteFragment(entry)
    for (const w of intervalsRepo.listWorkItems(entry.id)) {
      const catKey = groupBy === 'description' ? '' : w.categoryId
      const descKey = groupBy === 'category' ? '' : w.descriptionId
      const key = `${catKey}|${descKey}|${w.unitId}`
      let prev = map.get(key)
      if (!prev) {
        prev = {
          categoryId: catKey || null,
          descriptionId: descKey || null,
          categoryName: catKey ? (cats.get(catKey) ?? null) : null,
          descriptionName: descKey ? (descs.get(descKey) ?? null) : null,
          unitId: w.unitId,
          unitName: units.get(w.unitId) ?? '',
          quantity: 0,
          notes: '',
          noteByEntryId: new Map(),
        }
        map.set(key, prev)
      }
      prev.quantity = Math.round((prev.quantity + w.quantity) * 1000) / 1000
      if (fragment && !prev.noteByEntryId.has(entry.id)) {
        prev.noteByEntryId.set(entry.id, fragment)
      }
    }
  }

  return {
    year,
    month,
    groupBy,
    rows: [...map.values()]
      .map(({ noteByEntryId, ...row }) => ({
        ...row,
        notes: [...noteByEntryId.values()].join('; '),
      }))
      .sort((a, b) =>
        `${a.categoryName}-${a.descriptionName}`.localeCompare(
          `${b.categoryName}-${b.descriptionName}`,
        ),
      ),
  }
}

export function taxReportToCsv(report: TaxReport): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const lines = [
    ['Категория', 'Описание', 'Количество', 'Единица', 'Заметки'].join(','),
    ...report.rows.map((r) =>
      [
        escape(r.categoryName ?? ''),
        escape(r.descriptionName ?? ''),
        String(Math.round(r.quantity * 1000) / 1000),
        escape(r.unitName ?? ''),
        escape(r.notes ?? ''),
      ].join(','),
    ),
  ]
  return lines.join('\r\n')
}
