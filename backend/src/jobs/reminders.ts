import { intervalsRepo } from '../db/intervalsRepo'
import { listKnownUserIds } from '../db/usersRepo'
import { sendMessage } from '../services/telegramSend'
import {
  continuousRunHours,
  isUiStale,
} from '../utils/intervalFreshness'
import { config } from '../config'

const STILL_WORKING_HOURS = 1.5
const STILL_WORKING_COOLDOWN_MS = 1.5 * 60 * 60 * 1000

/** entryId → last still-working ping ms */
const stillWorkingSentAt = new Map<string, number>()
let lastDigestKey = ''
let timer: ReturnType<typeof setInterval> | null = null

function minskParts(now = new Date()): {
  weekday: number
  hour: number
  minute: number
  dayKey: string
} {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Minsk',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  })
  const parts = fmt.formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  return {
    weekday: weekdayMap[get('weekday')] ?? 0,
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    dayKey: `${get('year')}-${get('month')}-${get('day')}`,
  }
}

function minskDayKey(iso: string): string {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return iso.slice(0, 10)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Minsk',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

function labelEntry(entry: {
  id: string
  title: string
  start: string
  end: string | null
  date?: string
}): string {
  const title = entry.title.trim() || 'без названия'
  const day =
    entry.date && /^\d{4}-\d{2}-\d{2}$/.test(entry.date)
      ? entry.date
      : minskDayKey(entry.start)
  return `• ${title} (${day})`
}

async function sendSundayDigest(userId: number, now: Date): Promise<void> {
  const actives = intervalsRepo.listActive(userId)
  const from = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  const to = now.toISOString().slice(0, 10)
  const completed = intervalsRepo.listCompletedByRange(userId, from, to)

  const criticalActive: string[] = []
  const emptyActive: string[] = []

  for (const entry of actives) {
    const works = intervalsRepo.listWorkItems(entry.id)
    // Same as UI «не заполнен»: no work items (title alone is not enough).
    const needsFill = works.length === 0
    // «Давние» = ≥1 business day after start (Fri→Mon: weekends don't count).
    if (isUiStale(entry.start, now)) {
      criticalActive.push(labelEntry(entry))
    }
    if (needsFill) {
      emptyActive.push(labelEntry(entry))
    }
  }

  const emptyCompleted: string[] = []
  for (const entry of completed) {
    const works = intervalsRepo.listWorkItems(entry.id)
    // Same as UI «не заполнен» on cards: no work items.
    if (works.length === 0) {
      emptyCompleted.push(labelEntry(entry))
    }
  }

  if (
    criticalActive.length === 0 &&
    emptyActive.length === 0 &&
    emptyCompleted.length === 0
  ) {
    return
  }

  const lines: string[] = ['🗓 Воскресный дайджест NasTask']
  if (criticalActive.length) {
    lines.push('', 'Давние активные:', ...criticalActive)
  }
  if (emptyActive.length) {
    lines.push('', 'Активные без заполнения:', ...emptyActive)
  }
  if (emptyCompleted.length) {
    lines.push('', 'Завершённые без заполнения:', ...emptyCompleted.slice(0, 20))
    if (emptyCompleted.length > 20) {
      lines.push(`…ещё ${emptyCompleted.length - 20}`)
    }
  }

  const openApp =
    config.webAppUrl.length > 0
      ? [[{ text: 'Открыть', web_app: { url: config.webAppUrl } }]]
      : []

  await sendMessage({
    chatId: userId,
    text: lines.join('\n'),
    replyMarkup: openApp.length ? { inline_keyboard: openApp } : undefined,
  })
}

async function sendStillWorking(userId: number, now: Date): Promise<void> {
  for (const entry of intervalsRepo.listActive(userId)) {
    if (entry.pauseStartedAt) continue
    const hours = continuousRunHours(entry, now)
    if (hours < STILL_WORKING_HOURS) continue
    const last = stillWorkingSentAt.get(entry.id) ?? 0
    if (now.getTime() - last < STILL_WORKING_COOLDOWN_MS) continue
    stillWorkingSentAt.set(entry.id, now.getTime())
    const title = entry.title.trim() || 'без названия'
    await sendMessage({
      chatId: userId,
      text: `⏱ Всё ещё работаешь над «${title}»? Уже ~${Math.floor(hours)} ч без паузы.`,
      replyMarkup: {
        inline_keyboard: [
          [{ text: '⏸ Пауза', callback_data: `pause:${entry.id}` }],
        ],
      },
    })
  }
}

async function tick(): Promise<void> {
  if (!config.botToken) return
  const now = new Date()
  const parts = minskParts(now)

  // Fire once during Sunday 19:00–19:59 Minsk (job ticks ~30m).
  if (parts.weekday === 0 && parts.hour === 19) {
    const key = `digest:${parts.dayKey}`
    if (lastDigestKey !== key) {
      lastDigestKey = key
      for (const userId of listKnownUserIds()) {
        try {
          await sendSundayDigest(userId, now)
        } catch (error) {
          console.error('[reminders] digest failed', userId, error)
        }
      }
    }
  }

  for (const userId of listKnownUserIds()) {
    try {
      await sendStillWorking(userId, now)
    } catch (error) {
      console.error('[reminders] still-working failed', userId, error)
    }
  }
}

export function startReminderJobs(): void {
  if (!config.botEnabled || !config.botToken) {
    console.log('[reminders] skipped (need BOT_ENABLED=true and BOT_TOKEN)')
    return
  }
  if (timer) return
  console.log('[reminders] started (still-working ~30m, Sunday 19:00 Minsk digest)')
  void tick()
  timer = setInterval(() => {
    void tick()
  }, 30 * 60 * 1000)
}

export function stopReminderJobs(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

/** Dev helpers — bypass Sunday window / still-working cooldown. */
export async function debugRunStillWorking(userId?: number): Promise<number> {
  stillWorkingSentAt.clear()
  const ids = userId != null ? [userId] : listKnownUserIds()
  const now = new Date()
  let n = 0
  for (const id of ids) {
    await sendStillWorking(id, now)
    n += 1
  }
  return n
}

export async function debugRunDigest(userId?: number): Promise<number> {
  lastDigestKey = ''
  const ids = userId != null ? [userId] : listKnownUserIds()
  const now = new Date()
  let n = 0
  for (const id of ids) {
    await sendSundayDigest(id, now)
    n += 1
  }
  return n
}
