import { Pencil, Trash2 } from 'lucide-react'
import type { Task } from '@/db/types'
import { formatDateTime } from '@/utils/dateHelpers'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type CompletedTasksTableProps = {
  tasks: Task[]
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  showCompletedColumn?: boolean
}

export function CompletedTasksTable({
  tasks,
  onEdit,
  onDelete,
  showCompletedColumn = true,
}: CompletedTasksTableProps) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Название</TableHead>
            <TableHead className="text-right">Кол-во</TableHead>
            <TableHead className="text-right">Коэф.</TableHead>
            {showCompletedColumn && (
              <TableHead className="hidden sm:table-cell">Завершена</TableHead>
            )}
            <TableHead className="text-right w-[1%]">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell className="font-medium">{task.title}</TableCell>
              <TableCell className="text-right">{task.quantity}</TableCell>
              <TableCell className="text-right">{task.coefficient}</TableCell>
              {showCompletedColumn && (
                <TableCell className="hidden sm:table-cell whitespace-nowrap">
                  {formatDateTime(task.completedAt)}
                </TableCell>
              )}
              <TableCell className="text-right">
                <div className="inline-flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Редактировать"
                    onClick={() => onEdit(task)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Удалить"
                    onClick={() => onDelete(task)}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
