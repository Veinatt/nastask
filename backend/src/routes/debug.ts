import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { config } from '../config'
import { telegramAuth } from '../middleware/telegramAuth'
import { intervalsRepo } from '../db/intervalsRepo'
import {
  categoriesRepo,
  descriptionsRepo,
  unitsRepo,
  expenseArticlesRepo,
} from '../db/dictRepo'
import { salaryExpensesRepo } from '../db/expensesRepo'
import { settingsRepo } from '../db/settingsRepo'
import { dateInTimezone, nowIso } from '../utils/iso'
import type { TimeEntry } from '../types'
import { sendMessage } from '../services/telegramSend'
import { debugRunDigest, debugRunStillWorking } from '../jobs/reminders'

export const debugRouter = Router()

debugRouter.use((req, res, next) => {
  if (!config.authDevBypass) {
    res.status(404).json({ success: false, error: 'Not found' })
    return
  }
  next()
})

debugRouter.use(telegramAuth)

/** Previous Friday 10:00 Europe/Minsk as ISO, relative to `now`. */
function previousFridayMorningIso(now = new Date()): string {
  // Walk back calendar days in Minsk until Friday
  const cursor = new Date(now.getTime())
  for (let i = 0; i < 14; i++) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Minsk',
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(cursor)
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
    if (get('weekday') === 'Fri') {
      const y = get('year')
      const m = get('month')
      const d = get('day')
      // 10:00 Minsk = 07:00 UTC (winter) / 07:00 with +03 → use noon UTC offset guess via formatter
      // Construct as UTC approximating Minsk (+03): 10:00 Minsk = 07:00Z
      return new Date(`${y}-${m}-${d}T07:00:00.000Z`).toISOString()
    }
    cursor.setTime(cursor.getTime() - 24 * 3600 * 1000)
  }
  // Fallback: 5 days ago
  return new Date(now.getTime() - 5 * 24 * 3600 * 1000).toISOString()
}

function daysAgoIso(days: number, hourUtc = 8): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  d.setUTCHours(hourUtc, 0, 0, 0)
  return d.toISOString()
}

function ensureDicts(userId: number): {
  categoryId: string
  descriptionId: string
  unitId: string
} {
  const cats = categoriesRepo.list(userId)
  const descs = descriptionsRepo.list(userId)
  const units = unitsRepo.list(userId)
  const categoryId = cats[0]?.id ?? categoriesRepo.create(userId, 'Debug cat').id
  const descriptionId = descs[0]?.id ?? descriptionsRepo.create(userId, 'Debug work').id
  const unitId = units[0]?.id ?? unitsRepo.create(userId, 'шт').id
  return { categoryId, descriptionId, unitId }
}

function insertEntry(
  partial: Omit<TimeEntry, 'createdAt' | 'updatedAt' | 'date'> & {
    date?: string
  },
): TimeEntry {
  const settings = settingsRepo.getOrCreate(partial.userId)
  const now = nowIso()
  return intervalsRepo.insert({
    ...partial,
    date: partial.date ?? dateInTimezone(partial.start, settings.timezone),
    createdAt: now,
    updatedAt: now,
  })
}

