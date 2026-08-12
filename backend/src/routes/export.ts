import { Router } from 'express'
import { telegramAuth } from '../middleware/telegramAuth'
import { settingsRepo } from '../db/settingsRepo'
import {
  categoriesRepo,
  descriptionsRepo,
  expenseArticlesRepo,
  unitsRepo,
} from '../db/dictRepo'
import { salaryExpensesRepo } from '../db/expensesRepo'
import { intervalsRepo } from '../db/intervalsRepo'
import { workTemplatesRepo } from '../db/workTemplatesRepo'

export const exportRouter = Router()
exportRouter.use(telegramAuth)

exportRouter.get('/', (req, res) => {
  try {
    const userId = req.telegramUserId
    if (userId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }

    const settings = settingsRepo.getOrCreate(userId)
    const categories = categoriesRepo.list(userId)
    const descriptions = descriptionsRepo.list(userId)
    const units = unitsRepo.list(userId)
    const expenseArticles = expenseArticlesRepo.list(userId)
    const expenses = salaryExpensesRepo.listAll(userId)
    const workTemplates = workTemplatesRepo.list(userId)

    const entries = [
      ...intervalsRepo.listAllCompleted(userId),
      ...intervalsRepo.listActive(userId),
    ]
    const intervals = entries.map((entry) => ({
      entry,
      workItems: intervalsRepo.listWorkItems(entry.id),
    }))

    res.json({
      success: true,
      settings,
      categories,
      descriptions,
      units,
      expenseArticles,
      expenses,
      intervals,
      workTemplates,
    })
  } catch (error) {
    console.error('[api:export] failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})
