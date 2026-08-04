import { Router, type Request, type Response } from 'express'
import { randomUUID } from 'node:crypto'
import { telegramAuth } from '../middleware/telegramAuth'
import { categoriesRepo, descriptionsRepo, unitsRepo } from '../db/dictRepo'

function makeDictRouter(
  repo: typeof categoriesRepo,
  label: string,
) {
  const router = Router()
  router.use(telegramAuth)

  router.get('/', (req: Request, res: Response) => {
    try {
      const userId = req.telegramUserId
      if (userId == null) {
        res.status(401).json({ success: false, error: 'Unauthorized' })
        return
      }
      res.json({ success: true, items: repo.list(userId) })
    } catch (error) {
      console.error(`[api:${label}] list failed`, error)
      res.status(500).json({ success: false, error: 'Internal server error' })
    }
  })

  router.post('/', (req: Request, res: Response) => {
    try {
      const userId = req.telegramUserId
      if (userId == null) {
        res.status(401).json({ success: false, error: 'Unauthorized' })
        return
      }
      const name = String((req.body as { name?: string })?.name ?? '').trim()
      const id = String((req.body as { id?: string })?.id ?? randomUUID())
      if (!name) {
        res.status(400).json({ success: false, error: 'name is required' })
        return
      }
      try {
        const item = repo.create(userId, name, id)
        res.status(201).json({ success: true, item })
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'create failed'
        if (msg.includes('UNIQUE')) {
          res.status(409).json({ success: false, error: 'Name already exists' })
          return
        }
        throw error
      }
    } catch (error) {
      console.error(`[api:${label}] create failed`, error)
      res.status(500).json({ success: false, error: 'Internal server error' })
    }
  })

  router.put('/:id', (req: Request, res: Response) => {
    try {
      const userId = req.telegramUserId
      if (userId == null) {
        res.status(401).json({ success: false, error: 'Unauthorized' })
        return
      }
      const id = String(req.params.id ?? '')
      const item = repo.get(id)
      if (!item || item.userId !== userId) {
        res.status(404).json({ success: false, error: 'Not found' })
        return
      }
      const name = String((req.body as { name?: string })?.name ?? '').trim()
      if (!name) {
        res.status(400).json({ success: false, error: 'name is required' })
        return
      }
      try {
        const updated = repo.update(id, name)
        res.json({ success: true, item: updated })
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'update failed'
        if (msg.includes('UNIQUE')) {
          res.status(409).json({ success: false, error: 'Name already exists' })
          return
        }
        throw error
      }
    } catch (error) {
      console.error(`[api:${label}] update failed`, error)
      res.status(500).json({ success: false, error: 'Internal server error' })
    }
  })

  router.delete('/:id', (req: Request, res: Response) => {
    try {
      const userId = req.telegramUserId
      if (userId == null) {
        res.status(401).json({ success: false, error: 'Unauthorized' })
        return
      }
      const id = String(req.params.id ?? '')
      const item = repo.get(id)
      if (!item || item.userId !== userId) {
        res.status(404).json({ success: false, error: 'Not found' })
        return
      }
      if (repo.isUsed(id)) {
        res.status(409).json({
          success: false,
          error: 'Cannot delete: used in work items',
        })
        return
      }
      repo.delete(id)
      res.json({ success: true, deleted: true })
    } catch (error) {
      console.error(`[api:${label}] delete failed`, error)
      res.status(500).json({ success: false, error: 'Internal server error' })
    }
  })

  return router
}

export const categoriesRouter = makeDictRouter(categoriesRepo, 'categories')
export const descriptionsRouter = makeDictRouter(descriptionsRepo, 'descriptions')
export const unitsRouter = makeDictRouter(unitsRepo, 'units')