debugRouter.post('/scenarios', (req, res) => {
  try {
    const userId = req.telegramUserId
    if (userId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }

    // Clear existing actives for a clean seed (completed kept)
    for (const a of intervalsRepo.listActive(userId)) {
      intervalsRepo.delete(a.id)
    }

    const dicts = ensureDicts(userId)
    const now = new Date()
    const created: Array<{ key: string; id: string }> = []

    // 1. empty paused (fill text «не заполнен»; not >24h)
    {
      const start = new Date(now.getTime() - 3 * 3600 * 1000).toISOString()
      const e = insertEntry({
        id: randomUUID(),
        userId,
        title: '',
        coefficient: 1,
        start,
        end: null,
        totalSeconds: 2 * 3600,
        pauseTotalSeconds: 0,
        pauseStartedAt: nowIso(),
        notes: null,
      })
      created.push({ key: 'empty_paused', id: e.id })
    }

    // 2. running >90 min (still-working), empty fill
    {
      const start = new Date(now.getTime() - 2 * 3600 * 1000).toISOString()
      const e = insertEntry({
        id: randomUUID(),
        userId,
        title: 'Still working debug',
        coefficient: 1,
        start,
        end: null,
        totalSeconds: 0,
        pauseTotalSeconds: 0,
        pauseStartedAt: null,
        notes: null,
      })
      created.push({ key: 'running_still_working', id: e.id })
    }

    // 2b. running filled (title + works) — only one running after pause-others;
    // keep paused so still-working stays the sole runner for modal tests.
    {
      const start = new Date(now.getTime() - 25 * 60 * 1000).toISOString()
      const e = insertEntry({
        id: randomUUID(),
        userId,
        title: 'Running filled sample',
        coefficient: 1,
        start,
        end: null,
        totalSeconds: 20 * 60,
        pauseTotalSeconds: 0,
        pauseStartedAt: nowIso(),
        notes: null,
      })
      intervalsRepo.replaceWorkItems(e.id, [
        {
          categoryId: dicts.categoryId,
          descriptionId: dicts.descriptionId,
          unitId: dicts.unitId,
          quantity: 2,
        },
      ])
      created.push({ key: 'paused_was_running_filled', id: e.id })
    }

    // 2c. long run >8h (red timer), paused so it does not steal still-working
    {
      const start = new Date(now.getTime() - 9 * 3600 * 1000).toISOString()
      const e = insertEntry({
        id: randomUUID(),
        userId,
        title: 'Over 8h sample',
        coefficient: 1,
        start,
        end: null,
        totalSeconds: 9 * 3600,
        pauseTotalSeconds: 0,
        pauseStartedAt: nowIso(),
        notes: null,
      })
      created.push({ key: 'paused_over_8h', id: e.id })
    }

    // 3. paused with title + works (draft ok)
    {
      const start = new Date(now.getTime() - 50 * 60 * 1000).toISOString()
      const pauseAt = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
      const e = insertEntry({
        id: randomUUID(),
        userId,
        title: 'Paused draft ok',
        coefficient: 1,
        start,
        end: null,
        totalSeconds: 45 * 60,
        pauseTotalSeconds: 0,
        pauseStartedAt: pauseAt,
        notes: 'черновик ок',
      })
      intervalsRepo.replaceWorkItems(e.id, [
        {
          categoryId: dicts.categoryId,
          descriptionId: dicts.descriptionId,
          unitId: dicts.unitId,
          quantity: 1,
        },
      ])
      created.push({ key: 'paused_with_works', id: e.id })
    }

    // 4. active as-from-Friday (not stale until Tue)
    {
      const start = previousFridayMorningIso(now)
      // keep paused so still-working runner stays the only running
      const e = insertEntry({
        id: randomUUID(),
        userId,
        title: 'Friday carryover',
        coefficient: 1,
        start,
        end: null,
        totalSeconds: 3600,
        pauseTotalSeconds: 0,
        pauseStartedAt: nowIso(),
        notes: null,
      })
      created.push({ key: 'active_friday_carryover', id: e.id })
    }

    // 5. active stale (start >2 business days ago) — use 5 calendar days ago weekday
    {
      const start = daysAgoIso(5)
      const e = insertEntry({
        id: randomUUID(),
        userId,
        title: 'Stale active',
        coefficient: 1,
        start,
        end: null,
        totalSeconds: 7200,
        pauseTotalSeconds: 0,
        pauseStartedAt: nowIso(),
        notes: null,
      })
      created.push({ key: 'active_stale', id: e.id })
    }

    // 6. completed without works / title — red border
    {
      const start = daysAgoIso(0, 6)
      const end = daysAgoIso(0, 8)
      const e = insertEntry({
        id: randomUUID(),
        userId,
        title: '',
        coefficient: 1,
        start,
        end,
        totalSeconds: 2 * 3600,
        pauseTotalSeconds: 0,
        pauseStartedAt: null,
        notes: null,
      })
      created.push({ key: 'completed_sparse', id: e.id })
    }

    // 7. completed normal with notes
    {
      const start = daysAgoIso(0, 9)
      const end = daysAgoIso(0, 11)
      const e = insertEntry({
        id: randomUUID(),
        userId,
        title: 'Нормальный день',
        coefficient: 1,
        start,
        end,
        totalSeconds: 2 * 3600,
        pauseTotalSeconds: 0,
        pauseStartedAt: null,
        notes: 'всё заполнено',
      })
      intervalsRepo.replaceWorkItems(e.id, [
        {
          categoryId: dicts.categoryId,
          descriptionId: dicts.descriptionId,
          unitId: dicts.unitId,
          quantity: 3,
        },
      ])
      created.push({ key: 'completed_ok', id: e.id })
    }

    // 8. completed yesterday sparse (Home «вчера»)
    {
      const start = daysAgoIso(1, 8)
      const end = daysAgoIso(1, 10)
      const e = insertEntry({
        id: randomUUID(),
        userId,
        title: '',
        coefficient: 1,
        start,
        end,
        totalSeconds: 3600,
        pauseTotalSeconds: 0,
        pauseStartedAt: null,
        notes: null,
      })
      created.push({ key: 'completed_yesterday_sparse', id: e.id })
    }

    // 9. salary expense for current month (Reports)
    try {
      const y = now.getUTCFullYear()
      const m = now.getUTCMonth() + 1
      const articleName = 'UI matrix expense'
      const existing = expenseArticlesRepo
        .list(userId)
        .find((a) => a.name.toLowerCase() === articleName.toLowerCase())
      const article = existing ?? expenseArticlesRepo.create(userId, articleName)
      const expense = salaryExpensesRepo.create(userId, {
        year: y,
        month: m,
        name: article.name,
        amount: 42.5,
      })
      created.push({ key: 'expense_article', id: article.id })
      created.push({ key: 'salary_expense', id: expense.id })
    } catch (error) {
      console.error('[debug] expense seed skipped', error)
    }

    console.log(`[debug] seeded scenarios for userId=${userId} count=${created.length}`)
    res.json({ success: true, scenarios: created })
  } catch (error) {
    console.error('[debug] scenarios failed', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'seed failed',
    })
  }
})

