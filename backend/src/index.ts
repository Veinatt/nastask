import cors from 'cors'
import express from 'express'
import { assertRuntimeConfig, config } from './config'
import { closeDb, initDb } from './db'
import { isBotPolling, launchBot, stopBot } from './bot/telegram'
import { startReminderCron, stopReminderCron } from './jobs/reminderCron'
import { remindersRouter } from './routes/reminders'
import { settingsRouter } from './routes/settings'
import { tasksRouter } from './routes/tasks'

async function main(): Promise<void> {
  console.log('[boot] ===== NasTask backend starting =====')
  console.log(`[boot] cwd=${process.cwd()}`)
  console.log(`[boot] node=${process.version}`)

  console.log('[boot] stage 1/6 — config')
  assertRuntimeConfig()
  if (config.webappUrl) {
    console.log(`[boot] WEBAPP_URL=${config.webappUrl}`)
  }

  console.log('[boot] stage 2/6 — database')
  initDb()

  console.log('[boot] stage 3/6 — express app')
  const app = express()
  app.use(cors({ origin: '*' }))
  app.use(express.json({ limit: '1mb' }))

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      botPolling: isBotPolling(),
      port: config.port,
    })
  })

  app.use('/api/tasks', tasksRouter)
  app.use('/api/reminders', remindersRouter)
  app.use('/api/settings', settingsRouter)

  app.use(
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('[http] unhandled error', err)
      res.status(500).json({ success: false, error: 'Internal server error' })
    },
  )
  console.log('[boot] express routes mounted (/health, /api/tasks, /api/reminders, /api/settings)')

  console.log('[boot] stage 4/6 — telegram bot')
  const bot = await launchBot()
  console.log(`[boot] bot status: ${bot ? 'running' : 'disabled'}`)

  console.log('[boot] stage 5/6 — cron')
  startReminderCron()

  console.log('[boot] stage 6/6 — HTTP listen')
  const server = app.listen(config.port, () => {
    console.log(`[boot] HTTP READY http://localhost:${config.port}`)
    console.log(`[boot] health: http://localhost:${config.port}/health`)
    console.log('[boot] ===== startup complete =====')
  })

  server.on('error', (error) => {
    console.error('[boot] HTTP listen failed', error)
    process.exit(1)
  })

  const shutdown = async (signal: string) => {
    console.log(`[shutdown] signal=${signal}`)
    stopReminderCron()
    await stopBot()
    server.close(() => {
      closeDb()
      console.log('[shutdown] done')
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 5000).unref()
  }

  process.once('SIGINT', () => void shutdown('SIGINT'))
  process.once('SIGTERM', () => void shutdown('SIGTERM'))
}

main().catch((error) => {
  console.error('[fatal] startup aborted', error)
  process.exit(1)
})
