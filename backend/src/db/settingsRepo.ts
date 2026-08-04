import { getDb } from './index'
import { createDefaultUserSettings, type UserSettings } from '../types'
import { nowIso } from '../utils/iso'

function mapRow(row: Record<string, unknown>): UserSettings {
  return {
    userId: Number(row.userId),
    hourlyRate: Number(row.hourlyRate ?? 0),
    taxRate: Number(row.taxRate ?? 0),
    currency: String(row.currency ?? 'BYN'),
    timezone: String(row.timezone ?? 'Europe/Moscow'),
    updatedAt: String(row.updatedAt),
  }
}

export const settingsRepo = {
  get(userId: number): UserSettings | undefined {
    const row = getDb()
      .prepare('SELECT * FROM user_settings WHERE userId = ?')
      .get(userId) as Record<string, unknown> | undefined
    return row ? mapRow(row) : undefined
  },

  getOrCreate(userId: number): UserSettings {
    const existing = this.get(userId)
    if (existing) return existing
    const defaults = createDefaultUserSettings(userId)
    this.upsert(defaults)
    return defaults
  },

  upsert(settings: UserSettings): UserSettings {
    const updatedAt = settings.updatedAt || nowIso()
    getDb()
      .prepare(
        `
        INSERT INTO user_settings (userId, hourlyRate, taxRate, currency, timezone, updatedAt)
        VALUES (@userId, @hourlyRate, @taxRate, @currency, @timezone, @updatedAt)
        ON CONFLICT(userId) DO UPDATE SET
          hourlyRate = excluded.hourlyRate,
          taxRate = excluded.taxRate,
          currency = excluded.currency,
          timezone = excluded.timezone,
          updatedAt = excluded.updatedAt
        `,
      )
      .run({ ...settings, updatedAt })
    const saved = this.get(settings.userId)
    if (!saved) throw new Error('Failed to upsert settings')
    return saved
  },
}
