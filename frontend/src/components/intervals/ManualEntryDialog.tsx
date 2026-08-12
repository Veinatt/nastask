import { useEffect, useState } from 'react'
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
import { generateId } from '@/utils/idGenerator'
import type { WorkItemInput } from '@/db/types'

export type ManualEntryInitial = {
  coefficient?: number
  workItems?: WorkItemInput[]
  notes?: string | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: {
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
  const [coefficient, setCoefficient] = useState('1')
  const [items, setItems] = useState<WorkItemDraft[]>([emptyWorkItemDraft()])
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const now = splitLocalDateTime(new Date().toISOString())
    setStartDate(now.date)
    setStartTime(now.time)
    setEndDate(now.date)
    setEndTime(now.time)
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
      <DialogContent className="max-h-[90vh] overflow-x-hidden overflow-y-auto sm:max-w-lg border-primary/15">
        <DialogHeader>
          <DialogTitle>{t('manualDialog.title')}</DialogTitle>
        </DialogHeader>
        <div className="min-w-0 space-y-4">
          <div className="space-y-4 rounded-xl border border-primary/10 bg-primary/5 p-3">
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
          </div>
          <div className="space-y-2">
            <Label>{t('manualDialog.coefficient')}</Label>
            <Input
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
                id="manual-notes"
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
          <Button onClick={() => void submit()} disabled={busy}>
            {busy ? t('common.saving') : t('manualDialog.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
