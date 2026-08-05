import { Router } from 'express'
import { telegramAuth } from '../middleware/telegramAuth'
import { expenseArticlesRepo } from '../db/dictRepo'
import { salaryExpensesRepo } from '../db/expensesRepo'

export const expensesRouter = Router()
expensesRouter.use(telegramAuth)

expensesRouter.get('/', (req, res) => {
  try {
    const userId = req.telegramUserId
    if (userId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }
    const year = Number(req.query.year)
    const month = Number(req.query.month)
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      res.status(400).json({ success: false, error: 'year and month required' })
      return
    }
    const items = salaryExpensesRepo.listMonth(userId, year, month)
    const total = salaryExpensesRepo.sumMonth(userId, year, month)
    res.json({ success: true, items, total })
  } catch (error) {
    console.error('[api:expenses] list month failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

expensesRouter.post('/', (req, res) => {
  try {
    const userId = req.telegramUserId
    if (userId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }
    const body = req.body as {
      year?: number
      month?: number
      name?: string
      amount?: number
    }
    const year = Number(body.year)
    const month = Number(body.month)
    const name = String(body.name ?? '').trim()
    const amount = Number(body.amount)

    try {
      // Name must already exist in catalog (approved via checkmark like categories)
      const inCatalog = expenseArticlesRepo
        .list(userId)
        .some((a) => a.name.toLowerCase() === name.toLowerCase())
      if (!inCatalog) {
        res.status(400).json({
          success: false,
          error: 'Expense article must be saved to catalog first',
        })
        return
      }
      const item = salaryExpensesRepo.create(userId, { year, month, name, amount })
      res.status(201).json({ success: true, item })
    } catch (e) {
      res.status(400).json({
        success: false,
        error: e instanceof Error ? e.message : 'Invalid expense',
      })
    }
  } catch (error) {
    console.error('[api:expenses] create failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

expensesRouter.delete('/:id', (req, res) => {
  try {
    const userId = req.telegramUserId
    if (userId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }
    const ok = salaryExpensesRepo.delete(userId, req.params.id)
    if (!ok) {
      res.status(404).json({ success: false, error: 'Not found' })
      return
    }
    res.json({ success: true })
  } catch (error) {
    console.error('[api:expenses] delete failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})
