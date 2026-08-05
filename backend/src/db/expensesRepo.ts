import { randomUUID } from 'node:crypto'
import { getDb } from './index'

export type SalaryExpense = {
  id: string
  userId: number
  year: number
  month: number
  name: string
  amount: number
  createdAt: string
}

function mapExpense(row: Record<string, unknown>): SalaryExpense {
  return {
    id: String(row.id),
    userId: Number(row.userId),
    year: Number(row.year),
    month: Number(row.month),
    name: String(row.name),
    amount: Number(row.amount),
    createdAt: String(row.createdAt),
  }
}

export const salaryExpensesRepo = {
  listMonth(userId: number, year: number, month: number): SalaryExpense[] {
    return (
      getDb()
        .prepare(
          `SELECT * FROM salary_expenses
           WHERE userId = ? AND year = ? AND month = ?
           ORDER BY createdAt ASC`,
        )
        .all(userId, year, month) as Record<string, unknown>[]
    ).map(mapExpense)
  },

  sumMonth(userId: number, year: number, month: number): number {
    const row = getDb()
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) AS total
         FROM salary_expenses
         WHERE userId = ? AND year = ? AND month = ?`,
      )
      .get(userId, year, month) as { total: number }
    return Math.round(Number(row.total) * 100) / 100
  },

  create(
    userId: number,
    input: { year: number; month: number; name: string; amount: number },
  ): SalaryExpense {
    const name = input.name.trim()
    if (!name) throw new Error('name is required')
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new Error('amount must be > 0')
    }
    if (
      !Number.isFinite(input.year) ||
      !Number.isFinite(input.month) ||
      input.month < 1 ||
      input.month > 12
    ) {
      throw new Error('year and month required')
    }
    const id = randomUUID()
    const createdAt = new Date().toISOString()
    const amount = Math.round(input.amount * 100) / 100
    getDb()
      .prepare(
        `INSERT INTO salary_expenses (id, userId, year, month, name, amount, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, userId, input.year, input.month, name, amount, createdAt)
    return {
      id,
      userId,
      year: input.year,
      month: input.month,
      name,
      amount,
      createdAt,
    }
  },

  delete(userId: number, id: string): boolean {
    return (
      getDb()
        .prepare(`DELETE FROM salary_expenses WHERE id = ? AND userId = ?`)
        .run(id, userId).changes > 0
    )
  },
}
