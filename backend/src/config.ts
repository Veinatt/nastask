import path from 'node:path'
import dotenv from 'dotenv'

const envPath = path.resolve(__dirname, '../.env')
const result = dotenv.config({ path: envPath, override: true })

if (result.error) {
  console.warn(`[config] could not load ${envPath}: ${result.error.message}`)
} else {
  console.log(`[config] loaded ${Object.keys(result.parsed ?? {}).length} var(s) from ${envPath}`)
}

function envFlag(name: string): boolean {
  const raw = (process.env[name] ?? '').trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes'
}

export const config = {
  port: Number(process.env.PORT ?? 5000),
  databasePath: path.resolve(
    process.cwd(),
    process.env.DATABASE_PATH ?? './data/nastask.sqlite',
  ),
  authDevBypass: envFlag('AUTH_DEV_BYPASS'),
  initDataMaxAgeSec: Number(process.env.INIT_DATA_MAX_AGE_SEC ?? 86400),
  /** Optional — only if you still keep BOT_TOKEN for future use */
  botToken: (process.env.BOT_TOKEN ?? '').trim(),
}

export function assertRuntimeConfig(): void {
  if (config.authDevBypass) {
    console.warn('[config] AUTH_DEV_BYPASS=on — API accepts requests without Telegram initData')
  } else {
    console.log('[config] Telegram initData auth enabled for /api/*')
  }
  console.log(`[config] INIT_DATA_MAX_AGE_SEC=${config.initDataMaxAgeSec}`)
  console.log(`[config] DATABASE_PATH=${config.databasePath}`)
}
