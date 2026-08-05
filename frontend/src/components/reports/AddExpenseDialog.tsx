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
import { DictAutocomplete } from '@/components/dicts/DictAutocomplete'
import { expensesRemote } from '@/api/expensesRemote'
import { useI18n } from '@/hooks/useI18n'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  year: number
  month: number
  currency: string
  onCreated: () => Promise<void> | void
}

export function AddExpenseDialog({
  open,
  onOpenChange,
  year,
  month,
  currency,
  onCreated,
}: Props) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [resolvedId, setResolvedId] = useState<string | undefined>()
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName('')
    setResolvedId(undefined)
    setAmount('')
    setError(null)
  }, [open])

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const trimmed = name.trim()
      const value = Number(String(amount).replace(',', '.'))
      if (!trimmed || !resolvedId) {
        throw new Error(t('expenses.nameNotApproved'))
      }
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error(t('expenses.amountInvalid'))
      }
      await expensesRemote.create({
        year,
        month,
        name: trimmed,
        amount: value,
      })
      await onCreated()
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-[hsl(var(--primary)/0.15)]">
        <DialogHeader>
          <DialogTitle>{t('expenses.addTitle')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>{t('expenses.name')}</Label>
            <DictAutocomplete
              kind="expenses"
              value={name}
              resolvedId={resolvedId}
              placeholder={t('expenses.namePlaceholder')}
              onChange={(next) => {
                setName(next)
                setResolvedId(undefined)
              }}
              onResolved={(id, resolvedName) => {
                setResolvedId(id)
                setName(resolvedName)
              }}
            />
            <p className="text-xs text-muted-foreground">{t('expenses.nameHint')}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expense-amount">
              {t('expenses.amount')} ({currency})
            </Label>
            <Input
              id="expense-amount"
              inputMode="decimal"
              value={amount}
              placeholder="0"
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            disabled={busy || !resolvedId}
            onClick={() => void submit()}
          >
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
