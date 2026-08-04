import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  WorkItemsEditor,
  draftsToWorkItems,
  emptyWorkItemDraft,
  type WorkItemDraft,
} from '@/components/intervals/WorkItemsEditor'
import {
  DateTimeFields,
  joinLocalDateTime,
  splitLocalDateTime,
} from '@/components/intervals/DateTimeFields'
import { useDictionaries } from '@/hooks/useDictionaries'
import { useI18n } from '@/hooks/useI18n'
import { intervalsLocal } from '@/api/intervalsLocal'
import { intervalsRemote } from '@/api/intervalsRemote'
import { generateId } from '@/utils/idGenerator'
import type { TimeEntry, WorkItemInput } from '@/db/types'
import { formatDuration, formatTimeRange } from '@/utils/timeDisplay'

export type IntervalDialogPayload = {
  coefficient: number
  workItems: WorkItemInput[]
  start?: string
  end?: string
}

type Props = {
  open: boolean
  entry: TimeEntry | null
  displaySeconds?: number
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: IntervalDialogPayload) => Promise<void>
  dialogTitle?: string
  /** When true, show editable start/end date+time fields */
  editTime?: boolean
}

export function CompleteIntervalDialog({
  open,
  entry,
  displaySeconds,
  onOpenChange,
  onSubmit,
  dialogTitle,
  editTime = false,
}: Props) {
  const { t } = useI18n()
  const [coefficient, setCoefficient] = useState('1')
  const [items, setItems] = useState<WorkItemDraft[]>([emptyWorkItemDraft()])
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Keep last entry while Radix plays close animation (parent clears entry immediately)
  const [viewEntry, setViewEntry] = useState<TimeEntry | null>(entry)
  const [viewSeconds, setViewSeconds] = useState(displaySeconds)
  const cats = useDictionaries('categories')
  const descs = useDictionaries('descriptions')
  const units = useDictionaries('units')

  useEffect(() => {
    if (entry) setViewEntry(entry)
  }, [entry])

  useEffect(() => {
    if (displaySeconds != null) setViewSeconds(displaySeconds)
  }, [displaySeconds])

  useEffect(() => {
    if (!open || !entry) return
    let cancelled = false

    const load = async () => {
      setCoefficient(String(entry.coefficient ?? 1))
      setError(null)
      const s = splitLocalDateTime(entry.start)
      setStartDate(s.date)
      setStartTime(s.time)
      const e = splitLocalDateTime(entry.end ?? entry.start)
      setEndDate(e.date)
      setEndTime(e.time)

      // Load existing works for completed/edit; fresh complete starts empty
      if (!editTime && !entry.end) {
        setItems([emptyWorkItemDraft()])
        return
      }

      let workItems = await intervalsLocal.workItemsFor(entry.id)
      if (workItems.length === 0) {
        try {
          const day = entry.date
          const remote = await intervalsRemote.listCompleted(day)
          const found = remote.find((r) => r.entry.id === entry.id)
          if (found?.workItems.length) {
            workItems = found.workItems
            await intervalsLocal.putEntry(found.entry, found.workItems)
          }
        } catch {
          // keep empty
        }
      }

      if (cancelled) return

      if (workItems.length === 0) {
        setItems([emptyWorkItemDraft()])
        return
      }

      const nameOf = (list: { id: string; name: string }[], id: string) =>
        list.find((x) => x.id === id)?.name ?? ''

      setItems(
        workItems.map((w) => ({
          key: w.id || generateId(),
          categoryId: w.categoryId,
          categoryName: nameOf(cats.items, w.categoryId),
          descriptionId: w.descriptionId,
          descriptionName: nameOf(descs.items, w.descriptionId),
          unitId: w.unitId,
          unitName: nameOf(units.items, w.unitId),
          quantity: String(w.quantity),
        })),
      )
    }

    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reload when dialog/entry opens
  }, [open, entry?.id, editTime])

  const submit = async () => {
    if (!entry) return
    setBusy(true)
    setError(null)
    try {
      const coef = Number(coefficient)
      if (!Number.isFinite(coef) || coef <= 0) {
        throw new Error(t('completeDialog.coefInvalid'))
      }
      const workItems = draftsToWorkItems(items)
      const payload: IntervalDialogPayload = { coefficient: coef, workItems }
      if (editTime) {
        const start = joinLocalDateTime(startDate, startTime)
        const end = joinLocalDateTime(endDate, endTime)
        if (Date.parse(end) <= Date.parse(start)) {
          throw new Error(t('completeDialog.endBeforeStart'))
        }
        payload.start = start
        payload.end = end
      }
      await onSubmit(payload)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('completeDialog.saveError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg border-primary/15">
        <DialogHeader>
          <DialogTitle>{dialogTitle ?? t('completeDialog.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!editTime && viewEntry && (
            <div className="rounded-xl bg-primary/5 border border-primary/10 px-3 py-2 text-sm">
              <span className="font-medium">
                {formatTimeRange(viewEntry.start, viewEntry.end)}
              </span>
              {viewSeconds != null && (
                <span className="text-muted-foreground">
                  {' '}
                  · {formatDuration(viewSeconds)}
                </span>
              )}
            </div>
          )}

          {editTime && (
            <div className="space-y-4 rounded-xl border border-primary/10 bg-primary/5 p-3">
              <DateTimeFields
                idPrefix="edit-start"
                label={t('completeDialog.start')}
                date={startDate}
                time={startTime}
                onDateChange={setStartDate}
                onTimeChange={setStartTime}
              />
              <DateTimeFields
                idPrefix="edit-end"
                label={t('completeDialog.end')}
                date={endDate}
                time={endTime}
                onDateChange={setEndDate}
                onTimeChange={setEndTime}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="coef">{t('completeDialog.coefficient')}</Label>
            <Input
              id="coef"
              type="number"
              min={0.01}
              step="any"
              value={coefficient}
              onChange={(e) => setCoefficient(e.target.value)}
            />
          </div>
          <WorkItemsEditor items={items} onChange={setItems} />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void submit()} disabled={busy || !entry}>
            {busy ? t('common.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
