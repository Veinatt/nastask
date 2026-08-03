import path from 'node:path'
import dotenv from 'dotenv'

// Always load backend/.env (not process.cwd()), and override empty shell vars
const envPath = path.resolve(__dirname, '../.env')
const result = dotenv.config({ path: envPath, override: true })

if (result.error) {
  console.warn(`[config] could not load ${envPath}: ${result.error.message}`)
} else {
  const loaded = Object.keys(result.parsed ?? {}).length
  console.log(`[config] loaded ${loaded} var(s) from ${envPath}`)
}

function envFlag(name: string): boolean {
  const raw = (process.env[name] ?? '').trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes'
}

export const config = {
  port: Number(process.env.PORT ?? 5000),
  botToken: (process.env.BOT_TOKEN ?? '').trim(),
  webappUrl: (process.env.WEBAPP_URL ?? '').trim(),
  databasePath: path.resolve(
    process.cwd(),
    process.env.DATABASE_PATH ?? './data/nastask.sqlite',
  ),
  /** Allow API without initData (local curl / browser without Telegram). Never enable in prod. */
  authDevBypass: envFlag('AUTH_DEV_BYPASS'),
  /** Max age of initData auth_date in seconds (default 24h). */
  initDataMaxAgeSec: Number(process.env.INIT_DATA_MAX_AGE_SEC ?? 86400),
}

/** Validates env needed for production boot (BOT_TOKEN required to start bot). */
export function assertRuntimeConfig(): void {
  if (!config.botToken) {
    console.warn('[config] BOT_TOKEN is empty — bot and cron sends will fail until set')
  } else {
    console.log(`[config] BOT_TOKEN present (length ${config.botToken.length})`)
  }
  if (!config.webappUrl) {
    console.warn('[config] WEBAPP_URL is empty — /start WebApp button will be omitted')
  }
  if (config.authDevBypass) {
    console.warn('[config] AUTH_DEV_BYPASS=on — API accepts requests without Telegram initData')
  } else {
    console.log('[config] Telegram initData auth enabled for /api/*')
  }
  console.log(`[config] INIT_DATA_MAX_AGE_SEC=${config.initDataMaxAgeSec}`)
}
