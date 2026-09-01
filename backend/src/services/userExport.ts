import {
  categoriesRepo,
  descriptionsRepo,
  expenseArticlesRepo,
  unitsRepo,
} from '../db/dictRepo'
import { salaryExpensesRepo } from '../db/expensesRepo'
import { intervalsRepo } from '../db/intervalsRepo'
import { settingsRepo } from '../db/settingsRepo'
import { workTemplatesRepo } from '../db/workTemplatesRepo'

export function buildUserExport(userId: number): Record<string, unknown> {
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

  return {
    success: true,
    settings,
    categories,
    descriptions,
    units,
    expenseArticles,
    expenses,
    intervals,
    workTemplates,
  }
}
