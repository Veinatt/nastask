import { Router, type Request, type Response } from 'express'
import { randomUUID } from 'node:crypto'
import { telegramAuth } from '../middleware/telegramAuth'
import { intervalsRepo, liveTotalSeconds } from '../db/intervalsRepo'
import { settingsRepo } from '../db/settingsRepo'
import { categoriesRepo, descriptionsRepo, unitsRepo } from '../db/dictRepo'
import type { WorkItemInput } from '../types'
import { dateInTimezone, nowIso, secondsBetween } from '../utils/iso'

export const intervalsRouter = Router()
intervalsRouter.use(telegramAuth)

type Body = Record<string, unknown>

function parseWorkItems(raw: unknown): WorkItemInput[] | { error: string } {
  if (!Array.isArray(raw)) return { error: 'workItems must be an array' }
  const items: WorkItemInput[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') return { error: 'invalid workItem' }
    const r = row as Record<string, unknown>
    const quantity = Number(r.quantity)
    if (!r.categoryId || !r.descriptionId || !r.unitId) {
      return { error: 'workItem requires categoryId, descriptionId, unitId' }
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { error: 'workItem.quantity must be > 0' }
    }
    items.push({
      id: r.id ? String(r.id) : randomUUID(),
      categoryId: String(r.categoryId),
      descriptionId: String(r.descriptionId),
      quantity,
      unitId: String(r.unitId),
    })
  }
  return items
}

function withLive(entry: ReturnType<typeof intervalsRepo.get>) {
  if (!entry) return null
  return {
    ...entry,
    liveTotalSeconds: liveTotalSeconds(entry),
    isPaused: Boolean(entry.pauseStartedAt),
    isActive: entry.end == null,
    workItems: intervalsRepo.listWorkItems(entry.id),
  }
}

function owned(req: Request, res: Response) {
  const userId = req.telegramUserId
  if (userId == null) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return null
  }
  const id = String(req.params.id ?? '').trim()
  const entry = intervalsRepo.get(id)
  if (!entry || entry.userId !== userId) {
    res.status(404).json({ success: false, error: 'Interval not found' })
    return null
  }
  return { userId, entry }
}

