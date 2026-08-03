import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Task } from '@/db/types'
import { useTasks } from '@/hooks/useTasks'
import { TaskForm } from '@/components/tasks/TaskForm'
import { TaskList } from '@/components/tasks/TaskList'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Filter = 'active' | 'completed'

export function TasksPage() {
  const [filter, setFilter] = useState<Filter>('active')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const { tasks, isLoading, createTask, updateTask, completeTask, deleteTask } = useTasks(filter)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Задачи</h1>
          <p className="text-sm text-muted-foreground">Фиксируйте заказы и отслеживайте время</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus /> Новая
        </Button>
      </div>

      <div className="flex gap-2">
        {(
          [
            ['active', 'Активные'],
            ['completed', 'Завершённые'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              filter === value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      ) : (
        <TaskList
          tasks={tasks}
          emptyText={
            filter === 'active'
              ? 'Нет активных задач. Создайте первую!'
              : 'Завершённых задач пока нет'
          }
          onEdit={(task) => {
            setEditing(task)
            setFormOpen(true)
          }}
          onComplete={(task) => void completeTask(task.id)}
          onDelete={(task) => void deleteTask(task.id)}
        />
      )}

      <TaskForm
        open={formOpen}
        onOpenChange={setFormOpen}
        task={editing}
        onSubmit={async (values) => {
          if (editing) {
            await updateTask(editing.id, values)
          } else {
            await createTask(values)
          }
        }}
      />
    </div>
  )
}
