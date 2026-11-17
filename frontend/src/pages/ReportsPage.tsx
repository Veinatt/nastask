import { useMemo, useState } from 'react'
import { FileSpreadsheet, List, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { AddExpenseDialog } from '@/components/reports/AddExpenseDialog'
import { ExpensesListDialog } from '@/components/reports/ExpensesListDialog'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { useReports } from '@/hooks/useReports'
import { useI18n } from '@/hooks/useI18n'
import { DownloadBurstButton } from '@/components/reports/DownloadBurstButton'
import { exportTaxExcel } from '@/utils/excelExport'
import { formatDecimal } from '@/utils/formatNumber'
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
  const { salary, tax, groupBy, setGroupBy, loading, error, reload } = useReports(
    year,
    month,
  )
  const [addExpenseOpen, setAddExpenseOpen] = useState(false)
  const [listExpensesOpen, setListExpensesOpen] = useState(false)

  const employerLabel =
    salary && salary.expensesSum > 0
      ? t('reports.employerWithExpenses', {
          taxRate: salary.taxRate,
          expenses: formatDecimal(salary.expensesSum, 2),
          currency: salary.currency,
        })
      : t('reports.employer', { taxRate: salary?.taxRate ?? 0 })

  const groupByLabels = useMemo(
    () => ({
      both: t('reports.groupBy.both'),
      category: t('reports.groupBy.category'),
      description: t('reports.groupBy.description'),
    }),
    [t],
  )

  const noteLines = (notes: string | null | undefined): string[] => {
    if (!notes?.trim()) return []
    return notes
      .split(/;|\n/)
      .map((part) => part.trim())
      .filter(Boolean)
  }

  return (
    <div className="grid min-w-0 gap-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-wide">{t('reports.title')}</h1>
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

      <MonthPicker
        year={year}
        month={month}
        onChange={({ year: y, month: m }) => {
          setYear(y)
          setMonth(m)
        }}
      />

      {loading && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {tab === 'salary' && salary && (
        <section key="salary" className="grid gap-4 animate-fade-up">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full border-[hsl(var(--primary)/0.2)]"
              onClick={() => setAddExpenseOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('expenses.add')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full border-[hsl(var(--primary)/0.2)]"
              disabled={salary.expenses.length === 0}
              onClick={() => setListExpensesOpen(true)}
            >
              <List className="h-4 w-4 mr-1" />
              {t('expenses.list')}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="surface-card px-4 py-3">
              <p className="section-label">{t('reports.total')}</p>
              <p className="mt-1.5 text-xl font-bold tabular-nums tracking-tight text-primary">
                {salary.monthSum.toFixed(2)} {salary.currency}
              </p>
            </div>
            <div className="surface-card px-4 py-3">
              <p className="section-label">{employerLabel}</p>
              <p className="mt-1.5 text-xl font-bold tabular-nums tracking-tight text-primary">
                {salary.employerPay.toFixed(2)} {salary.currency}
              </p>
            </div>
          </div>

          <div className="surface-card overflow-hidden rounded-2xl">
            <Table>
              <TableHeader>
                <TableRow>
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
                    <TableCell className="text-right tabular-nums">
                      {formatDecimal(r.coefficient)}
                    </TableCell>
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

          <AddExpenseDialog
            open={addExpenseOpen}
            onOpenChange={setAddExpenseOpen}
            year={year}
            month={month}
            currency={salary.currency}
            onCreated={() => reload()}
          />
          <ExpensesListDialog
            open={listExpensesOpen}
            onOpenChange={setListExpensesOpen}
            currency={salary.currency}
            expenses={salary.expenses}
            expensesSum={salary.expensesSum}
            onChanged={() => reload()}
          />
        </section>
      )}

      {tab === 'tax' && tax && (
        <section key="tax" className="grid gap-4 animate-fade-up">
          <div className="flex w-full flex-wrap items-center gap-2">
            <Select
              value={groupBy}
              onValueChange={(v) =>
                setGroupBy(v as 'category' | 'description' | 'both')
              }
            >
              <SelectTrigger
                aria-label={t('reports.groupBy')}
                className="control-surface !w-max max-w-full justify-start gap-2 border-0 px-4 font-medium text-primary-soft shadow-none hover:text-primary-soft focus:border-0 focus:ring-0 data-[state=open]:border-0 [&>span]:line-clamp-none [&>span]:max-w-none"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="!w-auto !max-w-none min-w-[var(--radix-select-trigger-width)]">
                <SelectItem value="both" className="pr-3">
                  {groupByLabels.both}
                </SelectItem>
                <SelectItem value="category" className="pr-3">
                  {groupByLabels.category}
                </SelectItem>
                <SelectItem value="description" className="pr-3">
                  {groupByLabels.description}
                </SelectItem>
              </SelectContent>
            </Select>
            <DownloadBurstButton
              variant="outline"
              wrapperClassName="ml-auto shrink-0"
              className="h-10 border-0 px-4 font-medium"
              aria-label={t('common.excel')}
              title={t('common.excel')}
              onDownload={() => exportTaxExcel(tax)}
            >
              <FileSpreadsheet className="h-4 w-4" />
              {t('common.excel')}
            </DownloadBurstButton>
          </div>

          <div className="surface-card overflow-hidden rounded-2xl">
            <Table className="min-w-[36rem]">
              <TableHeader>
                <TableRow>
                  {(groupBy === 'both' || groupBy === 'category') && (
                    <TableHead className="whitespace-nowrap">
                      {t('reports.col.category')}
                    </TableHead>
                  )}
                  {(groupBy === 'both' || groupBy === 'description') && (
                    <TableHead className="whitespace-nowrap">
                      {t('reports.col.description')}
                    </TableHead>
                  )}
                  <TableHead className="whitespace-nowrap">
                    {t('reports.col.quantity')}
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    {t('reports.col.unit')}
                  </TableHead>
                  <TableHead className="min-w-[9rem] whitespace-nowrap">
                    {t('reports.col.notes')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tax.rows.map((r, i) => {
                  const notes = noteLines(r.notes)
                  return (
                    <TableRow key={i}>
                      {(groupBy === 'both' || groupBy === 'category') && (
                        <TableCell className="align-middle font-medium whitespace-nowrap">
                          {r.categoryName ?? '—'}
                        </TableCell>
                      )}
                      {(groupBy === 'both' || groupBy === 'description') && (
                        <TableCell className="align-middle whitespace-nowrap">
                          {r.descriptionName ?? '—'}
                        </TableCell>
                      )}
                      <TableCell className="align-middle tabular-nums whitespace-nowrap">
                        {formatDecimal(r.quantity)}
                      </TableCell>
                      <TableCell className="align-middle whitespace-nowrap">
                        {r.unitName}
                      </TableCell>
                      <TableCell className="align-top min-w-[9rem] text-sm text-muted-foreground">
                        {notes.length === 0 ? (
                          '—'
                        ) : (
                          <ul className="space-y-0.5">
                            {notes.map((line, j) => (
                              <li key={j} className="whitespace-nowrap">
                                {line}
                              </li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
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
