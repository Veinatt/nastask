export type ReminderInterval = '15m' | '30m' | '1h' | '2h' | '3h' | '4h' | 'daily'

export type TaskStatus = 'active' | 'completed' | 'cancelled'

export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export interface DaySchedule {
  enabled: boolean
  start: string
  end: string
}

export interface ScheduleException {
  date: string
  start?: string
  end?: string
  isOff: boolean
}

export interface Task {
  id: string
  title: string
  quantity: number
  coefficient: number
  reminderInterval: ReminderInterval
  startTime: string | null
  deadline: string | null
  status: TaskStatus
  createdAt: string
  completedAt: string | null
  updatedAt: string
  lastReminderSent: string | null
  startNotified: boolean
}

export interface Settings {
  id: 'app'
  workSchedule: Record<Weekday, DaySchedule>
  exceptions: ScheduleException[]
  reminderLeadTime: number
  newTaskReminder: {
    enabled: boolean
    interval: ReminderInterval
    firstOffsetMinutes?: number
  }
  /** ISO timestamp of last "check new tasks" notification */
  lastNewTaskReminderSent: string | null
}

export type CreateTaskInput = {
  title: string
  quantity: number
  coefficient: number
  reminderInterval: ReminderInterval
  startTime: string | null
  deadline: string | null
}

export type UpdateTaskInput = Partial<
  Omit<Task, 'id' | 'createdAt'>
>
