import type { DaySchedule, Settings, Weekday } from './types'

const weekdayDefaults = (enabled: boolean): DaySchedule => ({
  enabled,
  start: '09:00',
  end: '18:00',
})

export const WEEKDAYS: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: 'Понедельник',
  tuesday: 'Вторник',
  wednesday: 'Среда',
  thursday: 'Четверг',
  friday: 'Пятница',
  saturday: 'Суббота',
  sunday: 'Воскресенье',
}

export function createDefaultSettings(): Settings {
  return {
    id: 'app',
    workSchedule: {
      monday: weekdayDefaults(true),
      tuesday: weekdayDefaults(true),
      wednesday: weekdayDefaults(true),
      thursday: weekdayDefaults(true),
      friday: weekdayDefaults(true),
      saturday: weekdayDefaults(false),
      sunday: weekdayDefaults(false),
    },
    exceptions: [],
    reminderLeadTime: 1,
    newTaskReminder: {
      enabled: false,
      interval: '1h',
      firstOffsetMinutes: 60,
    },
    lastNewTaskReminderSent: null,
  }
}
