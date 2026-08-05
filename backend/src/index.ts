import cors from 'cors'
import express from 'express'
import { assertRuntimeConfig, config } from './config'
import { closeDb, initDb } from './db'
import { intervalsRouter } from './routes/intervals'
import {
  categoriesRouter,
  descriptionsRouter,
  expenseArticlesRouter,
  unitsRouter,
} from './routes/dicts'
import { settingsRouter } from './routes/settings'
import { expensesRouter } from './routes/expenses'

async function main(): Promise<void> {
  console.log('[boot] ===== NasTask backend starting =====')
  console.log(`[boot] cwd=${process.cwd()}`)
  console.log(`[boot] node=${process.version}`)

  console.log('[boot] stage 1/4 — config')
  assertRuntimeConfig()

  console.log('[boot] stage 2/4 — database')
  initDb()

  console.log('[boot] stage 3/4 — express app')
  const app = express()
  app.use(cors({ origin: '*' }))
  app.use(express.json({ limit: '1mb' }))

  app.get('/health', (_req, res) => {
    res.json({ ok: true, port: config.port })
  })

  app.use('/api/intervals', intervalsRouter)
  app.use('/api/categories', categoriesRouter)
  app.use('/api/descriptions', descriptionsRouter)
  app.use('/api/units', unitsRouter)
  app.use('/api/expense-articles', expenseArticlesRouter)
  app.use('/api/settings', settingsRouter)
  app.use('/api/expenses', expensesRouter)

  app.use(
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('[http] unhandled error', err)
      res.status(500).json({ success: false, error: 'Internal server error' })
    },
  )
  console.log(
    '[boot] routes: /health /api/intervals /api/categories /api/descriptions /api/units /api/expense-articles /api/settings /api/expenses',
  )

  console.log('[boot] stage 4/4 — HTTP listen')
  const server = app.listen(config.port, () => {
    console.log(`[boot] HTTP READY http://localhost:${config.port}`)
    console.log('[boot] ===== startup complete =====')
  })

  server.on('error', (error) => {
    console.error('[boot] HTTP listen failed', error)
    process.exit(1)
  })

  const shutdown = (signal: string) => {
    console.log(`[shutdown] signal=${signal}`)
    server.close(() => {
      closeDb()
      console.log('[shutdown] done')
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 5000).unref()
  }

  process.once('SIGINT', () => shutdown('SIGINT'))
  process.once('SIGTERM', () => shutdown('SIGTERM'))
}

main().catch((error) => {
  console.error('[fatal] startup aborted', error)
  process.exit(1)
})
