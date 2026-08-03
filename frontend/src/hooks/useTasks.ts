import { useLiveQuery } from 'dexie-react-hooks'
import { tasksApi } from '@/api/tasksApi'
import type { CreateTaskInput, UpdateTaskInput } from '@/db/types'

export function useTasks(filter: 'active' | 'completed' | 'all' = 'active') {
  const tasks = useLiveQuery(async () => {
    if (filter === 'all') return tasksApi.getAll()
    return tasksApi.getByStatus(filter)
  }, [filter])

  const createTask = async (input: CreateTaskInput) => {
    return tasksApi.create(input)
  }

  const updateTask = async (id: string, patch: UpdateTaskInput) => {
    return tasksApi.update(id, patch)
  }

  const completeTask = async (id: string) => {
    return tasksApi.complete(id)
  }

  const deleteTask = async (id: string) => {
    await tasksApi.remove(id)
  }

  return {
    tasks: tasks ?? [],
    isLoading: tasks === undefined,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
  }
}

export function useCompletedTasksByMonth(year: number, month: number) {
  const tasks = useLiveQuery(
    () => tasksApi.getCompletedInMonth(year, month),
    [year, month],
  )

  return {
    tasks: tasks ?? [],
    isLoading: tasks === undefined,
  }
}
