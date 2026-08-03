import type { Task } from '@/db/types'
import { TaskCard } from './TaskCard'

type TaskListProps = {
  tasks: Task[]
  emptyText: string
  onEdit: (task: Task) => void
  onComplete: (task: Task) => void
  onDelete: (task: Task) => void
}

export function TaskList({ tasks, emptyText, onEdit, onComplete, onDelete }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onEdit={onEdit}
          onComplete={onComplete}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
