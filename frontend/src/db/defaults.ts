import type { UserSettings } from './types'
import { getDeviceTimezone } from '@/utils/timeDisplay'

export function createDefaultSettings(): UserSettings {
  return {
    id: 'app',
    hourlyRate: 0,
    taxRate: 0,
    currency: 'BYN',
    timezone: getDeviceTimezone(),
    updatedAt: new Date().toISOString(),
  }
}