intervalsRouter.post('/start', (req, res) => {
  try {
    const userId = req.telegramUserId
    if (userId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }
    const body = (req.body ?? {}) as Body
    const title = String(body.title ?? '').trim()
    const id = body.id ? String(body.id) : randomUUID()
    const entry = intervalsRepo.start(userId, title, id)
    console.log(`[api:intervals] START id=${entry.id}`)
    res.status(201).json({ success: true, interval: withLive(entry) })
  } catch (error) {
    console.error('[api:intervals] start failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

intervalsRouter.post('/manual', (req, res) => {
  try {
    const userId = req.telegramUserId
    if (userId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }
    const body = (req.body ?? {}) as Body
    const title = String(body.title ?? '').trim()
    const start = String(body.start ?? '')
    const end = String(body.end ?? '')
    const coefficient = Number(body.coefficient ?? 1)
    if (!start || !end) {
      res.status(400).json({ success: false, error: 'start and end required' })
      return
    }
    if (!Number.isFinite(coefficient) || coefficient <= 0) {
      res.status(400).json({ success: false, error: 'coefficient must be > 0' })
      return
    }
    const workItems = parseWorkItems(body.workItems ?? [])
    if ('error' in workItems) {
      res.status(400).json({ success: false, error: workItems.error })
      return
    }
    const settings = settingsRepo.getOrCreate(userId)
    const totalSeconds = secondsBetween(start, end)
    const now = nowIso()
    const id = body.id ? String(body.id) : randomUUID()
    const entry = intervalsRepo.insert({
      id,
      userId,
      title,
      coefficient,
      start,
      end,
      totalSeconds,
      pauseTotalSeconds: Number(body.pauseTotalSeconds ?? 0),
      pauseStartedAt: null,
      date: dateInTimezone(start, settings.timezone),
      createdAt: now,
      updatedAt: now,
    })
    const items = intervalsRepo.replaceWorkItems(entry.id, workItems)
    console.log(`[api:intervals] MANUAL «${entry.title}» id=${entry.id}`)
    res.status(201).json({
      success: true,
      interval: { ...withLive(entry), workItems: items },
    })
  } catch (error) {
    console.error('[api:intervals] manual failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

intervalsRouter.put('/:id/pause', (req, res) => {
  try {
    const ctx = owned(req, res)
    if (!ctx) return
    const entry = intervalsRepo.pause(ctx.entry)
    console.log(`[api:intervals] PAUSE id=${entry.id}`)
    res.json({ success: true, interval: withLive(entry) })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'pause failed'
    res.status(400).json({ success: false, error: msg })
  }
})

intervalsRouter.put('/:id/resume', (req, res) => {
  try {
    const ctx = owned(req, res)
    if (!ctx) return
    const entry = intervalsRepo.resume(ctx.entry)
    console.log(`[api:intervals] RESUME id=${entry.id}`)
    res.json({ success: true, interval: withLive(entry) })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'resume failed'
    res.status(400).json({ success: false, error: msg })
  }
})

intervalsRouter.put('/:id/complete', (req, res) => {
  try {
    const ctx = owned(req, res)
    if (!ctx) return
    const body = (req.body ?? {}) as Body
    const coefficient = Number(body.coefficient ?? ctx.entry.coefficient ?? 1)
    if (!Number.isFinite(coefficient) || coefficient <= 0) {
      res.status(400).json({ success: false, error: 'coefficient must be > 0' })
      return
    }
    const workItems = parseWorkItems(body.workItems ?? [])
    if ('error' in workItems) {
      res.status(400).json({ success: false, error: workItems.error })
      return
    }
    const result = intervalsRepo.complete(ctx.entry, { coefficient, workItems })
    console.log(`[api:intervals] COMPLETE id=${result.entry.id}`)
    res.json({
      success: true,
      interval: { ...withLive(result.entry), workItems: result.workItems },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'complete failed'
    res.status(400).json({ success: false, error: msg })
  }
})

intervalsRouter.get('/active', (req, res) => {
  try {
    const userId = req.telegramUserId
    if (userId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }
    const intervals = intervalsRepo.listActive(userId).map((e) => withLive(e))
    res.json({ success: true, intervals })
  } catch (error) {
    console.error('[api:intervals] active failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

intervalsRouter.get('/completed', (req, res) => {
  try {
    const userId = req.telegramUserId
    if (userId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }
    const date = String(req.query.date ?? '').trim()
    const from = String(req.query.from ?? '').trim()
    const to = String(req.query.to ?? '').trim()
    const ymd = /^\d{4}-\d{2}-\d{2}$/

    let intervals
    if (from && to && ymd.test(from) && ymd.test(to)) {
      const lo = from <= to ? from : to
      const hi = from <= to ? to : from
      intervals = intervalsRepo.listCompletedByRange(userId, lo, hi).map((e) => withLive(e))
    } else if (ymd.test(date)) {
      intervals = intervalsRepo.listCompletedByDate(userId, date).map((e) => withLive(e))
    } else if (!date && !from && !to) {
      intervals = intervalsRepo.listAllCompleted(userId).map((e) => withLive(e))
    } else {
      res.status(400).json({
        success: false,
        error: 'omit params for all, or date=YYYY-MM-DD, or from=&to=',
      })
      return
    }
    res.json({ success: true, intervals })
  } catch (error) {
    console.error('[api:intervals] completed failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

intervalsRouter.get('/report/salary', (req, res) => {
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
    const settings = settingsRepo.getOrCreate(userId)
    const entries = intervalsRepo.listCompletedInMonth(userId, year, month)
    const rows = entries.map((e) => {
      const hours = e.totalSeconds / 3600
      const amount = hours * e.coefficient * settings.hourlyRate
      return {
        id: e.id,
        date: e.date,
        start: e.start,
        end: e.end,
        title: e.title,
        hours,
        coefficient: e.coefficient,
        amount,
        totalSeconds: e.totalSeconds,
      }
    })
    const monthSum = rows.reduce((s, r) => s + r.amount, 0)
    const totalHours = rows.reduce((s, r) => s + r.hours, 0)
    const taxAmount = (monthSum * settings.taxRate) / 100
    const employerPay = monthSum + taxAmount
    res.json({
      success: true,
      report: {
        year,
        month,
        currency: settings.currency,
        hourlyRate: settings.hourlyRate,
        taxRate: settings.taxRate,
        rows,
        totalHours,
        monthSum,
        taxAmount,
        employerPay,
      },
    })
  } catch (error) {
    console.error('[api:intervals] salary report failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

intervalsRouter.get('/report/tax', (req, res) => {
  try {
    const userId = req.telegramUserId
    if (userId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }
    const year = Number(req.query.year)
    const month = Number(req.query.month)
    const groupBy = String(req.query.groupBy ?? 'both') // category | description | both
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      res.status(400).json({ success: false, error: 'year and month required' })
      return
    }
    const entries = intervalsRepo.listCompletedInMonth(userId, year, month)
    const cats = new Map(categoriesRepo.list(userId).map((c) => [c.id, c.name]))
    const descs = new Map(descriptionsRepo.list(userId).map((d) => [d.id, d.name]))
    const units = new Map(unitsRepo.list(userId).map((u) => [u.id, u.name]))

    type Agg = {
      categoryId: string | null
      descriptionId: string | null
      categoryName: string | null
      descriptionName: string | null
      unitId: string
      unitName: string
      quantity: number
    }
    const map = new Map<string, Agg>()

    for (const entry of entries) {
      for (const w of intervalsRepo.listWorkItems(entry.id)) {
        const catKey = groupBy === 'description' ? '' : w.categoryId
        const descKey = groupBy === 'category' ? '' : w.descriptionId
        const key = `${catKey}|${descKey}|${w.unitId}`
        const prev = map.get(key)
        if (prev) {
          prev.quantity += w.quantity
        } else {
          map.set(key, {
            categoryId: catKey || null,
            descriptionId: descKey || null,
            categoryName: catKey ? (cats.get(catKey) ?? null) : null,
            descriptionName: descKey ? (descs.get(descKey) ?? null) : null,
            unitId: w.unitId,
            unitName: units.get(w.unitId) ?? '',
            quantity: w.quantity,
          })
        }
      }
    }

    res.json({
      success: true,
      report: {
        year,
        month,
        groupBy,
        rows: [...map.values()].sort((a, b) =>
          `${a.categoryName}-${a.descriptionName}`.localeCompare(
            `${b.categoryName}-${b.descriptionName}`,
          ),
        ),
      },
    })
  } catch (error) {
    console.error('[api:intervals] tax report failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

intervalsRouter.put('/:id', (req, res) => {
  try {
    const ctx = owned(req, res)
    if (!ctx) return
    const body = (req.body ?? {}) as Body
    let entry = ctx.entry

    if (body.title != null) entry = { ...entry, title: String(body.title).trim() }
    if (body.coefficient != null) {
      const coefficient = Number(body.coefficient)
      if (!Number.isFinite(coefficient) || coefficient <= 0) {
        res.status(400).json({ success: false, error: 'coefficient must be > 0' })
        return
      }
      entry = { ...entry, coefficient }
    }
    if (body.start != null || body.end != null) {
      const start = body.start != null ? String(body.start) : entry.start
      const end = body.end !== undefined ? (body.end ? String(body.end) : null) : entry.end
      const settings = settingsRepo.getOrCreate(ctx.userId)
      let totalSeconds = entry.totalSeconds
      if (end) {
        totalSeconds = secondsBetween(start, end)
      }
      entry = {
        ...entry,
        start,
        end,
        totalSeconds,
        date: dateInTimezone(start, settings.timezone),
        pauseStartedAt: end ? null : entry.pauseStartedAt,
      }
    }

    entry = { ...entry, updatedAt: nowIso() }
    entry = intervalsRepo.update(entry)

    if (body.workItems !== undefined) {
      const workItems = parseWorkItems(body.workItems)
      if ('error' in workItems) {
        res.status(400).json({ success: false, error: workItems.error })
        return
      }
      intervalsRepo.replaceWorkItems(entry.id, workItems)
    }

    console.log(`[api:intervals] UPDATE id=${entry.id}`)
    res.json({ success: true, interval: withLive(entry) })
  } catch (error) {
    console.error('[api:intervals] update failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

intervalsRouter.delete('/:id', (req, res) => {
  try {
    const ctx = owned(req, res)
    if (!ctx) return
    intervalsRepo.delete(ctx.entry.id)
    console.log(`[api:intervals] DELETE id=${ctx.entry.id}`)
    res.json({ success: true, deleted: true })
  } catch (error) {
    console.error('[api:intervals] delete failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})
