import { getDb } from './index'
import { nowIso } from '../utils/iso'
import { getMemoryQuestion } from '../memory/memoryQuestions'

export type MemoryAnswerRow = {
  id: string
  userId: number
  questionId: string
  question: string
  answer: string | null
  answeredAt: string | null
  updatedAt: string
}

function mapRow(row: Record<string, unknown>): MemoryAnswerRow {
  return {
    id: String(row.id),
    userId: Number(row.userId),
    questionId: String(row.questionId),
    question: String(row.question ?? ''),
    answer: row.answer == null ? null : String(row.answer),
    answeredAt: row.answeredAt == null ? null : String(row.answeredAt),
    updatedAt: String(row.updatedAt),
  }
}

function rowId(userId: number, questionId: string): string {
  return `${userId}:${questionId}`
}

export const memoryRepo = {
  listByUser(userId: number): MemoryAnswerRow[] {
    const rows = getDb()
      .prepare(
        `SELECT * FROM memory_quiz WHERE userId = ? ORDER BY questionId ASC`,
      )
      .all(userId) as Record<string, unknown>[]
    return rows.map(mapRow)
  },

  listAll(filterUserId?: number): MemoryAnswerRow[] {
    if (filterUserId != null) return this.listByUser(filterUserId)
    const rows = getDb()
      .prepare(`SELECT * FROM memory_quiz ORDER BY userId ASC, questionId ASC`)
      .all() as Record<string, unknown>[]
    return rows.map(mapRow)
  },

  upsertAnswers(
    userId: number,
    items: Array<{ questionId: string; answer: string }>,
  ): MemoryAnswerRow[] {
    const db = getDb()
    const select = db.prepare(
      `SELECT * FROM memory_quiz WHERE userId = ? AND questionId = ?`,
    )
    const insert = db.prepare(`
      INSERT INTO memory_quiz (id, userId, questionId, question, answer, answeredAt, updatedAt)
      VALUES (@id, @userId, @questionId, @question, @answer, @answeredAt, @updatedAt)
      ON CONFLICT(userId, questionId) DO UPDATE SET
        question = excluded.question,
        answer = excluded.answer,
        answeredAt = excluded.answeredAt,
        updatedAt = excluded.updatedAt
    `)

    const results: MemoryAnswerRow[] = []
    const run = db.transaction(() => {
      for (const item of items) {
        const q = getMemoryQuestion(item.questionId)
        if (!q) continue
        const trimmed = String(item.answer ?? '').trim()
        const existing = select.get(userId, item.questionId) as
          | Record<string, unknown>
          | undefined
        const updatedAt = nowIso()
        const answeredAt =
          trimmed.length > 0
            ? existing?.answeredAt
              ? String(existing.answeredAt)
              : updatedAt
            : null
        insert.run({
          id: rowId(userId, item.questionId),
          userId,
          questionId: item.questionId,
          question: q.text,
          answer: trimmed.length > 0 ? trimmed : null,
          answeredAt,
          updatedAt,
        })
        const row = select.get(userId, item.questionId) as Record<string, unknown>
        results.push(mapRow(row))
      }
    })
    run()
    return results
  },
}
