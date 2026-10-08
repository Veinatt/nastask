import type { Request, Response } from 'express'
import { Router } from 'express'
import * as XLSX from 'xlsx'
import { telegramAuth } from '../middleware/telegramAuth'
import { buildTaxReport, type TaxReport } from '../services/taxReport'
import { buildUserExport } from '../services/userExport'
import { sendDocumentToUser } from '../services/telegramSend'
import {
  createDownloadToken,
  verifyDownloadToken,
  type DownloadKind,
} from '../utils/downloadToken'

export const downloadRouter = Router()

type DownloadBody = {
  kind?: DownloadKind
  year?: number
  month?: number
  groupBy?: string
}

function publicApiBase(req: Request): string {
  const fromEnv = (process.env.PUBLIC_API_URL ?? '').trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv
  const proto = (req.get('x-forwarded-proto') ?? req.protocol).split(',')[0]?.trim()
  const host = (req.get('x-forwarded-host') ?? req.get('host') ?? '').split(',')[0]?.trim()
  return `${proto}://${host}`
}

function fileNameFor(kind: DownloadKind, payload: { year?: number; month?: number }): string {
  const stamp = new Date().toISOString().slice(0, 10)
  if (kind === 'json-backup') return `nastask-backup-${stamp}.json`
  const ym = `${payload.year}-${String(payload.month).padStart(2, '0')}`
  if (kind === 'tax-csv') return `nastask-tasks-${ym}.xlsx`
  return `nastask-tax-${ym}.xlsx`
}

function setDownloadHeaders(res: Response, fileName: string, contentType: string): void {
  res.setHeader('Content-Type', contentType)
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition')
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const JSON_MIME = 'application/json; charset=utf-8'

function taxReportXlsx(report: TaxReport): Buffer {
  const rows = report.rows.map((r) => ({
    Категория: r.categoryName ?? '',
    Описание: r.descriptionName ?? '',
    Количество: Math.round(r.quantity * 1000) / 1000,
    Единица: r.unitName ?? '',
  }))
  const sheet = XLSX.utils.json_to_sheet(rows)
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Задачи')
  const written = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer | Uint8Array
  return Buffer.isBuffer(written) ? written : Buffer.from(written)
}

function parseDownloadRequest(body: DownloadBody): {
  kind: DownloadKind
  year?: number
  month?: number
  groupBy: string
} {
  const kind = body.kind
  if (kind !== 'json-backup' && kind !== 'tax-csv' && kind !== 'tax-xlsx') {
    throw Object.assign(new Error('Invalid download kind'), { status: 400 })
  }

  if (kind === 'json-backup') {
    return { kind, groupBy: 'both' }
  }

  const year = Number(body.year)
  const month = Number(body.month)
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw Object.assign(new Error('year and month required'), { status: 400 })
  }

  return {
    kind,
    year,
    month,
    groupBy: String(body.groupBy ?? 'both'),
  }
}

function buildDownloadFile(
  userId: number,
  body: DownloadBody,
): { bytes: Buffer; fileName: string; contentType: string; caption: string } {
  const parsed = parseDownloadRequest(body)

  if (parsed.kind === 'json-backup') {
    const fileName = fileNameFor(parsed.kind, {})
    const data = buildUserExport(userId)
    return {
      bytes: Buffer.from(`${JSON.stringify(data, null, 2)}\n`, 'utf8'),
      fileName,
      contentType: JSON_MIME,
      caption: fileName,
    }
  }

  const year = Number(parsed.year)
  const month = Number(parsed.month)
  const fileName = fileNameFor(parsed.kind, { year, month })
  const report = buildTaxReport(userId, year, month, parsed.groupBy)
  const xlsx = taxReportXlsx(report)
  return {
    bytes: xlsx,
    fileName,
    contentType: XLSX_MIME,
    caption: fileName,
  }
}

downloadRouter.post('/token', telegramAuth, (req, res) => {
  try {
    const userId = req.telegramUserId
    if (userId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }

    const body = (req.body ?? {}) as DownloadBody
    const parsed = parseDownloadRequest(body)

    const tokenPayload: Omit<import('../utils/downloadToken').DownloadTokenPayload, 'exp'> =
      parsed.kind === 'json-backup'
        ? { userId, kind: parsed.kind }
        : {
            userId,
            kind: parsed.kind,
            year: parsed.year!,
            month: parsed.month!,
            groupBy: parsed.groupBy,
          }
    const token = createDownloadToken(tokenPayload)
    const url = `${publicApiBase(req)}/api/download/file?token=${encodeURIComponent(token)}`
    const fileName =
      parsed.kind === 'json-backup'
        ? fileNameFor(parsed.kind, {})
        : fileNameFor(parsed.kind, { year: parsed.year!, month: parsed.month! })

    console.log(`[api:download] token kind=${parsed.kind} userId=${userId} file=${fileName}`)

    res.json({ success: true, url, fileName })
  } catch (error) {
    const status = Number((error as { status?: number }).status)
    if (status === 400) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Bad request',
      })
      return
    }
    console.error('[api:download] token failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

downloadRouter.post('/send', telegramAuth, async (req, res) => {
  const userId = req.telegramUserId
  if (userId == null) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }

  try {
    const body = (req.body ?? {}) as DownloadBody
    const { bytes, fileName, caption } = buildDownloadFile(userId, body)
    console.log(`[api:download] send kind=${body.kind} userId=${userId} file=${fileName}`)
    await sendDocumentToUser({ userId, fileName, bytes, caption })
    res.json({ success: true, via: 'telegram', fileName })
  } catch (error) {
    const status = Number((error as { status?: number }).status)
    if (status === 400) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Bad request',
      })
      return
    }
    const message = error instanceof Error ? error.message : 'Send failed'
    console.error('[api:download] send failed', error)
    res.status(500).json({ success: false, error: message })
  }
})

downloadRouter.get('/file', (req, res) => {
  try {
    const raw = req.query.token
    const token = typeof raw === 'string' ? raw : ''
    const payload = verifyDownloadToken(token)
    if (!payload) {
      res.status(401).json({ success: false, error: 'Invalid or expired download link' })
      return
    }

    const body: DownloadBody = { kind: payload.kind }
    if (payload.year != null) body.year = payload.year
    if (payload.month != null) body.month = payload.month
    if (payload.groupBy != null) body.groupBy = payload.groupBy
    const built = buildDownloadFile(payload.userId, body)
    console.log(
      `[api:download] file kind=${payload.kind} userId=${payload.userId} file=${built.fileName}`,
    )

    setDownloadHeaders(res, built.fileName, built.contentType)
    res.setHeader('Content-Length', String(built.bytes.length))
    res.end(built.bytes)
  } catch (error) {
    const status = Number((error as { status?: number }).status)
    if (status === 400) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Bad request',
      })
      return
    }
    console.error('[api:download] file failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})
