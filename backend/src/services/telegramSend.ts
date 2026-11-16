import { config } from '../config'

function mimeFor(fileName: string): string {
  if (fileName.endsWith('.pdf')) return 'application/pdf'
  if (fileName.endsWith('.xlsx')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }
  if (fileName.endsWith('.csv')) return 'text/csv; charset=utf-8'
  if (fileName.endsWith('.json')) return 'application/json'
  return 'application/octet-stream'
}

async function telegramApi<T = unknown>(
  method: string,
  body: Record<string, unknown>,
): Promise<T> {
  const token = config.botToken
  if (!token) throw new Error('BOT_TOKEN is not configured')
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = (await response.json()) as {
    ok?: boolean
    description?: string
    result?: T
  }
  if (!response.ok || !payload.ok) {
    throw new Error(payload.description ?? `${method} failed (${response.status})`)
  }
  return payload.result as T
}

export type InlineKeyboardButton = {
  text: string
  callback_data?: string
  url?: string
  web_app?: { url: string }
}

export async function sendMessage(input: {
  chatId: number | string
  text: string
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'
  replyMarkup?: { inline_keyboard: InlineKeyboardButton[][] }
}): Promise<void> {
  await telegramApi('sendMessage', {
    chat_id: input.chatId,
    text: input.text,
    parse_mode: input.parseMode,
    reply_markup: input.replyMarkup,
    disable_web_page_preview: true,
  })
}

export async function answerCallbackQuery(input: {
  callbackQueryId: string
  text?: string
  showAlert?: boolean
}): Promise<void> {
  await telegramApi('answerCallbackQuery', {
    callback_query_id: input.callbackQueryId,
    text: input.text,
    show_alert: input.showAlert,
  })
}

export async function sendDocumentToUser(input: {
  userId: number
  fileName: string
  bytes: Buffer
  caption?: string
}): Promise<void> {
  const token = config.botToken
  if (!token) throw new Error('BOT_TOKEN is not configured')

  const form = new FormData()
  form.append('chat_id', String(input.userId))
  const bytes = new Uint8Array(input.bytes)
  form.append(
    'document',
    new Blob([bytes], { type: mimeFor(input.fileName) }),
    input.fileName,
  )
  if (input.caption) form.append('caption', input.caption)

  const response = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: 'POST',
    body: form,
  })
  const payload = (await response.json()) as { ok?: boolean; description?: string }
  if (!response.ok || !payload.ok) {
    throw new Error(payload.description ?? `sendDocument failed (${response.status})`)
  }
}
