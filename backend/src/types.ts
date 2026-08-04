export interface UserSettings {
  userId: number
  hourlyRate: number
  taxRate: number
  currency: string
  timezone: string
  updatedAt: string
}

export interface TimeEntry {
  id: string
  userId: number
  title: string
  coefficient: number
  start: string
  end: string | null
  totalSeconds: number
  pauseTotalSeconds: number
  pauseStartedAt: string | null
  date: string
  createdAt: string
  updatedAt: string
}

export interface WorkItem {
  id: string
  timeEntryId: string
  categoryId: string
  descriptionId: string
  quantity: number
  unitId: string
}

export interface DictItem {
  id: string
  userId: number
  name: string
}

export interface WorkItemInput {
  id?: string
  categoryId: string
  descriptionId: string
  quantity: number
  unitId: string
}

export function createDefaultUserSettings(userId: number): UserSettings {
  return {
    userId,
    hourlyRate: 0,
    taxRate: 0,
    currency: 'BYN',
    timezone: 'Europe/Moscow',
    updatedAt: new Date().toISOString(),
  }
}
