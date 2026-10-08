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
