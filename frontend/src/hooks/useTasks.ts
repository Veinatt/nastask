import { useLiveQuery } from 'dexie-react-hooks'
import { syncReminder } from '@/api/remindersApi'
import { tasksApi } from '@/api/tasksApi'
import type { CreateTaskInput, Task, UpdateTaskInput } from '@/db/types'
import { useTelegram } from '@/hooks/useTelegram'

const REMINDER_FIELDS = ['startTime', 'reminderInterval', 'deadline', 'title'] as const

function affectsReminder(patch: UpdateTaskInput): boolean {
  return REMINDER_FIELDS.some((field) => patch[field] !== undefined)
}

export function useTasks(filter: 'active' | 'completed' | 'all' = 'active') {
  const { userId } = useTelegram()

  const tasks = useLiveQuery(async () => {
    if (filter === 'all') return tasksApi.getAll()
    return tasksApi.getByStatus(filter)
  }, [filter])

  const createTask = async (input: CreateTaskInput) => {
    const task = await tasksApi.create(input)
    syncReminder('create', { task, userId })
    return task
  }

  const updateTask = async (id: string, patch: UpdateTaskInput) => {
    const updated = await tasksApi.update(id, patch)
    if (!updated) return undefined

    if (updated.status === 'completed' || patch.status === 'completed') {
      syncReminder('delete', { taskId: id, userId })
      return updated
    }

    if (updated.status === 'active' && affectsReminder(patch)) {
      syncReminder('update', { task: updated, userId })
    }

    return updated
  }

  const completeTask = async (id: string) => {
    const updated = await tasksApi.complete(id)
    syncReminder('delete', { taskId: id, userId })
    return updated
  }

  const deleteTask = async (id: string) => {
    await tasksApi.remove(id)
    syncReminder('delete', { taskId: id, userId })
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
    tasks: (tasks ?? []) as Task[],
    isLoading: tasks === undefined,
  }
}
