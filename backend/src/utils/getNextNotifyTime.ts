import { addDays, addSeconds, fromUnixTime, getUnixTime } from 'date-fns'
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz'
import type {
  DaySchedule,
  ReminderInterval,
  ScheduleException,
  UserSettings,
  Weekday,
  WorkScheduleMap,
} from '../types'
import { createDefaultWorkSchedule } from '../types'
import { intervalToSeconds, parseHm } from './time'

const DAY_BY_INDEX: Weekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

function resolveTz(timeZone?: string): string {
  return timeZone && timeZone.trim() ? timeZone.trim() : 'Europe/Moscow'
}

function getScheduleForDateKey(
  dateKey: string,
  weekday: Weekday,
  workSchedule: WorkScheduleMap,
  exceptions: ScheduleException[],
): DaySchedule | null {
  const exception = exceptions.find((item) => item.date === dateKey)

  if (exception) {
    if (exception.isOff) return null
    return {
      enabled: true,
      start: exception.start ?? '09:00',
      end: exception.end ?? '18:00',
    }
  }

  const day = workSchedule[weekday]
  if (!day?.enabled) return null
  return day
}

function zonedDayParts(unixSec: number, timeZone: string) {
  const date = fromUnixTime(unixSec)
  const dateKey = formatInTimeZone(date, timeZone, 'yyyy-MM-dd')
  const zoned = toZonedTime(date, timeZone)
  const weekday = DAY_BY_INDEX[zoned.getDay()] ?? 'monday'
  return { dateKey, weekday }
}

function wallClockToUnix(dateKey: string, hm: string, timeZone: string): number {
  const { hours, minutes } = parseHm(hm)
  const hh = String(hours).padStart(2, '0')
  const mm = String(minutes).padStart(2, '0')
  return getUnixTime(fromZonedTime(`${dateKey}T${hh}:${mm}:00`, timeZone))
}

export function isWorkingTime(
  unixSec: number,
  workSchedule: WorkScheduleMap,
  exceptions: ScheduleException[],
  timeZone = 'Europe/Moscow',
): boolean {
  const tz = resolveTz(timeZone)
  const { dateKey, weekday } = zonedDayParts(unixSec, tz)
  const schedule = getScheduleForDateKey(dateKey, weekday, workSchedule, exceptions)
  if (!schedule) return false

  const start = wallClockToUnix(dateKey, schedule.start, tz)
  const end = wallClockToUnix(dateKey, schedule.end, tz)
  return unixSec >= start && unixSec < end
}

export function nextWorkingStart(
  fromSec: number,
  workSchedule: WorkScheduleMap,
  exceptions: ScheduleException[],
  timeZone = 'Europe/Moscow',
): number {
  const tz = resolveTz(timeZone)
  const fromZoned = toZonedTime(fromUnixTime(fromSec), tz)

  for (let i = 0; i < 14; i += 1) {
    const dayZoned = addDays(
      new Date(
        fromZoned.getFullYear(),
        fromZoned.getMonth(),
        fromZoned.getDate(),
        12,
        0,
        0,
      ),
      i,
    )
    const probeSec = getUnixTime(fromZonedTime(dayZoned, tz))
    const { dateKey, weekday } = zonedDayParts(probeSec, tz)
    const schedule = getScheduleForDateKey(dateKey, weekday, workSchedule, exceptions)
    if (!schedule) continue

    const start = wallClockToUnix(dateKey, schedule.start, tz)
    const end = wallClockToUnix(dateKey, schedule.end, tz)

    if (i === 0) {
      if (fromSec < start) return start
      if (fromSec < end) return fromSec
      continue
    }

    return start
  }

  const fallback = addDays(fromZoned, 1)
  const fallbackKey = formatInTimeZone(
    fromZonedTime(
      new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate(), 12),
      tz,
    ),
    tz,
    'yyyy-MM-dd',
  )
  return wallClockToUnix(fallbackKey, '09:00', tz)
}

export function getNextNotifyTime(
  currentTime: number,
  interval: ReminderInterval | string,
  workSchedule: WorkScheduleMap = createDefaultWorkSchedule(),
  exceptions: ScheduleException[] = [],
  timeZone = 'Europe/Moscow',
): number {
  const tz = resolveTz(timeZone)
  const candidate = getUnixTime(
    addSeconds(fromUnixTime(currentTime), intervalToSeconds(interval as ReminderInterval)),
  )

  if (isWorkingTime(candidate, workSchedule, exceptions, tz)) {
    return candidate
  }

  return nextWorkingStart(candidate, workSchedule, exceptions, tz)
}

