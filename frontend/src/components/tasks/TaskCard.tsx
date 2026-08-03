import { Check, Pencil, Trash2 } from 'lucide-react'
import type { Task } from '@/db/types'
import { REMINDER_INTERVAL_LABELS, formatDateTime } from '@/utils/dateHelpers'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

type TaskCardProps = {
  task: Task
  onEdit: (task: Task) => void
  onComplete: (task: Task) => void
  onDelete: (task: Task) => void
}

export function TaskCard({ task, onEdit, onComplete, onDelete }: TaskCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{task.title}</CardTitle>
          <Badge variant={task.status === 'active' ? 'default' : 'secondary'}>
            {task.status === 'active' ? 'Активна' : 'Завершена'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-muted-foreground">
        <p>
          Объём: <span className="text-foreground font-medium">{task.quantity}</span>
          {' · '}
          Коэф.: <span className="text-foreground font-medium">{task.coefficient}</span>
        </p>
        <p>Напоминание: {REMINDER_INTERVAL_LABELS[task.reminderInterval]}</p>
        <p>Старт: {formatDateTime(task.startTime)}</p>
        {task.deadline && <p>Дедлайн: {formatDateTime(task.deadline)}</p>}
        {task.completedAt && <p>Завершена: {formatDateTime(task.completedAt)}</p>}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => onEdit(task)}>
          <Pencil /> Редактировать
        </Button>
        {task.status === 'active' && (
          <Button size="sm" onClick={() => onComplete(task)}>
            <Check /> Завершить
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="destructive">
              <Trash2 /> Удалить
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить задачу?</AlertDialogTitle>
              <AlertDialogDescription>
                «{task.title}» будет удалена безвозвратно.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(task)}>Удалить</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  )
}
