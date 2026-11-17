import { useEffect, useRef, useState } from 'react'
import { StickyNote } from 'lucide-react'
import {
  Dialog,
  DialogBody,
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
  title: string
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
  /** draft = edit active without completing; complete = finish interval */
  mode?: 'complete' | 'draft'
}

export function CompleteIntervalDialog({
  open,
  entry,
  displaySeconds,
  onOpenChange,
  onSubmit,
  dialogTitle,
  editTime = false,
  mode = 'complete',
}: Props) {
  const { t } = useI18n()
  const [title, setTitle] = useState('')
  const [coefficient, setCoefficient] = useState('1')
  const [items, setItems] = useState<WorkItemDraft[]>([emptyWorkItemDraft()])
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const notesRef = useRef<HTMLTextAreaElement>(null)
  const focusNotesOnOpen = useRef(false)
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
    if (!showNotes || !focusNotesOnOpen.current) return
    focusNotesOnOpen.current = false
    const id = window.requestAnimationFrame(() => {
      const el = notesRef.current
      if (!el) return
      el.focus()
      const end = el.value.length
      el.setSelectionRange(end, end)
    })
    return () => window.cancelAnimationFrame(id)
  }, [showNotes])

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
      setTitle(entry.title ?? '')
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
  }, [open, entry?.id, editTime, mode])

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
        title: title.trim(),
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
  const timeSubtitle =
    !editTime && viewEntry
      ? [
          formatTimeRange(viewEntry.start, viewEntry.end),
          viewSeconds != null ? formatDuration(viewSeconds) : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg border-0">
        <DialogHeader>
          <div className="min-w-0 flex-1 space-y-1 pr-1">
            <DialogTitle>
              {dialogTitle ??
                (mode === 'draft' ? t('completeDialog.draftTitle') : t('completeDialog.title'))}
            </DialogTitle>
            {timeSubtitle ? (
              <p className="truncate text-xs tabular-nums text-muted-foreground">
                {timeSubtitle}
              </p>
            ) : null}
          </div>
        </DialogHeader>
        <DialogBody className="min-w-0 space-y-4 overflow-x-hidden">
          <div className="flex items-end gap-2.5">
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="interval-title">{t('interval.title')}</Label>
              <Input
                id="interval-title"
                value={title}
                placeholder={t('interval.titlePlaceholder')}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="w-[4.5rem] shrink-0 space-y-2">
              <Label
                htmlFor="coef"
                className="block truncate"
                title={t('completeDialog.coefficient')}
              >
                {t('completeDialog.coefficientShort')}
              </Label>
              <Input
                id="coef"
                type="number"
                min={0.01}
                max={5}
                step="any"
                inputMode="decimal"
                value={coefficient}
                aria-label={t('completeDialog.coefficient')}
                className="px-2 tabular-nums"
                onChange={(e) => setCoefficient(e.target.value)}
              />
            </div>
          </div>

          {editTime && (
            <div className="space-y-4">
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

          <WorkItemsEditor
            items={items}
            onChange={setItems}
            headerExtra={
              <Button
                type="button"
                variant={notesNonEmpty ? 'default' : 'secondary'}
                className={
                  notesNonEmpty
                    ? 'h-10 px-3'
                    : 'control-surface h-10 px-3 text-primary-soft'
                }
                aria-pressed={showNotes || notesNonEmpty}
                aria-label={notesNonEmpty ? t('notes.label') : t('notes.toggle')}
                title={notesNonEmpty ? t('notes.label') : t('notes.toggle')}
                onClick={() => {
                  setShowNotes((v) => {
                    if (!v) focusNotesOnOpen.current = true
                    return !v
                  })
                }}
              >
                <span className="hidden min-[420px]:inline">
                  {notesNonEmpty ? t('notes.label') : t('notes.toggle')}
                </span>
                <StickyNote className="h-4 w-4" />
              </Button>
            }
          />

          {showNotes && (
            <textarea
              ref={notesRef}
              id="notes"
              className="flex min-h-[88px] w-full min-w-0 max-w-full break-words [overflow-wrap:anywhere] rounded-md border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:border-primary"
              placeholder={t('notes.placeholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void submit()} disabled={busy || !entry}>
            {busy
              ? t('common.saving')
              : mode === 'complete'
                ? t('timer.complete')
                : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
