import { useCallback, useEffect, useMemo, useState } from 'react'
import { format as formatDate } from 'date-fns'
import { ChevronDown, StickyNote } from 'lucide-react'
import { expensesRemote } from '@/api/expensesRemote'
import { intervalsRemote } from '@/api/intervalsRemote'
import { MonthPicker } from '@/components/reports/MonthPicker'
import { HoursCalendar } from '@/components/stats/HoursCalendar'
import { CompleteIntervalDialog } from '@/components/intervals/CompleteIntervalDialog'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Label } from '@/components/ui/label'
import { StatusChip } from '@/components/ui/status-chip'
import { SwipeToDelete } from '@/components/ui/swipe-to-delete'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useSettings } from '@/hooks/useSettings'
import { useDictionaries } from '@/hooks/useDictionaries'
import { useIntervals } from '@/hooks/useIntervals'
import { useI18n } from '@/hooks/useI18n'
import {
  formatDecimalHoursAsClock,
  formatDuration,
  formatHoursMinutes,
  getTimeRangeParts,
  todayDateString,
} from '@/utils/timeDisplay'
import { monthLabel } from '@/utils/dateHelpers'
import { formatDecimal } from '@/utils/formatNumber'
import { SoftDivider } from '@/components/ui/soft-divider'
import {
  formatFillSummary,
  getIntervalFillState,
  slavicPluralForm,
} from '@/utils/intervalFill'
import {
  aggregateCategoryAndWorkStats,
  computeStatsMetrics,
  filterAndSortIntervals,
  groupByMonthThenDay,
  hoursByDayMap,
  monthBounds,
  monthlyAggregates,
  monthsInRange,
  type IntervalWithWorks,
  type SortKey,
} from '@/utils/statsMetrics'
import type { TimeEntry } from '@/db/types'
import { cn } from '@/lib/utils'

type PeriodMode = 'all' | 'month' | 'day' | 'range'

