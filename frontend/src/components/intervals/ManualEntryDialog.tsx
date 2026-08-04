import { useState } from 'react'
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
import { useI18n } from '@/hooks/useI18n'
import type { WorkItemInput } from '@/db/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: {
    start: string
    end: string
    coefficient: number
    workItems: WorkItemInput[]
  }) => Promise<void>
}

export function ManualEntryDialog({ open, onOpenChange, onSubmit }: Props) {
  const { t } = useI18n()
  const initial = splitLocalDateTime(new Date().toISOString())
  const [startDate, setStartDate] = useState(initial.date)
  const [startTime, setStartTime] = useState(initial.time)
  const [endDate, setEndDate] = useState(initial.date)
  const [endTime, setEndTime] = useState(initial.time)
  const [coefficient, setCoefficient] = useState('1')
  const [items, setItems] = useState<WorkItemDraft[]>([emptyWorkItemDraft()])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      })
      onOpenChange(false)
      setItems([emptyWorkItemDraft()])
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg border-primary/15">
        <DialogHeader>
          <DialogTitle>{t('manualDialog.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
