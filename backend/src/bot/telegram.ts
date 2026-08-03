import { Markup, Telegraf } from 'telegraf'
import { config } from '../config'

let bot: Telegraf | null = null
let polling = false

export function getBot(): Telegraf | null {
  return bot
}

export function isBotPolling(): boolean {
  return polling && bot != null
}

export function createBot(token = config.botToken): Telegraf | null {
  console.log('[boot:bot] 1/4 createBot()')
  if (!token) {
    console.warn('[boot:bot] skipped: BOT_TOKEN not set')
    return null
  }

  console.log(`[boot:bot] 2/4 Telegraf instance (token length ${token.length})`)
  bot = new Telegraf(token)

  bot.start(async (ctx) => {
    const name = ctx.from.first_name || 'коллега'
    console.log(`[bot] /start from userId=${ctx.from.id}`)
    const lines = [
      `Привет, ${name}!`,
      'Я бот NasTask — буду напоминать о незакрытых задачах.',
      'Открой Mini App, чтобы вести задачи.',
    ]

    if (config.webappUrl) {
      await ctx.reply(
        lines.join('\n'),
        Markup.keyboard([
          Markup.button.webApp('Открыть NasTask', config.webappUrl),
        ]).resize(),
      )
      return
    }

    await ctx.reply(lines.join('\n'))
  })

  bot.catch((error) => {
    console.error('[bot] unhandled error', error)
  })

  return bot
}

/**
 * Telegraf's launch() Promise resolves only when the bot STOPS.
 * Do not await it, or the rest of the app never boots.
 */
export async function launchBot(): Promise<Telegraf | null> {
  const instance = createBot()
  if (!instance) return null

  console.log('[boot:bot] 3/4 getMe() — verify token with Telegram API')
  try {
    const me = await instance.telegram.getMe()
    console.log(
      `[boot:bot] telegram ok: @${me.username ?? 'unknown'} id=${me.id}`,
    )
  } catch (error) {
    console.error('[boot:bot] getMe() failed — check BOT_TOKEN', error)
    bot = null
    return null
  }

  console.log('[boot:bot] 4/4 starting long polling (non-blocking)')
  polling = true
  void instance
    .launch()
    .then(() => {
      polling = false
      console.log('[bot] polling stopped')
    })
    .catch((error: unknown) => {
      polling = false
      console.error('[bot] launch/polling error', error)
    })

  console.log('[boot:bot] READY — polling in background')
  return instance
}

export async function sendReminder(
  userId: number,
  text: string,
  meta?: { taskId?: string; title?: string },
): Promise<boolean> {
  const label = meta?.title ? `«${meta.title}»` : 'напоминание'
  const taskPart = meta?.taskId ? ` taskId=${meta.taskId}` : ''

  if (!bot) {
    console.warn(`[бот] ОТПРАВКА ПРОПУЩЕНА ${label}${taskPart} — бот не инициализирован`)
    return false
  }

  try {
    console.log(`[бот] ОТПРАВКА ${label} → userId=${userId}${taskPart}`)
    await bot.telegram.sendMessage(userId, text)
    console.log(`[бот] ОТПРАВЛЕНО ${label} → userId=${userId}${taskPart}`)
    return true
  } catch (error) {
    console.error(`[бот] ОШИБКА ОТПРАВКИ ${label} → userId=${userId}${taskPart}`, error)
    return false
  }
}

export async function stopBot(): Promise<void> {
  if (!bot) {
    console.log('[boot:bot] stop: nothing to stop')
    return
  }
  console.log('[boot:bot] stopping…')
  bot.stop('shutdown')
  polling = false
  bot = null
  console.log('[boot:bot] stopped')
}
