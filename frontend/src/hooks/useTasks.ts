import { useLiveQuery } from 'dexie-react-hooks'
import { tasksApi } from '@/api/tasksApi'
import type { CreateTaskInput, Task, UpdateTaskInput } from '@/db/types'

export function useTasks(filter: 'active' | 'completed' | 'all' = 'active') {
  const tasks = useLiveQuery(async () => {
    if (filter === 'all') return tasksApi.getAll()
    return tasksApi.getByStatus(filter)
  }, [filter])

  return {
    tasks: tasks ?? [],
    isLoading: tasks === undefined,
    createTask: (input: CreateTaskInput) => tasksApi.create(input),
    updateTask: (id: string, patch: UpdateTaskInput) => tasksApi.update(id, patch),
    completeTask: (id: string) => tasksApi.complete(id),
    deleteTask: (id: string) => tasksApi.remove(id),
  }
}

export function useCompletedTasksByMonth(year: number, month: number) {
  const tasks = useLiveQuery(
    () => tasksApi.getCompletedInMonth(year, month),
    [year, month],
  )

  return {
    tasks: (tasks ?? []) as Task[],
    isLoading: tasks === undefined,
  }
}