export function computeInitialNextNotify(params: {
  nowSec: number
  startTime: number | null
  interval: ReminderInterval
  settings: UserSettings
}): number {
  const { nowSec, startTime, interval, settings } = params
  const { workSchedule, exceptions, reminderLeadTime, timezone } = settings
  const tz = resolveTz(timezone)

  if (startTime != null) {
    const leadCandidate = startTime - Math.max(0, reminderLeadTime) * 3600
    if (leadCandidate > nowSec) {
      return nextWorkingStart(leadCandidate, workSchedule, exceptions, tz)
    }
    return getNextNotifyTime(nowSec, interval, workSchedule, exceptions, tz)
  }

  return getNextNotifyTime(nowSec, interval, workSchedule, exceptions, tz)
}

export function recomputeNextNotifyAfterScheduleChange(params: {
  nowSec: number
  startTime: number | null
  settings: UserSettings
}): number {
  const { nowSec, startTime, settings } = params
  const { workSchedule, exceptions, reminderLeadTime, timezone } = settings
  const tz = resolveTz(timezone)

  if (startTime != null) {
    const leadCandidate = startTime - Math.max(0, reminderLeadTime) * 3600
    if (leadCandidate > nowSec) {
      return nextWorkingStart(leadCandidate, workSchedule, exceptions, tz)
    }
  }

  if (isWorkingTime(nowSec, workSchedule, exceptions, tz)) {
    return nowSec
  }

  return nextWorkingStart(nowSec, workSchedule, exceptions, tz)
}

function alignToDayFirstOffset(candidateSec: number, settings: UserSettings): number {
  const { workSchedule, exceptions, newTaskReminder, timezone } = settings
  const tz = resolveTz(timezone)
  const offsetMin = Math.max(0, newTaskReminder.firstOffsetMinutes ?? 60)
  const { dateKey, weekday } = zonedDayParts(candidateSec, tz)
  const schedule = getScheduleForDateKey(dateKey, weekday, workSchedule, exceptions)
  if (!schedule) {
    return nextWorkingStart(candidateSec, workSchedule, exceptions, tz)
  }

  const start = wallClockToUnix(dateKey, schedule.start, tz)
  const end = wallClockToUnix(dateKey, schedule.end, tz)
  const first = start + offsetMin * 60

  if (first >= end) {
    return nextWorkingStart(end, workSchedule, exceptions, tz)
  }
  if (candidateSec < first) return first
  if (candidateSec >= end) {
    return computeNextNewTaskNotify(end, settings) ?? candidateSec
  }
  return candidateSec
}

export function computeNextNewTaskNotify(
  nowSec: number,
  settings: UserSettings,
): number | null {
  if (!settings.newTaskReminder.enabled) return null

  const { workSchedule, exceptions, newTaskReminder, timezone } = settings
  const tz = resolveTz(timezone)
  const offsetMin = Math.max(0, newTaskReminder.firstOffsetMinutes ?? 60)
  const fromZoned = toZonedTime(fromUnixTime(nowSec), tz)

  for (let i = 0; i < 14; i += 1) {
    const dayZoned = addDays(
      new Date(
        fromZoned.getFullYear(),
        fromZoned.getMonth(),
        fromZoned.getDate(),
        12,
        0,
        0,
      ),
      i,
    )
    const probeSec = getUnixTime(fromZonedTime(dayZoned, tz))
    const { dateKey, weekday } = zonedDayParts(probeSec, tz)
    const schedule = getScheduleForDateKey(dateKey, weekday, workSchedule, exceptions)
    if (!schedule) continue

    const start = wallClockToUnix(dateKey, schedule.start, tz)
    const end = wallClockToUnix(dateKey, schedule.end, tz)
    const first = start + offsetMin * 60
    if (first >= end) continue

    if (i === 0) {
      if (nowSec <= first) return first
      if (nowSec < end) return nowSec
      continue
    }

    return first
  }

  return null
}

export function advanceNewTaskNotify(nowSec: number, settings: UserSettings): number | null {
  if (!settings.newTaskReminder.enabled) return null

  const raw = getNextNotifyTime(
    nowSec,
    settings.newTaskReminder.interval,
    settings.workSchedule,
    settings.exceptions,
    settings.timezone,
  )
  return alignToDayFirstOffset(raw, settings)
}
