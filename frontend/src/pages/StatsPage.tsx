import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, Pencil, Trash2 } from 'lucide-react'
import { intervalsRemote } from '@/api/intervalsRemote'
import { MonthPicker } from '@/components/reports/MonthPicker'
import { HoursCalendar } from '@/components/stats/HoursCalendar'
import { CompleteIntervalDialog } from '@/components/intervals/CompleteIntervalDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Label } from '@/components/ui/label'
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
  formatDuration,
  formatHours,
  formatTimeRange,
  todayDateString,
} from '@/utils/timeDisplay'
import { monthLabel } from '@/utils/dateHelpers'
import {
  computeStatsMetrics,
  filterAndSortIntervals,
  groupByMonthThenDay,
  hoursByDayMap,
  monthBounds,
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
  tint,
}: {
  label: string
  value: string
  hint?: string
  tint?: boolean
}) {
  return (
    <div className={cn('px-4 py-3', tint ? 'surface-tint' : 'surface-panel')}>
      <p className="section-label">{label}</p>
      <p className="mt-1.5 text-xl font-bold tabular-nums tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function StatsPage() {
  const { t, intlLocale } = useI18n()
  const now = useMemo(() => currentYearMonth(), [])
  const today = todayDateString()
  const { settings } = useSettings()
  const { items: categories } = useDictionaries('categories')
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

  const [coefFrom, setCoefFrom] = useState('')
  const [coefTo, setCoefTo] = useState('')
  const [categoryId, setCategoryId] = useState<string>('all')
  const [sort, setSort] = useState<SortKey>('date')

  const [editTarget, setEditTarget] = useState<TimeEntry | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const formatDayLabel = (date: string): string => {
    try {
      return new Date(`${date}T12:00:00`).toLocaleDateString(intlLocale, {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
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
        from: periodBounds.from,
        to: periodBounds.to,
        hourlyRate: settings.hourlyRate,
        taxRate: settings.taxRate,
      }),
    [filtered, periodBounds, settings.hourlyRate, settings.taxRate],
  )

  const calendarItems = useMemo(() => {
    return allItems.filter(
      (i) => i.entry.date >= monthBound.from && i.entry.date <= monthBound.to,
    )
  }, [allItems, monthBound])

  const dayHours = useMemo(() => hoursByDayMap(calendarItems), [calendarItems])
  const grouped = useMemo(() => groupByMonthThenDay(filtered), [filtered])

  const handleCalendarSelect = (key: string) => {
    if (mode === 'range') {
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

  return (
    <div className="grid min-w-0 gap-6">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('stats.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('stats.subtitle')}
        </p>
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
        <div key={mode} className="grid gap-4 animate-fade-up">
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
          {mode === 'range' && (
            <p className="text-sm text-muted-foreground -mt-2">
              {rangePicking === 'from' || !rangeFrom
                ? t('stats.rangePickFrom')
                : !rangeTo
                  ? t('stats.rangePickTo')
                  : t('stats.rangeSelected', {
                      from: periodBounds.from,
                      to: periodBounds.to,
                    })}
            </p>
          )}
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

      <div className="surface-panel min-w-0 w-full overflow-hidden">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
        >
          <span className="font-medium">{t('stats.filters')}</span>
          <ChevronDown
            className={cn(
              'h-5 w-5 text-muted-foreground transition-transform duration-300 ease-[var(--ease-bounce)]',
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
          value={t('stats.metric.hours', { value: formatHours(metrics.totalSeconds) })}
          hint={formatDuration(metrics.totalSeconds)}
          tint
        />
        <MetricCard
          label={t('stats.metric.avgPerWorkedDay')}
          value={t('stats.metric.hours', {
            value: metrics.avgHoursPerWorkedDay.toFixed(2),
          })}
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
          hint={t('stats.metric.employerPay', {
            amount: metrics.employerPay.toFixed(2),
          })}
          tint
        />
        <MetricCard
          label={t('stats.metric.intervals')}
          value={String(metrics.intervalCount)}
          hint={t('stats.metric.avgLength', {
            hours: metrics.avgIntervalHours.toFixed(2),
          })}
        />
        <MetricCard
          label={t('stats.metric.avgPerCalendarDay')}
          value={t('stats.metric.hours', {
            value: metrics.avgHoursPerCalendarDay.toFixed(2),
          })}
          hint={t('stats.metric.calendarDays', { count: metrics.calendarDays })}
        />
        <MetricCard
          label={t('stats.metric.pauses')}
          value={t('stats.metric.hours', {
            value: formatHours(metrics.pauseSeconds),
          })}
          hint={formatDuration(metrics.pauseSeconds)}
        />
        <MetricCard
          label={t('stats.metric.rate')}
          value={t('stats.metric.rateValue', {
            rate: settings.hourlyRate,
            currency: settings.currency,
          })}
          hint={t('stats.metric.taxHint', { rate: settings.taxRate })}
        />
      </section>

      <section className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="section-label">
            {mode === 'all' ? t('stats.list.all') : t('stats.list.period')}
          </h2>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary-soft">
            {filtered.length}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="surface-panel px-5 py-8 text-center text-sm text-muted-foreground">
            {t('stats.listEmpty')}
          </div>
        ) : (
          <div className="grid gap-5">
            {grouped.map((monthGroup) => (
              <div key={monthGroup.key} className="grid gap-3">
                <div className="flex items-baseline justify-between gap-3 border-b border-primary/15 pb-2">
                  <h3 className="text-base font-semibold">
                    {monthLabel(monthGroup.year, monthGroup.month, intlLocale)}
                  </h3>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {t('stats.metric.hours', {
                      value: formatHours(monthGroup.totalSeconds),
                    })}
                  </span>
                </div>
                {monthGroup.days.map((day) => (
                  <div key={day.date} className="grid gap-2 pl-0 sm:pl-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <h4 className="text-sm font-medium text-primary-soft/90 capitalize">
                        {formatDayLabel(day.date)}
                      </h4>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {t('stats.metric.hours', {
                          value: formatHours(day.totalSeconds),
                        })}
                      </span>
                    </div>
                    <ul className="grid gap-2">
                      {day.items.map(({ entry }) => {
                        const amount =
                          (entry.totalSeconds / 3600) *
                          entry.coefficient *
                          settings.hourlyRate
                        return (
                          <li
                            key={entry.id}
                            className="surface-panel flex items-center justify-between gap-3 px-4 py-3"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {formatTimeRange(entry.start, entry.end)}
                              </p>
                              <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                                {formatDuration(entry.totalSeconds)}
                                {entry.coefficient !== 1
                                  ? ` · ×${entry.coefficient}`
                                  : ''}
                                {settings.hourlyRate > 0
                                  ? ` · ${amount.toFixed(2)} ${settings.currency}`
                                  : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 text-primary-soft"
                                aria-label={t('common.edit')}
                                onClick={() => setEditTarget(entry)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 text-destructive hover:text-destructive"
                                aria-label={t('common.delete')}
                                onClick={() => setDeleteId(entry.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </li>
                        )
                      })}
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
            coefficient: payload.coefficient,
            workItems: payload.workItems,
            start: payload.start,
            end: payload.end ?? null,
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
