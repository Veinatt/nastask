import { getDb } from './index'

/** Distinct Telegram user ids seen in settings or time entries. */
export function listKnownUserIds(): number[] {
  const rows = getDb()
    .prepare(
      `
      SELECT userId FROM user_settings
      UNION
      SELECT DISTINCT userId FROM time_entries
      `,
    )
    .all() as Array<{ userId: number }>
  return rows.map((r) => Number(r.userId)).filter((id) => Number.isFinite(id))
}
