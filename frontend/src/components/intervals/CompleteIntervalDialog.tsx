import { useEffect, useMemo, useState } from 'react'
import { StickyNote } from 'lucide-react'
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
import { recomputeWorkAndPause, sameEditInstant } from '@/utils/intervalDuration'
import { formatDuration, formatTimeRange } from '@/utils/timeDisplay'

export type IntervalDialogPayload = {
  coefficient: number
  workItems: WorkItemInput[]
  notes?: string | null
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
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

    const nameOf = (list: { id: string; name: string }[], id: string) =>
      list.find((x) => x.id === id)?.name ?? ''

    const toDrafts = (
      workItems: {
        id?: string
        categoryId: string
        descriptionId: string
        unitId: string
        quantity: number
      }[],
    ) =>
      workItems.map((w) => ({
        key: w.id || generateId(),
        categoryId: w.categoryId,
        categoryName: nameOf(cats.items, w.categoryId),
        descriptionId: w.descriptionId,
        descriptionName: nameOf(descs.items, w.descriptionId),
        unitId: w.unitId,
        unitName: nameOf(units.items, w.unitId),
        quantity: String(w.quantity),
      }))

    const load = async () => {
      setCoefficient(String(entry.coefficient ?? 1))
      setNotes(entry.notes ?? '')
      setShowNotes(Boolean(entry.notes?.trim()))
      setError(null)
      const s = splitLocalDateTime(entry.start)
      setStartDate(s.date)
      setStartTime(s.time)
      const e = splitLocalDateTime(entry.end ?? entry.start)
      setEndDate(e.date)
      setEndTime(e.time)

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
          if (found?.entry.notes != null && !cancelled) {
            setNotes(found.entry.notes ?? '')
            setShowNotes(Boolean(found.entry.notes?.trim()))
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

      setItems(toDrafts(workItems))
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
      const notesValue = notes.trim() ? notes.trim() : null
      const payload: IntervalDialogPayload = {
        coefficient: coef,
        workItems,
        notes: notesValue,
      }
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

  const notesNonEmpty = Boolean(notes.trim())

  const editDurationPreview = useMemo(() => {
    if (!editTime || !entry) return null
    try {
      const start = joinLocalDateTime(startDate, startTime)
      const end = joinLocalDateTime(endDate, endTime)
      const startMs = Date.parse(start)
      const endMs = Date.parse(end)
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
        return null
      }
      const timesUnchanged =
        sameEditInstant(start, entry.start) && sameEditInstant(end, entry.end)
      if (timesUnchanged) {
        return {
          totalSeconds: entry.totalSeconds,
          pauseTotalSeconds: entry.pauseTotalSeconds,
        }
      }
      const wall = Math.max(0, Math.floor((endMs - startMs) / 1000))
      return recomputeWorkAndPause({
        wallSeconds: wall,
        prevTotalSeconds: entry.totalSeconds,
        prevPauseSeconds: entry.pauseTotalSeconds,
      })
    } catch {
      return null
    }
  }, [editTime, entry, startDate, startTime, endDate, endTime])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-x-hidden overflow-y-auto sm:max-w-lg border-primary/15">
        <DialogHeader>
          <DialogTitle>{dialogTitle ?? t('completeDialog.title')}</DialogTitle>
        </DialogHeader>
        <div className="min-w-0 space-y-4">
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
              {editDurationPreview && (
                <p className="text-xs text-muted-foreground tabular-nums">
                  {t('completeDialog.workTime', {
                    time: formatDuration(editDurationPreview.totalSeconds),
                  })}
                  {' · '}
                  {t('completeDialog.pauseTime', {
                    time: formatDuration(editDurationPreview.pauseTotalSeconds),
                  })}
                </p>
              )}
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

          <div className="space-y-2">
            <Button
              type="button"
              variant={showNotes || notesNonEmpty ? 'secondary' : 'outline'}
              className="h-10 w-full justify-start gap-2"
              aria-pressed={showNotes}
              onClick={() => setShowNotes((v) => !v)}
            >
              <StickyNote className="h-4 w-4" />
              {notesNonEmpty ? t('notes.label') : t('notes.toggle')}
              {notesNonEmpty ? (
                <span className="ml-auto min-w-0 max-w-[50%] truncate text-xs text-muted-foreground">
                  {notes.trim()}
                </span>
              ) : null}
            </Button>
            {showNotes && (
              <textarea
                id="notes"
                className="flex min-h-[100px] w-full min-w-0 max-w-full break-words [overflow-wrap:anywhere] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder={t('notes.placeholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            )}
          </div>

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
