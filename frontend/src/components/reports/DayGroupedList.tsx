import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { Task } from '@/db/types'
import { CompletedTasksTable } from './CompletedTasksTable'

type DayGroupedListProps = {
  tasks: Task[]
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
}

function dayKey(iso: string | null): string {
  if (!iso) return 'unknown'
  return format(parseISO(iso), 'yyyy-MM-dd')
}

function dayLabel(key: string): string {
  if (key === 'unknown') return 'Без даты'
  return format(parseISO(`${key}T12:00:00`), 'EEEE, d MMMM', { locale: ru })
}

export function DayGroupedList({ tasks, onEdit, onDelete }: DayGroupedListProps) {
  const groups = new Map<string, Task[]>()

  for (const task of tasks) {
    const key = dayKey(task.completedAt)
    const list = groups.get(key) ?? []
    list.push(task)
    groups.set(key, list)
  }

  const sortedKeys = [...groups.keys()].sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-5">
      {sortedKeys.map((key) => {
        const dayTasks = groups.get(key) ?? []
        return (
          <section key={key} className="space-y-2">
            <div className="flex items-baseline justify-between gap-2 px-1">
              <h2 className="text-sm font-semibold capitalize">{dayLabel(key)}</h2>
              <span className="text-xs text-muted-foreground">
                {dayTasks.length}{' '}
                {dayTasks.length === 1 ? 'задача' : dayTasks.length < 5 ? 'задачи' : 'задач'}
              </span>
            </div>
            <CompletedTasksTable
              tasks={dayTasks}
              onEdit={onEdit}
              onDelete={onDelete}
              showCompletedColumn={false}
            />
          </section>
        )
      })}
    </div>
  )
}