function currentYearMonth() {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="surface-card px-4 py-3">
      <p className="section-label">{label}</p>
      <p className="mt-1.5 text-xl font-bold tabular-nums tracking-tight text-primary">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function StatsCompletedRow({
  entry,
  workCount,
  currency,
  hourlyRate,
  onEdit,
  onDelete,
}: {
  entry: TimeEntry
  workCount: number
  currency: string
  hourlyRate: number
  onEdit: (e: TimeEntry) => void
  onDelete: (id: string) => void
}) {
  const { t } = useI18n()

  const amount = (entry.totalSeconds / 3600) * entry.coefficient * hourlyRate
  const range = getTimeRangeParts(entry.start, entry.end)
  const hasNotes = Boolean(entry.notes?.trim())
  const title = entry.title?.trim()
  const fill = getIntervalFillState(entry, workCount)
  const fillSummary = formatFillSummary(fill, {
    empty: t('fill.empty'),
    works: (n) => {
      const form = slavicPluralForm(n)
      const key =
        form === 'one'
          ? 'fill.worksOne'
          : form === 'few'
            ? 'fill.worksFew'
            : 'fill.worksMany'
      return t(key, { n: String(n) })
    },
  })

  return (
    <li>
      <SwipeToDelete
        onDelete={() => onDelete(entry.id)}
        deleteAriaLabel={t('common.delete')}
        onTap={() => onEdit(entry)}
        contentClassName="surface-card flex cursor-pointer items-center justify-between gap-3 px-4 py-3 select-none"
      >
        <div
          title={t('timer.swipeDelete')}
          aria-label={t('common.edit')}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 outline-none"
        >
          <div className="min-w-0 flex-1 space-y-1">
            <p className="flex min-w-0 items-center text-sm font-medium">
              {range.dateLabel ? (
                <span className="shrink-0 tabular-nums">{range.dateLabel}</span>
              ) : null}
              {title ? (
                <>
                  {range.dateLabel ? <SoftDivider /> : null}
                  <span className="min-w-0 truncate">{title}</span>
                </>
              ) : null}
              {hasNotes ? (
                <StickyNote
                  className="ml-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                  aria-label={t('list.notesIndicator')}
                />
              ) : null}
            </p>
            <div className="min-w-0 space-y-0.5 text-xs text-muted-foreground tabular-nums">
              <p className="min-w-0 break-words [overflow-wrap:anywhere]">
                {range.timeLabel}
              </p>
              <p className="flex flex-wrap items-center">
                <span>{formatDuration(entry.totalSeconds)}</span>
                {entry.coefficient !== 1 ? (
                  <>
                    <SoftDivider />
                    <span>×{formatDecimal(entry.coefficient)}</span>
                  </>
                ) : null}
                {hourlyRate > 0 ? (
                  <>
                    <SoftDivider />
                    <span>
                      {amount.toFixed(2)} {currency}
                    </span>
                  </>
                ) : null}
              </p>
            </div>
          </div>
          <StatusChip
            className="shrink-0"
            label={fillSummary}
            tone={fill.needsWorks ? 'warn' : 'ok'}
          />
        </div>
      </SwipeToDelete>
    </li>
  )
}

export function StatsPage() {
  const { t, locale, dateFnsLocale } = useI18n()
  const now = useMemo(() => currentYearMonth(), [])
  const today = todayDateString()
  const { settings } = useSettings()
  const { items: categories } = useDictionaries('categories')
  const { items: descriptions } = useDictionaries('descriptions')
  const { updateInterval, remove } = useIntervals()

  const [year, setYear] = useState(now.year)
  const [month, setMonth] = useState(now.month)
  const [mode, setMode] = useState<PeriodMode>('all')
  const [selectedDay, setSelectedDay] = useState<string | null>(today)
  const [rangeFrom, setRangeFrom] = useState<string | null>(null)
  const [rangeTo, setRangeTo] = useState<string | null>(null)
  const [rangePicking, setRangePicking] = useState<'from' | 'to'>('from')

  const [allItems, setAllItems] = useState<IntervalWithWorks[]>([])
  const [loading, setLoading] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [topCategoriesOpen, setTopCategoriesOpen] = useState(false)
  const [topWorksOpen, setTopWorksOpen] = useState(false)
  const [expensesSum, setExpensesSum] = useState(0)

  const [coefFrom, setCoefFrom] = useState('')
  const [coefTo, setCoefTo] = useState('')
  const [categoryId, setCategoryId] = useState<string>('all')
  const [sort, setSort] = useState<SortKey>('date')

  const [editTarget, setEditTarget] = useState<TimeEntry | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const categoryName = useCallback(
    (id: string) =>
      categories.find((c) => c.id === id)?.name ?? t('stats.untitled'),
    [categories, t],
  )
  const descriptionName = useCallback(
    (id: string) =>
      descriptions.find((d) => d.id === id)?.name ?? t('stats.untitled'),
    [descriptions, t],
  )

  const formatDayLabel = (date: string): string => {
    try {
      return formatDate(new Date(`${date}T12:00:00`), 'EEE, d MMMM', {
        locale: dateFnsLocale,
      })
    } catch {
      return date
    }
  }

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await intervalsRemote.listAllCompleted()
      setAllItems(rows)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const monthBound = useMemo(() => monthBounds(year, month), [year, month])

  const periodBounds = useMemo(() => {
    if (mode === 'all') {
      if (allItems.length === 0) return { from: today, to: today }
      const dates = allItems.map((i) => i.entry.date).sort()
      return { from: dates[0]!, to: dates[dates.length - 1]! }
    }
    if (mode === 'day' && selectedDay) {
      return { from: selectedDay, to: selectedDay }
    }
    if (mode === 'range' && rangeFrom && rangeTo) {
      const lo = rangeFrom <= rangeTo ? rangeFrom : rangeTo
      const hi = rangeFrom <= rangeTo ? rangeTo : rangeFrom
      return { from: lo, to: hi }
    }
    return monthBound
  }, [mode, selectedDay, rangeFrom, rangeTo, monthBound, allItems, today])

  useEffect(() => {
    let cancelled = false
    const months = monthsInRange(periodBounds.from, periodBounds.to)
    if (months.length === 0) {
      setExpensesSum(0)
      return
    }
    void (async () => {
      try {
        const totals = await Promise.all(
          months.map(({ year: y, month: m }) =>
            expensesRemote.listMonth(y, m).then((r) => r.total),
          ),
        )
        if (!cancelled) {
          setExpensesSum(totals.reduce((s, n) => s + n, 0))
        }
      } catch (e) {
        console.error(e)
        if (!cancelled) setExpensesSum(0)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [periodBounds.from, periodBounds.to])

  const periodItems = useMemo(() => {
    if (mode === 'all') return allItems
    return allItems.filter(
      (i) => i.entry.date >= periodBounds.from && i.entry.date <= periodBounds.to,
    )
  }, [mode, allItems, periodBounds])

  const coefBounds = useMemo(() => {
    if (periodItems.length === 0) return null
    let min = Infinity
    let max = -Infinity
    for (const { entry } of periodItems) {
      const c = entry.coefficient
      if (!Number.isFinite(c)) continue
      min = Math.min(min, c)
      max = Math.max(max, c)
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null
    return { min, max }
  }, [periodItems])

  const coefFilterActive = coefBounds != null

  useEffect(() => {
    setCoefFrom('')
    setCoefTo('')
  }, [mode, periodBounds.from, periodBounds.to])

  const filtered = useMemo(() => {
    let coefMin: number | undefined
    let coefMax: number | undefined
    if (coefFilterActive && coefBounds) {
      const fromRaw = coefFrom.trim()
      const toRaw = coefTo.trim()
      coefMin = fromRaw === '' ? coefBounds.min : Number(fromRaw)
      coefMax = toRaw === '' ? coefBounds.max : Number(toRaw)
      if (!Number.isFinite(coefMin)) coefMin = coefBounds.min
      if (!Number.isFinite(coefMax)) coefMax = coefBounds.max
    }
    return filterAndSortIntervals(periodItems, {
      coefMin,
      coefMax,
      categoryId: categoryId === 'all' ? null : categoryId,
      sort,
      hourlyRate: settings.hourlyRate,
    })
  }, [
    periodItems,
    coefFilterActive,
    coefBounds,
    coefFrom,
    coefTo,
    categoryId,
    sort,
    settings.hourlyRate,
  ])

  const metrics = useMemo(
    () =>
      computeStatsMetrics(filtered, {
        hourlyRate: settings.hourlyRate,
        taxRate: settings.taxRate,
        expensesSum,
      }),
    [filtered, settings.hourlyRate, settings.taxRate, expensesSum],
  )

  const categoryWorkStats = useMemo(
    () => aggregateCategoryAndWorkStats(filtered, settings.hourlyRate),
    [filtered, settings.hourlyRate],
  )

  const topCategories = useMemo(
    () => categoryWorkStats.categories.slice(0, 8),
    [categoryWorkStats.categories],
  )
  const topWorks = useMemo(
    () => categoryWorkStats.works.slice(0, 10),
    [categoryWorkStats.works],
  )

  const monthChart = useMemo(
    () =>
      monthlyAggregates(
        allItems,
        settings.hourlyRate,
        now.year,
        now.month,
        12,
      ),
    [allItems, settings.hourlyRate, now.year, now.month],
  )

  const monthChartMaxSeconds = useMemo(
    () => Math.max(1, ...monthChart.map((m) => m.totalSeconds)),
    [monthChart],
  )

  const topCategoryMaxSeconds = useMemo(
    () => Math.max(1, ...topCategories.map((c) => c.seconds)),
    [topCategories],
  )
  const topWorksMaxSeconds = useMemo(
    () => Math.max(1, ...topWorks.map((w) => w.seconds)),
    [topWorks],
  )

  const calendarItems = useMemo(() => {
    return allItems.filter(
      (i) => i.entry.date >= monthBound.from && i.entry.date <= monthBound.to,
    )
  }, [allItems, monthBound])

  const dayHours = useMemo(() => hoursByDayMap(calendarItems), [calendarItems])
  const grouped = useMemo(() => groupByMonthThenDay(filtered), [filtered])

  const earnedHint = useMemo(() => {
    const parts: string[] = []
    if (metrics.expensesSum > 0) {
      parts.push(
        t('stats.metric.expenses', {
          amount: `${metrics.expensesSum.toFixed(2)} ${settings.currency}`,
        }),
      )
    }
    parts.push(
      t('stats.metric.employerPay', {
        amount: `${metrics.employerPay.toFixed(2)} ${settings.currency}`,
      }),
    )
    return parts.join(' · ')
  }, [metrics.expensesSum, metrics.employerPay, settings.currency, t])

  const handleCalendarSelect = (key: string) => {
    if (mode === 'range') {
      // Second tap on the start day clears the range.
      if (rangeFrom === key) {
        setRangeFrom(null)
        setRangeTo(null)
        setRangePicking('from')
        return
      }
      if (rangePicking === 'from' || !rangeFrom) {
        setRangeFrom(key)
        setRangeTo(null)
        setRangePicking('to')
      } else {
        setRangeTo(key)
        setRangePicking('from')
      }
      return
    }
    setSelectedDay(key)
    setMode('day')
  }

  useEffect(() => {
    if (mode !== 'range' || (!rangeFrom && !rangeTo)) return
    if (editTarget != null || deleteId != null) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      setRangeFrom(null)
      setRangeTo(null)
      setRangePicking('from')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mode, rangeFrom, rangeTo, editTarget, deleteId])

  const selectMonthFromChart = (y: number, m: number) => {
    setYear(y)
    setMonth(m)
    setMode('month')
    setSelectedDay(null)
    setRangeFrom(null)
    setRangeTo(null)
    setRangePicking('from')
  }

  return (
    <div className="grid min-w-0 gap-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-wide">{t('stats.title')}</h1>
      </header>

      <SegmentedControl
        fullWidth
        value={mode}
        onChange={(key) => {
          setMode(key)
          if (key === 'day' && !selectedDay) setSelectedDay(today)
          if (key === 'range') setRangePicking('from')
        }}
        options={[
          { value: 'all', label: t('stats.mode.all') },
          { value: 'month', label: t('stats.mode.month') },
          { value: 'day', label: t('stats.mode.day') },
          { value: 'range', label: t('stats.mode.range') },
        ]}
      />

      {mode !== 'all' && (
        <div key={mode} className="grid gap-3 animate-fade-up">
          <MonthPicker
            year={year}
            month={month}
            onChange={({ year: y, month: m }) => {
              setYear(y)
              setMonth(m)
              if (mode === 'day') setSelectedDay(null)
              if (mode === 'range') {
                setRangeFrom(null)
                setRangeTo(null)
                setRangePicking('from')
              }
            }}
          />
          <HoursCalendar
            year={year}
            month={month}
            hoursByDay={dayHours}
            selectedDate={mode === 'day' ? selectedDay : null}
            rangeFrom={mode === 'range' ? rangeFrom : null}
            rangeTo={mode === 'range' ? rangeTo : null}
            onSelectDate={handleCalendarSelect}
          />
        </div>
      )}

      {mode === 'all' && (
        <section className="surface-card grid gap-3 px-4 py-4">
          <h2 className="section-label">{t('stats.monthsChart')}</h2>
          <div className="flex h-32 items-end gap-1 sm:gap-1.5">
            {monthChart.map((m) => {
              const pct = (m.totalSeconds / monthChartMaxSeconds) * 100
              const shortLabel = monthLabel(m.year, m.month, locale).slice(0, 3)
              return (
                <button
                  key={m.key}
                  type="button"
                  className={cn(
                    'group flex min-w-0 flex-1 flex-col items-center gap-1.5',
                    'focus-visible:outline-none focus-visible:ring-0',
                  )}
                  onClick={() => selectMonthFromChart(m.year, m.month)}
                  aria-label={`${monthLabel(m.year, m.month, locale)}: ${formatHoursMinutes(m.totalSeconds)}`}
                >
                  <div className="flex h-24 w-full items-end justify-center">
                    <div
                      className={cn(
                        'w-full max-w-8 rounded-t-sm transition-colors duration-[280ms] ease-[var(--ease-out-soft)]',
                        'bg-primary/35 group-hover:bg-primary/55',
                        m.totalSeconds === 0 && 'min-h-0.5 bg-muted',
                      )}
                      style={{ height: `${Math.max(m.totalSeconds > 0 ? 4 : 2, pct)}%` }}
                    />
                  </div>
                  <span className="truncate text-[10px] tabular-nums capitalize text-muted-foreground">
                    {shortLabel}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      <div className="surface-card min-w-0 w-full overflow-hidden">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
        >
          <span className="font-medium">{t('stats.filters')}</span>
          <ChevronDown
            className={cn(
              'h-5 w-5 text-muted-foreground transition-transform duration-300 ease-[var(--ease-out-soft)]',
              filtersOpen && 'rotate-180',
            )}
          />
        </button>
        {filtersOpen && (
          <div className="grid min-w-0 gap-4 border-t border-border/60 px-4 py-4 animate-fade-up">
            <div className="min-w-0 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label>{t('stats.coefficient')}</Label>
                {!coefFilterActive && (
                  <span className="text-xs text-muted-foreground">{t('stats.noCoefData')}</span>
                )}
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={0}
                  disabled={!coefFilterActive}
                  value={coefFrom}
                  onChange={(e) => setCoefFrom(e.target.value)}
                  placeholder={t('stats.coefFrom')}
                  aria-label={t('stats.coefFromAria')}
                  className="min-w-0 flex-1 tabular-nums"
                />
                <span className="shrink-0 text-muted-foreground" aria-hidden>
                  —
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={0}
                  disabled={!coefFilterActive}
                  value={coefTo}
                  onChange={(e) => setCoefTo(e.target.value)}
                  placeholder={t('stats.coefTo')}
                  aria-label={t('stats.coefToAria')}
                  className="min-w-0 flex-1 tabular-nums"
                />
              </div>
              {coefFilterActive && coefBounds && (
                <p className="text-xs text-muted-foreground">
                  {t('stats.coefBoundsHint', {
                    min: coefBounds.min,
                    max: coefBounds.max,
                  })}
                </p>
              )}
            </div>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <div className="min-w-0 space-y-1.5">
                <Label>{t('stats.category')}</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder={t('common.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('stats.categoryAll')}</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label>{t('stats.sort')}</Label>
                <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">{t('stats.sort.date')}</SelectItem>
                    <SelectItem value="duration">{t('stats.sort.duration')}</SelectItem>
                    <SelectItem value="coefficient">{t('stats.sort.coefficient')}</SelectItem>
                    <SelectItem value="amount">{t('stats.sort.amount')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}

      <section className="grid grid-cols-2 gap-3">
        <MetricCard
          label={
            mode === 'all'
              ? t('stats.metric.totalHoursAll')
              : t('stats.metric.totalHoursPeriod')
          }
          value={formatHoursMinutes(metrics.totalSeconds)}
          hint={formatDuration(metrics.totalSeconds)}
        />
        <MetricCard
          label={t('stats.metric.avgPerWorkedDay')}
          value={formatDecimalHoursAsClock(metrics.avgHoursPerWorkedDay)}
          hint={t('stats.metric.workedDays', { count: metrics.workedDays })}
        />
        <MetricCard
          label={t('stats.metric.avgCoef')}
          value={metrics.weightedAvgCoefficient.toFixed(2)}
          hint={t('stats.metric.avgCoefHint')}
        />
        <MetricCard
          label={t('stats.metric.earned')}
          value={`${metrics.earned.toFixed(2)} ${settings.currency}`}
          hint={earnedHint}
        />
      </section>

      {topCategories.length > 0 && (
        <div className="surface-card min-w-0 w-full overflow-hidden">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            onClick={() => setTopCategoriesOpen((v) => !v)}
            aria-expanded={topCategoriesOpen}
          >
            <span className="font-medium">{t('stats.topCategories')}</span>
            <ChevronDown
              className={cn(
                'h-5 w-5 text-muted-foreground transition-transform duration-300 ease-[var(--ease-out-soft)]',
                topCategoriesOpen && 'rotate-180',
              )}
            />
          </button>
          {topCategoriesOpen && (
            <ul className="grid gap-2.5 border-t border-border/60 px-4 py-4 animate-fade-up">
              {topCategories.map((c) => (
                <li key={c.categoryId} className="grid gap-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate font-medium">
                      {categoryName(c.categoryId)}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatHoursMinutes(c.seconds)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{
                        width: `${(c.seconds / topCategoryMaxSeconds) * 100}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {topWorks.length > 0 && (
        <div className="surface-card min-w-0 w-full overflow-hidden">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            onClick={() => setTopWorksOpen((v) => !v)}
            aria-expanded={topWorksOpen}
          >
            <span className="font-medium">{t('stats.topWorks')}</span>
            <ChevronDown
              className={cn(
                'h-5 w-5 text-muted-foreground transition-transform duration-300 ease-[var(--ease-out-soft)]',
                topWorksOpen && 'rotate-180',
              )}
            />
          </button>
          {topWorksOpen && (
            <ul className="grid gap-2.5 border-t border-border/60 px-4 py-4 animate-fade-up">
              {topWorks.map((w) => (
                <li key={`${w.categoryId}\0${w.descriptionId}`} className="grid gap-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {descriptionName(w.descriptionId)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {categoryName(w.categoryId)}
                      </p>
                    </div>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatHoursMinutes(w.seconds)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{
                        width: `${(w.seconds / topWorksMaxSeconds) * 100}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <section className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="section-label">
            {mode === 'all' ? t('stats.list.all') : t('stats.list.period')}
          </h2>
          <span className="count-chip">
            {filtered.length}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="surface-card px-5 py-8 text-center text-sm text-muted-foreground">
            {t('stats.listEmpty')}
          </div>
        ) : (
          <div className="grid gap-5">
            {grouped.map((monthGroup) => (
              <div key={monthGroup.key} className="grid gap-3">
                <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-2">
                  <h3 className="text-base font-semibold">
                    {monthLabel(monthGroup.year, monthGroup.month, locale)}
                  </h3>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatHoursMinutes(monthGroup.totalSeconds)}
                  </span>
                </div>
                {monthGroup.days.map((day) => (
                  <div key={day.date} className="grid gap-2 pl-0 sm:pl-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <h4 className="text-sm font-medium text-primary-soft/90 capitalize">
                        {formatDayLabel(day.date)}
                      </h4>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {formatHoursMinutes(day.totalSeconds)}
                      </span>
                    </div>
                    <ul className="grid gap-2">
                      {day.items.map(({ entry, workItems }) => (
                        <StatsCompletedRow
                          key={entry.id}
                          entry={entry}
                          workCount={workItems.length}
                          currency={settings.currency}
                          hourlyRate={settings.hourlyRate}
                          onEdit={setEditTarget}
                          onDelete={setDeleteId}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      <CompleteIntervalDialog
        open={editTarget != null}
        entry={editTarget}
        dialogTitle={t('completeDialog.editTitle')}
        editTime
        displaySeconds={editTarget?.totalSeconds}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null)
        }}
        onSubmit={async (payload) => {
          if (!editTarget) return
          await updateInterval(editTarget.id, {
            title: payload.title,
            coefficient: payload.coefficient,
            workItems: payload.workItems,
            start: payload.start,
            end: payload.end ?? null,
            notes: payload.notes ?? null,
          })
          await reload()
        }}
      />

      <AlertDialog
        open={deleteId != null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('stats.deleteTitle')}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteId) return
                void remove(deleteId).then(() => reload())
              }}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
