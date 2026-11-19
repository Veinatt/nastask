import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { expensesRemote } from '@/api/expensesRemote'
import { useI18n } from '@/hooks/useI18n'
import type { SalaryExpense } from '@/db/types'
import { formatDecimal } from '@/utils/formatNumber'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currency: string
  expenses: SalaryExpense[]
  expensesSum: number
  onChanged: () => Promise<void> | void
}

export function ExpensesListDialog({
  open,
  onOpenChange,
  currency,
  expenses,
  expensesSum,
  onChanged,
}: Props) {
  const { t } = useI18n()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const remove = async (id: string) => {
    setBusyId(id)
    setError(null)
    try {
      await expensesRemote.remove(id)
      await onChanged()
      setDeleteId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg border-[hsl(var(--primary)/0.15)]">
          <DialogHeader>
            <DialogTitle>{t('expenses.listTitle')}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-0 p-0">
            {error && (
              <p className="px-4 pt-3 text-sm text-destructive">{error}</p>
            )}
            {expenses.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                {t('expenses.empty')}
              </p>
            ) : (
              <ul>
                {expenses.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {item.name}
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {formatDecimal(item.amount, 2)} {currency}
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/15 hover:text-destructive"
                      disabled={busyId === item.id}
                      aria-label={t('common.delete')}
                      onClick={() => setDeleteId(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <p className="border-t border-border px-4 py-3 text-base font-semibold tabular-nums text-left">
              {t('expenses.total')}: {formatDecimal(expensesSum, 2)} {currency}
            </p>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteId != null}
        onOpenChange={(next) => {
          if (!next) setDeleteId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('expenses.deleteTitle')}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={busyId != null}
              onClick={() => {
                if (!deleteId) return
                void remove(deleteId)
              }}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