/** Wipe active intervals for the auth user (completed kept). For demo cleanup. */
debugRouter.post('/clear-actives', (req, res) => {
  try {
    const userId = req.telegramUserId
    if (userId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }
    const actives = intervalsRepo.listActive(userId)
    for (const entry of actives) {
      intervalsRepo.delete(entry.id)
    }
    console.log(`[debug] cleared ${actives.length} active(s) for userId=${userId}`)
    res.json({ success: true, cleared: actives.length })
  } catch (error) {
    console.error('[debug] clear-actives failed', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'clear failed',
    })
  }
})

/** Send a one-off test message to the auth user. */
debugRouter.post('/bot/ping', async (req, res) => {
  try {
    const userId = req.telegramUserId
    if (userId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }
    if (!config.botToken) {
      res.status(503).json({ success: false, error: 'BOT_TOKEN empty' })
      return
    }
    const text =
      typeof (req.body as { text?: unknown })?.text === 'string'
        ? String((req.body as { text: string }).text).trim()
        : 'NasTask bot OK (local debug ping)'
    // Avoid shell/curl encoding mangling: keep default ASCII; caller may pass UTF-8 JSON.
    await sendMessage({
      chatId: userId,
      text: text || 'NasTask bot OK (local debug ping)',
      replyMarkup: {
        inline_keyboard: [[{ text: '⏸ Пауза', callback_data: 'pause_all' }]],
      },
    })
    res.json({ success: true, chatId: userId })
  } catch (error) {
    console.error('[debug] bot ping failed', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'ping failed',
    })
  }
})

/** Force still-working reminders (clears cooldown). */
debugRouter.post('/bot/still-working', async (req, res) => {
  try {
    const userId = req.telegramUserId
    if (userId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }
    const n = await debugRunStillWorking(userId)
    res.json({ success: true, users: n })
  } catch (error) {
    console.error('[debug] still-working failed', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'still-working failed',
    })
  }
})

/** Force Sunday-style digest now. */
debugRouter.post('/bot/digest', async (req, res) => {
  try {
    const userId = req.telegramUserId
    if (userId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }
    const n = await debugRunDigest(userId)
    res.json({ success: true, users: n })
  } catch (error) {
    console.error('[debug] digest failed', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'digest failed',
    })
  }
})
