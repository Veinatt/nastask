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
import { generateId } from '@/utils/idGenerator'
import type { WorkItemInput } from '@/db/types'

export type ManualEntryInitial = {
  title?: string
  coefficient?: number
  workItems?: WorkItemInput[]
  notes?: string | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: {
    title: string
    start: string
    end: string
    coefficient: number
    workItems: WorkItemInput[]
    notes?: string | null
  }) => Promise<void>
  initial?: ManualEntryInitial | null
}

export function ManualEntryDialog({ open, onOpenChange, onSubmit, initial }: Props) {
  const { t } = useI18n()
  const cats = useDictionaries('categories')
  const descs = useDictionaries('descriptions')
  const units = useDictionaries('units')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [title, setTitle] = useState('')
  const [coefficient, setCoefficient] = useState('1')
  const [items, setItems] = useState<WorkItemDraft[]>([emptyWorkItemDraft()])
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const notesRef = useRef<HTMLTextAreaElement>(null)
  const focusNotesOnOpen = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    if (!open) return
    const now = splitLocalDateTime(new Date().toISOString())
    setStartDate(now.date)
    setStartTime(now.time)
    setEndDate(now.date)
    setEndTime(now.time)
    setTitle(initial?.title ?? '')
    setCoefficient(String(initial?.coefficient ?? 1))
    setNotes(initial?.notes ?? '')
    setShowNotes(Boolean(initial?.notes?.trim()))
    setError(null)

    const nameOf = (list: { id: string; name: string }[], id: string) =>
      list.find((x) => x.id === id)?.name ?? ''

    if (initial?.workItems?.length) {
      setItems(
        initial.workItems.map((w) => ({
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
    } else {
      setItems([emptyWorkItemDraft()])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on open / initial identity
  }, [open, initial])

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const coef = Number(coefficient)
      if (!Number.isFinite(coef) || coef <= 0) {
        throw new Error(t('manualDialog.coefInvalid'))
      }
      const startIso = joinLocalDateTime(startDate, startTime)
      const endIso = joinLocalDateTime(endDate, endTime)
      if (Date.parse(endIso) <= Date.parse(startIso)) {
        throw new Error(t('manualDialog.endBeforeStart'))
      }
      const workItems = draftsToWorkItems(items)
      await onSubmit({
        title: title.trim(),
        start: startIso,
        end: endIso,
        coefficient: coef,
        workItems,
        notes: notes.trim() ? notes.trim() : null,
      })
      onOpenChange(false)
      setItems([emptyWorkItemDraft()])
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  const notesNonEmpty = Boolean(notes.trim())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg border-0">
        <DialogHeader>
          <DialogTitle>{t('manualDialog.title')}</DialogTitle>
        </DialogHeader>
        <DialogBody className="min-w-0 space-y-4 overflow-x-hidden">
          <div className="flex items-end gap-2.5">
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="manual-interval-title">{t('interval.title')}</Label>
              <Input
                id="manual-interval-title"
                value={title}
                placeholder={t('interval.titlePlaceholder')}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="w-[4.5rem] shrink-0 space-y-2">
              <Label
                htmlFor="manual-coef"
                className="block truncate"
                title={t('manualDialog.coefficient')}
              >
                {t('manualDialog.coefficientShort')}
              </Label>
              <Input
                id="manual-coef"
                type="number"
                min={0.01}
                max={5}
                step="any"
                inputMode="decimal"
                value={coefficient}
                aria-label={t('manualDialog.coefficient')}
                className="px-2 tabular-nums"
                onChange={(e) => setCoefficient(e.target.value)}
              />
            </div>
          </div>
          <DateTimeFields
            idPrefix="manual-start"
            label={t('manualDialog.start')}
            date={startDate}
            time={startTime}
            onDateChange={setStartDate}
            onTimeChange={setStartTime}
          />
          <DateTimeFields
            idPrefix="manual-end"
            label={t('manualDialog.end')}
            date={endDate}
            time={endTime}
            onDateChange={setEndDate}
            onTimeChange={setEndTime}
          />
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
              id="manual-notes"
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
          <Button onClick={() => void submit()} disabled={busy}>
            {busy ? t('common.saving') : t('manualDialog.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
