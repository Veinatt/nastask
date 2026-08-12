import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { telegramAuth } from '../middleware/telegramAuth'
import { workTemplatesRepo } from '../db/workTemplatesRepo'

export const workTemplatesRouter = Router()
workTemplatesRouter.use(telegramAuth)

type Body = Record<string, unknown>

workTemplatesRouter.get('/', (req, res) => {
  try {
    const userId = req.telegramUserId
    if (userId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }
    res.json({ success: true, items: workTemplatesRepo.list(userId) })
  } catch (error) {
    console.error('[api:work-templates] list failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

workTemplatesRouter.post('/', (req, res) => {
  try {
    const userId = req.telegramUserId
    if (userId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }
    const body = (req.body ?? {}) as Body
    try {
      const input: {
        id: string
        name: string
        categoryId: string
        descriptionId: string
        unitId: string
        defaultQuantity?: number
      } = {
        id: body.id ? String(body.id) : randomUUID(),
        name: String(body.name ?? ''),
        categoryId: String(body.categoryId ?? ''),
        descriptionId: String(body.descriptionId ?? ''),
        unitId: String(body.unitId ?? ''),
      }
      if (body.defaultQuantity != null) {
        input.defaultQuantity = Number(body.defaultQuantity)
      }
      const item = workTemplatesRepo.create(userId, input)
      res.status(201).json({ success: true, item })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'create failed'
      res.status(400).json({ success: false, error: msg })
    }
  } catch (error) {
    console.error('[api:work-templates] create failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

workTemplatesRouter.put('/:id', (req, res) => {
  try {
    const userId = req.telegramUserId
    if (userId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }
    const id = String(req.params.id ?? '')
    const existing = workTemplatesRepo.get(id)
    if (!existing || existing.userId !== userId) {
      res.status(404).json({ success: false, error: 'Not found' })
      return
    }
    const body = (req.body ?? {}) as Body
    try {
      const fields: {
        name?: string
        categoryId?: string
        descriptionId?: string
        unitId?: string
        defaultQuantity?: number
      } = {}
      if (body.name !== undefined) fields.name = String(body.name)
      if (body.categoryId !== undefined) fields.categoryId = String(body.categoryId)
      if (body.descriptionId !== undefined) {
        fields.descriptionId = String(body.descriptionId)
      }
      if (body.unitId !== undefined) fields.unitId = String(body.unitId)
      if (body.defaultQuantity !== undefined) {
        fields.defaultQuantity = Number(body.defaultQuantity)
      }
      const item = workTemplatesRepo.update(id, fields)
      res.json({ success: true, item })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'update failed'
      res.status(400).json({ success: false, error: msg })
    }
  } catch (error) {
    console.error('[api:work-templates] update failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

workTemplatesRouter.delete('/:id', (req, res) => {
  try {
    const userId = req.telegramUserId
    if (userId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }
    const id = String(req.params.id ?? '')
    const existing = workTemplatesRepo.get(id)
    if (!existing || existing.userId !== userId) {
      res.status(404).json({ success: false, error: 'Not found' })
      return
    }
    workTemplatesRepo.delete(id)
    res.json({ success: true, deleted: true })
  } catch (error) {
    console.error('[api:work-templates] delete failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})
