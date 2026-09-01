import type { Request, Response } from 'express'
import { Router } from 'express'
import * as XLSX from 'xlsx'
import { telegramAuth } from '../middleware/telegramAuth'
import { buildTaxReport, taxReportToCsv } from '../services/taxReport'
import { buildUserExport } from '../services/userExport'
import {
  createDownloadToken,
  verifyDownloadToken,
  type DownloadKind,
} from '../utils/downloadToken'

export const downloadRouter = Router()

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
  if (kind === 'tax-csv') return `nastask-tasks-${ym}.csv`
  return `nastask-tax-${ym}.xlsx`
}

function setDownloadHeaders(res: Response, fileName: string, contentType: string): void {
  res.setHeader('Content-Type', contentType)
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
  res.setHeader('Access-Control-Allow-Origin', 'https://web.telegram.org')
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition')
}

downloadRouter.post('/token', telegramAuth, (req, res) => {
  try {
    const userId = req.telegramUserId
    if (userId == null) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }

    const body = (req.body ?? {}) as {
      kind?: DownloadKind
      year?: number
      month?: number
      groupBy?: string
    }
    const kind = body.kind
    if (kind !== 'json-backup' && kind !== 'tax-csv' && kind !== 'tax-xlsx') {
      res.status(400).json({ success: false, error: 'Invalid download kind' })
      return
    }

    if (kind !== 'json-backup') {
      const year = Number(body.year)
      const month = Number(body.month)
      if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
        res.status(400).json({ success: false, error: 'year and month required' })
        return
      }
    }

    const groupBy = String(body.groupBy ?? 'both')

    const tokenPayload: Omit<import('../utils/downloadToken').DownloadTokenPayload, 'exp'> =
      kind === 'json-backup'
        ? { userId, kind }
        : {
            userId,
            kind,
            year: Number(body.year),
            month: Number(body.month),
            groupBy,
          }
    const token = createDownloadToken(tokenPayload)
    const url = `${publicApiBase(req)}/api/download/file?token=${encodeURIComponent(token)}`
    const fileName =
      kind === 'json-backup'
        ? fileNameFor(kind, {})
        : fileNameFor(kind, { year: Number(body.year), month: Number(body.month) })

    console.log(`[api:download] token kind=${kind} userId=${userId} file=${fileName}`)

    res.json({ success: true, url, fileName })
  } catch (error) {
    console.error('[api:download] token failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
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

    const fileName = fileNameFor(payload.kind, payload)
    console.log(`[api:download] file kind=${payload.kind} userId=${payload.userId} file=${fileName}`)

    if (payload.kind === 'json-backup') {
      const data = buildUserExport(payload.userId)
      setDownloadHeaders(res, fileName, 'application/json; charset=utf-8')
      res.send(`${JSON.stringify(data, null, 2)}\n`)
      return
    }

    const year = Number(payload.year)
    const month = Number(payload.month)
    if (!Number.isFinite(year) || !Number.isFinite(month)) {
      res.status(400).json({ success: false, error: 'Invalid report params' })
      return
    }

    const report = buildTaxReport(
      payload.userId,
      year,
      month,
      payload.groupBy ?? 'both',
    )

    if (payload.kind === 'tax-csv') {
      setDownloadHeaders(res, fileName, 'text/csv; charset=utf-8')
      res.send(taxReportToCsv(report))
      return
    }

    const rows = report.rows.map((r) => ({
      category: r.categoryName ?? '',
      description: r.descriptionName ?? '',
      quantity: Math.round(r.quantity * 1000) / 1000,
      unit: r.unitName,
    }))
    const sheet = XLSX.utils.json_to_sheet(rows)
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, 'Tax')
    const buffer = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    setDownloadHeaders(
      res,
      fileName,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    res.send(buffer)
  } catch (error) {
    console.error('[api:download] file failed', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})
