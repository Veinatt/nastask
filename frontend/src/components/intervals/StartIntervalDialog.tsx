import { useEffect, useState } from 'react'
import { Play } from 'lucide-react'
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
import { useI18n } from '@/hooks/useI18n'

type Props = {
  open: boolean
  busy?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (title: string) => void | Promise<void>
}

export function StartIntervalDialog({ open, busy = false, onOpenChange, onConfirm }: Props) {
  const { t } = useI18n()
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle('')
  }, [open])

  const submit = async () => {
    await onConfirm(title.trim())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm border-primary/15">
        <DialogHeader>
          <DialogTitle>{t('startDialog.title')}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-2">
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
        </DialogBody>
        <DialogFooter className="grid grid-cols-2 gap-2 sm:grid-cols-2">
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button disabled={busy} onClick={() => void submit()}>
            <Play className="h-4 w-4 mr-1.5 fill-current" />
            {busy ? t('home.starting') : t('home.start')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
