export type ReminderInterval = '3m' | '15m' | '30m' | '1h' | '2h' | '3h' | '4h' | 'daily'

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

export type WorkScheduleMap = Record<Weekday, DaySchedule>

export interface NewTaskReminderSettings {
  enabled: boolean
  interval: ReminderInterval
  firstOffsetMinutes?: number
}

/** Parsed user settings (from user_settings table). */
export interface UserSettings {
  userId: number
  workSchedule: WorkScheduleMap
  exceptions: ScheduleException[]
  newTaskReminder: NewTaskReminderSettings
  reminderLeadTime: number
  /** Hours before deadline to send warning */
  deadlineLeadTime: number
  /** Unix sec when to send next «check new tasks» reminder; null if disabled */
  nextNewTaskNotify: number | null
  /** IANA timezone for work-hour math */
  timezone: string
  newTaskFailCount: number
  newTaskNextRetryAt: number | null
  updatedAt: number
}

export interface UserSettingsRow {
  userId: number
  workSchedule: string
  exceptions: string
  newTaskReminder: string
  reminderLeadTime: number
  deadlineLeadTime: number
  nextNewTaskNotify: number | null
  timezone: string
  newTaskFailCount: number
  newTaskNextRetryAt: number | null
  updatedAt: number
}

export interface ReminderRow {
  id: number
  taskId: string
  userId: number
  title: string
  nextNotify: number
  interval: ReminderInterval
  startTime: number | null
  deadline: number | null
  /** 1 if deadline-approaching notification already sent */
  deadlineWarned: number
  failCount: number
  nextRetryAt: number | null
  createdAt: number
}

export interface UpsertReminderInput {
  taskId: string
  userId: number
  title: string
  interval: ReminderInterval
  startTime: number | null
  deadline: number | null
  nextNotify: number
}

export const REMINDER_INTERVALS: ReminderInterval[] = [
  '3m',
  '15m',
  '30m',
  '1h',
  '2h',
  '3h',
  '4h',
  'daily',
]

const weekdayDefaults = (enabled: boolean): DaySchedule => ({
  enabled,
  start: '09:00',
  end: '18:00',
})

export function createDefaultWorkSchedule(): WorkScheduleMap {
  return {
    monday: weekdayDefaults(true),
    tuesday: weekdayDefaults(true),
    wednesday: weekdayDefaults(true),
    thursday: weekdayDefaults(true),
    friday: weekdayDefaults(true),
    saturday: weekdayDefaults(false),
    sunday: weekdayDefaults(false),
  }
}

export function createDefaultUserSettings(userId: number, updatedAt = 0): UserSettings {
  return {
    userId,
    workSchedule: createDefaultWorkSchedule(),
    exceptions: [],
    newTaskReminder: {
      enabled: false,
      interval: '1h',
      firstOffsetMinutes: 60,
    },
    reminderLeadTime: 1,
    deadlineLeadTime: 1,
    nextNewTaskNotify: null,
    timezone: 'Europe/Moscow',
    newTaskFailCount: 0,
    newTaskNextRetryAt: null,
    updatedAt,
  }
}
