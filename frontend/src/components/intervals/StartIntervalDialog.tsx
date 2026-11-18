import { useEffect, useState } from 'react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useI18n } from '@/hooks/useI18n'
import { useWorkTemplates } from '@/hooks/useWorkTemplates'
import { generateId } from '@/utils/idGenerator'
import type { WorkItemInput, WorkTemplate } from '@/db/types'

const NO_TEMPLATE = '__none__'

export type StartIntervalPayload = {
  title: string
  workItems?: WorkItemInput[]
  templateName?: string
}

type Props = {
  open: boolean
  busy?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (payload: StartIntervalPayload) => void | Promise<void>
}

export function StartIntervalDialog({ open, busy = false, onOpenChange, onConfirm }: Props) {
  const { t } = useI18n()
  const { items: templates } = useWorkTemplates()
  const [title, setTitle] = useState('')
  const [templateId, setTemplateId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle('')
    setTemplateId(null)
  }, [open])

  const selected: WorkTemplate | undefined = templates.find((x) => x.id === templateId)

  const submit = async () => {
    const workItems = selected
      ? [
          {
            id: generateId(),
            categoryId: selected.categoryId,
            descriptionId: selected.descriptionId,
            unitId: selected.unitId,
            quantity: selected.defaultQuantity || 1,
          },
        ]
      : undefined
    await onConfirm({
      title: title.trim(),
      workItems,
      templateName: selected?.name,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm border-0">
        <DialogHeader>
          <DialogTitle>{t('startDialog.title')}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="start-interval-title">{t('interval.title')}</Label>
            <Input
              id="start-interval-title"
              value={title}
              placeholder={t('interval.titlePlaceholder')}
              autoFocus
              disabled={busy}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void submit()
                }
              }}
            />
          </div>
          {templates.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="start-interval-template">{t('templates.pick')}</Label>
              <Select
                value={templateId ?? NO_TEMPLATE}
                onValueChange={(value) =>
                  setTemplateId(value === NO_TEMPLATE ? null : value)
                }
                disabled={busy}
              >
                <SelectTrigger id="start-interval-template" className="w-full min-w-0">
                  <SelectValue placeholder={t('startDialog.noTemplate')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TEMPLATE}>{t('startDialog.noTemplate')}</SelectItem>
                  {templates.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button disabled={busy} onClick={() => void submit()}>
            {busy ? t('startDialog.submitting') : t('startDialog.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
