import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { ReminderInterval, Task } from '@/db/types'
import { REMINDER_INTERVAL_LABELS, REMINDER_INTERVALS, fromLocalInputValue, toLocalInputValue } from '@/utils/dateHelpers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const schema = z.object({
  title: z.string().trim().min(1, 'Укажите название'),
  quantity: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Только целое число')
    .refine((v) => Number(v) >= 1, 'Должно быть целое число ≥ 1'),
  coefficient: z
    .string()
    .trim()
    .regex(/^\d+([.,]\d+)?$/, 'Только число')
    .refine((v) => Number(v.replace(',', '.')) > 0, 'Должно быть больше 0'),
  reminderInterval: z.enum(['15m', '30m', '1h', '2h', '3h', '4h', 'daily']),
  startTimeLocal: z.string().optional(),
  deadlineLocal: z.string().optional(),
  completedAtLocal: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function filterIntegerInput(value: string): string {
  return value.replace(/\D/g, '')
}

function filterDecimalInput(value: string): string {
  const normalized = value.replace(',', '.')
  const cleaned = normalized.replace(/[^\d.]/g, '')
  const dot = cleaned.indexOf('.')
  if (dot === -1) return cleaned
  return cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '')
}

type TaskFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task | null
  onSubmit: (values: {
    title: string
    quantity: number
    coefficient: number
    reminderInterval: ReminderInterval
    startTime: string | null
    deadline: string | null
    completedAt?: string | null
  }) => Promise<void> | void
}

export function TaskForm({ open, onOpenChange, task, onSubmit }: TaskFormProps) {
  const isEdit = Boolean(task)
  const isCompleted = task?.status === 'completed'

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      quantity: '1',
      coefficient: '1',
      reminderInterval: '1h',
      startTimeLocal: toLocalInputValue(new Date().toISOString()),
      deadlineLocal: '',
      completedAtLocal: '',
    },
  })

  useEffect(() => {
    if (!open) return
    if (task) {
      form.reset({
        title: task.title,
        quantity: String(Math.max(1, Math.round(task.quantity))),
        coefficient: String(task.coefficient),
        reminderInterval: task.reminderInterval,
        startTimeLocal: toLocalInputValue(task.startTime),
        deadlineLocal: toLocalInputValue(task.deadline),
        completedAtLocal: toLocalInputValue(task.completedAt),
      })
    } else {
      form.reset({
        title: '',
        quantity: '1',
        coefficient: '1',
        reminderInterval: '1h',
        startTimeLocal: toLocalInputValue(new Date().toISOString()),
        deadlineLocal: '',
        completedAtLocal: '',
      })
    }
  }, [open, task, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit({
      title: values.title,
      quantity: Number(values.quantity),
      coefficient: Number(values.coefficient.replace(',', '.')),
      reminderInterval: values.reminderInterval,
      startTime: fromLocalInputValue(values.startTimeLocal ?? ''),
      deadline: fromLocalInputValue(values.deadlineLocal ?? ''),
      ...(isCompleted
        ? { completedAt: fromLocalInputValue(values.completedAtLocal ?? '') }
        : {}),
    })
    onOpenChange(false)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать задачу' : 'Новая задача'}</DialogTitle>
          <DialogDescription>
            Укажите объём и коэффициент сложности для расчёта заработка.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Название</Label>
            <Input id="title" {...form.register('title')} placeholder="Баннеры для клиента" />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quantity">Количество</Label>
              <Input
                id="quantity"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="1"
                value={form.watch('quantity')}
                onChange={(e) =>
                  form.setValue('quantity', filterIntegerInput(e.target.value), {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              />
              {form.formState.errors.quantity && (
                <p className="text-sm text-destructive">{form.formState.errors.quantity.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="coefficient">Коэффициент</Label>
              <Input
                id="coefficient"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="1"
                value={form.watch('coefficient')}
                onChange={(e) =>
                  form.setValue('coefficient', filterDecimalInput(e.target.value), {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              />
              {form.formState.errors.coefficient && (
                <p className="text-sm text-destructive">{form.formState.errors.coefficient.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Интервал напоминания</Label>
            <Controller
              control={form.control}
              name="reminderInterval"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REMINDER_INTERVALS.map((interval) => (
                      <SelectItem key={interval} value={interval}>
                        {REMINDER_INTERVAL_LABELS[interval]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startTime">Время старта</Label>
            <div className="flex items-center gap-2">
              <Input
                id="startTime"
                type="datetime-local"
                className="flex-1"
                {...form.register('startTimeLocal')}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => form.setValue('startTimeLocal', '')}
              >
                Очистить
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Дедлайн (опционально)</Label>
            <Input id="deadline" type="datetime-local" {...form.register('deadlineLocal')} />
          </div>

          {isCompleted && (
            <div className="space-y-2">
              <Label htmlFor="completedAt">Дата завершения</Label>
              <Input
                id="completedAt"
                type="datetime-local"
                {...form.register('completedAtLocal')}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit">{isEdit ? 'Сохранить' : 'Создать'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
