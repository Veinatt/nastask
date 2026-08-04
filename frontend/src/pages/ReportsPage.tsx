import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MonthPicker } from '@/components/reports/MonthPicker'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { useReports } from '@/hooks/useReports'
import { useI18n } from '@/hooks/useI18n'
import { exportTaxExcel } from '@/utils/excelExport'
import { formatIntervalWhen } from '@/utils/timeDisplay'

function currentYearMonth() {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function ReportsPage() {
  const { t } = useI18n()
  const now = useMemo(() => currentYearMonth(), [])
  const [year, setYear] = useState(now.year)
  const [month, setMonth] = useState(now.month)
  const [tab, setTab] = useState<'salary' | 'tax'>('salary')
  const { salary, tax, groupBy, setGroupBy, loading, error } = useReports(year, month)

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('reports.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('reports.subtitle')}
          </p>
        </div>
        <MonthPicker
          year={year}
          month={month}
          onChange={({ year: y, month: m }) => {
            setYear(y)
            setMonth(m)
          }}
        />
      </header>

      <SegmentedControl
        fullWidth
        value={tab}
        onChange={setTab}
        options={[
          { value: 'salary', label: t('reports.tab.salary') },
          { value: 'tax', label: t('reports.tab.tasks') },
        ]}
      />

      {loading && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {tab === 'salary' && salary && (
        <section key="salary" className="grid gap-4 animate-fade-up">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="surface-panel px-4 py-3">
              <p className="section-label">{t('reports.rate')}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {t('reports.rateValue', {
                  rate: salary.hourlyRate,
                  currency: salary.currency,
                })}
              </p>
            </div>
            <div className="surface-panel px-4 py-3">
              <p className="section-label">{t('reports.total')}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-primary-soft">
                {salary.monthSum.toFixed(2)} {salary.currency}
              </p>
            </div>
            <div className="surface-tint px-4 py-3">
              <p className="section-label">
                {t('reports.employer', { taxRate: salary.taxRate })}
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {salary.employerPay.toFixed(2)} {salary.currency}
              </p>
            </div>
          </div>

          <div className="surface-panel overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/5 hover:bg-primary/5">
                  <TableHead>{t('reports.col.dateTime')}</TableHead>
                  <TableHead className="text-right">{t('reports.col.hours')}</TableHead>
                  <TableHead className="text-right">{t('reports.col.coef')}</TableHead>
                  <TableHead className="text-right">{t('reports.col.amount')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salary.rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {r.start ? formatIntervalWhen(r.start) : r.date}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.hours.toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.coefficient}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {r.amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {salary.rows.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                {t('reports.salaryEmpty')}
              </p>
            )}
          </div>
        </section>
      )}

      {tab === 'tax' && tax && (
        <section key="tax" className="grid gap-4 animate-fade-up">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1.5 min-w-0 flex-1">
              <Label>{t('reports.groupBy')}</Label>
              <Select
                value={groupBy}
                onValueChange={(v) =>
                  setGroupBy(v as 'category' | 'description' | 'both')
                }
              >
                <SelectTrigger className="w-full max-w-xs bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">{t('reports.groupBy.both')}</SelectItem>
                  <SelectItem value="category">{t('reports.groupBy.category')}</SelectItem>
                  <SelectItem value="description">{t('reports.groupBy.description')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-primary/20 shrink-0"
              onClick={() => exportTaxExcel(tax)}
            >
              <Download className="h-4 w-4 mr-1" />
              {t('common.excel')}
            </Button>
          </div>

          <div className="surface-panel overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/5 hover:bg-primary/5">
                  {(groupBy === 'both' || groupBy === 'category') && (
                    <TableHead>{t('reports.col.category')}</TableHead>
                  )}
                  {(groupBy === 'both' || groupBy === 'description') && (
                    <TableHead>{t('reports.col.description')}</TableHead>
                  )}
                  <TableHead className="text-right">{t('reports.col.quantity')}</TableHead>
                  <TableHead>{t('reports.col.unit')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tax.rows.map((r, i) => (
                  <TableRow key={i}>
                    {(groupBy === 'both' || groupBy === 'category') && (
                      <TableCell className="font-medium">{r.categoryName ?? '—'}</TableCell>
                    )}
                    {(groupBy === 'both' || groupBy === 'description') && (
                      <TableCell>{r.descriptionName ?? '—'}</TableCell>
                    )}
                    <TableCell className="text-right tabular-nums">{r.quantity}</TableCell>
                    <TableCell>{r.unitName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {tax.rows.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                {t('reports.tasksEmpty')}
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
