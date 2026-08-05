import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import {
  Dialog,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg border-[hsl(var(--primary)/0.15)]">
          <DialogHeader>
            <DialogTitle>{t('expenses.listTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {error && <p className="text-sm text-destructive">{error}</p>}
            {expenses.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t('expenses.empty')}
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-[hsl(var(--border)/0.65)]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[hsl(var(--primary)/0.05)] hover:bg-[hsl(var(--primary)/0.05)]">
                      <TableHead>{t('expenses.name')}</TableHead>
                      <TableHead className="text-right">{t('expenses.amount')}</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatDecimal(item.amount, 2)} {currency}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            disabled={busyId === item.id}
                            aria-label={t('common.delete')}
                            onClick={() => setDeleteId(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <p className="text-sm font-semibold tabular-nums text-right">
              {t('expenses.total')}: {formatDecimal(expensesSum, 2)} {currency}
            </p>
          </div>
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
