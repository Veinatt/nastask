import type { UserSettings } from './types'
import { ACCOUNTING_TIMEZONE } from '@/lib/timezone'

export function createDefaultSettings(): UserSettings {
  return {
    id: 'app',
    hourlyRate: 0,
    taxRate: 0,
    currency: 'BYN',
    timezone: ACCOUNTING_TIMEZONE,
    updatedAt: new Date().toISOString(),
  }
}
