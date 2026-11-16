import { intervalsRepo } from '../db/intervalsRepo'
import { answerCallbackQuery, sendMessage } from '../services/telegramSend'
import { config } from '../config'

type TelegramUpdate = {
  update_id: number
  message?: {
    message_id: number
    text?: string
    chat: { id: number }
    from?: { id: number }
  }
  callback_query?: {
    id: string
    data?: string
    from: { id: number }
    message?: { chat: { id: number } }
  }
}

let offset = 0
let stopped = false

async function getUpdates(): Promise<TelegramUpdate[]> {
  const token = config.botToken
  if (!token) return []
  const url = new URL(`https://api.telegram.org/bot${token}/getUpdates`)
  url.searchParams.set('timeout', '25')
  url.searchParams.set('offset', String(offset))
  url.searchParams.set('allowed_updates', JSON.stringify(['message', 'callback_query']))
  const response = await fetch(url, { method: 'GET' })
  const payload = (await response.json()) as {
    ok?: boolean
    result?: TelegramUpdate[]
    description?: string
  }
  if (!payload.ok || !payload.result) {
    throw new Error(payload.description ?? 'getUpdates failed')
  }
  return payload.result
}

function pauseAllForUser(userId: number): number {
  let n = 0
  for (const entry of intervalsRepo.listActive(userId)) {
    if (entry.pauseStartedAt) continue
    try {
      intervalsRepo.pause(entry)
      n += 1
    } catch (error) {
      console.error('[bot] pause failed', entry.id, error)
    }
  }
  return n
}

function pauseOne(userId: number, entryId: string): boolean {
  const entry = intervalsRepo.get(entryId)
  if (!entry || entry.userId !== userId || entry.end) return false
  if (entry.pauseStartedAt) return true
  intervalsRepo.pause(entry)
  return true
}

async function handleUpdate(update: TelegramUpdate): Promise<void> {
  if (update.callback_query) {
    const cq = update.callback_query
    const userId = cq.from.id
    const chatId = cq.message?.chat.id ?? userId
    const data = cq.data ?? ''
    try {
      if (data === 'pause_all') {
        const n = pauseAllForUser(userId)
        await answerCallbackQuery({
          callbackQueryId: cq.id,
          text: n ? `На паузе: ${n}` : 'Нечего ставить на паузу',
        })
        await sendMessage({
          chatId,
          text: n
            ? n === 1
              ? '⏸ Интервал на паузе.'
              : `⏸ На паузе: ${n}`
            : 'Нет бегущих интервалов.',
        })
        return
      }
      if (data.startsWith('pause:')) {
        const id = data.slice('pause:'.length)
        const ok = pauseOne(userId, id)
        await answerCallbackQuery({
          callbackQueryId: cq.id,
          text: ok ? 'На паузе' : 'Не найдено',
        })
        if (ok) {
          await sendMessage({ chatId, text: '⏸ Интервал на паузе.' })
        }
        return
      }
      await answerCallbackQuery({ callbackQueryId: cq.id })
    } catch (error) {
      console.error('[bot] callback failed', error)
      try {
        await answerCallbackQuery({ callbackQueryId: cq.id, text: 'Ошибка', showAlert: true })
      } catch {
        // ignore
      }
    }
    return
  }

  const msg = update.message
  if (!msg?.text) return
  const userId = msg.from?.id ?? msg.chat.id
  const chatId = msg.chat.id
  const text = msg.text.trim()

  if (text === '/pause' || text.startsWith('/pause@') || text === '/pause_all') {
    const n = pauseAllForUser(userId)
    await sendMessage({
      chatId,
      text: n
        ? n === 1
          ? '⏸ Интервал на паузе.'
          : `⏸ На паузе: ${n}`
        : 'Нет бегущих интервалов.',
      replyMarkup: {
        inline_keyboard: [[{ text: '⏸ Пауза', callback_data: 'pause_all' }]],
      },
    })
    return
  }

  if (text === '/start' || text.startsWith('/start@')) {
    await sendMessage({
      chatId,
      text:
        'NasTask бот: /pause — пауза бегущего интервала. ' +
        'Вс 19:00 Minsk — дайджест незаполненных.',
    })
  }
}

export function startBotPolling(): void {
  if (!config.botEnabled || !config.botToken) {
    console.log('[bot] polling skipped (need BOT_ENABLED=true and BOT_TOKEN)')
    return
  }
  stopped = false
  console.log('[bot] long polling started')

  const loop = async () => {
    while (!stopped) {
      try {
        const updates = await getUpdates()
        for (const update of updates) {
          offset = update.update_id + 1
          try {
            await handleUpdate(update)
          } catch (error) {
            console.error('[bot] handle update failed', error)
          }
        }
      } catch (error) {
        console.error('[bot] getUpdates error', error)
        await new Promise((r) => setTimeout(r, 3000))
      }
    }
  }

  void loop()
}

export function stopBotPolling(): void {
  stopped = true
}
