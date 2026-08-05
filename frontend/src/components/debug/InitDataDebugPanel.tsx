import { useEffect, useMemo, useState } from 'react'
import {
  initData,
  initDataRaw,
  restoreInitData,
  retrieveRawInitData,
  retrieveLaunchParams,
  useSignal,
} from '@telegram-apps/sdk-react'
import { API_BASE_URL } from '@/api/client'
import { useTelegram } from '@/hooks/useTelegram'
import { Button } from '@/components/ui/button'

type TgWebApp = {
  initData?: string
  initDataUnsafe?: unknown
  version?: string
  platform?: string
}

function readTelegramWebApp(): TgWebApp | null {
  try {
    const tg = (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram
      ?.WebApp
    return tg ?? null
  } catch {
    return null
  }
}

function safeCall<T>(fn: () => T): { ok: true; value: T } | { ok: false; error: string } {
  try {
    return { ok: true, value: fn() }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

function collectInitDataLog(telegramHook: ReturnType<typeof useTelegram>) {
  const webApp = readTelegramWebApp()
  const hash = typeof window !== 'undefined' ? window.location.hash : ''
  const search = typeof window !== 'undefined' ? window.location.search : ''

  const restore = safeCall(() => {
    restoreInitData()
    return true
  })

  const sdkRawFn = safeCall(() => initData.raw())
  const sdkRawSignal = safeCall(() => initDataRaw())
  const retrieveRaw = safeCall(() => retrieveRawInitData())
  const launchParams = safeCall(() => retrieveLaunchParams())

  const authCandidate =
    (sdkRawFn.ok && sdkRawFn.value && String(sdkRawFn.value).trim()) ||
    (retrieveRaw.ok && retrieveRaw.value && String(retrieveRaw.value).trim()) ||
    (webApp?.initData && String(webApp.initData).trim()) ||
    ''

  return {
    at: new Date().toISOString(),
    href: typeof window !== 'undefined' ? window.location.href : null,
    apiBaseUrl: API_BASE_URL,
    viteMode: import.meta.env.MODE,
    isDev: import.meta.env.DEV,
    hook: {
      inTelegram: telegramHook.inTelegram,
      userId: telegramHook.userId,
      user: telegramHook.user,
      initDataRaw: telegramHook.initDataRaw,
      initDataRawLength: telegramHook.initDataRaw?.length ?? 0,
    },
    windowTelegramWebApp: webApp
      ? {
          present: true,
          version: webApp.version ?? null,
          platform: webApp.platform ?? null,
          initDataLength: webApp.initData?.length ?? 0,
          initDataPreview: webApp.initData
            ? `${webApp.initData.slice(0, 120)}${webApp.initData.length > 120 ? '…' : ''}`
            : null,
          initDataUnsafe: webApp.initDataUnsafe ?? null,
        }
      : { present: false },
    sdk: {
      restoreInitData: restore,
      'initData.raw()': sdkRawFn,
      'initDataRaw()': sdkRawSignal,
      'retrieveRawInitData()': retrieveRaw,
      'retrieveLaunchParams()': launchParams,
    },
    location: {
      hashLength: hash.length,
      hashHasTgWebAppData: hash.includes('tgWebAppData'),
      searchLength: search.length,
      searchHasTgWebAppData: search.includes('tgWebAppData'),
    },
    authHeaderWouldBe: authCandidate
      ? `tma ${authCandidate.slice(0, 80)}${authCandidate.length > 80 ? '…' : ''}`
      : null,
    authHeaderOk: Boolean(authCandidate),
  }
}

export function InitDataDebugPanel() {
  const telegram = useTelegram()
  const rawSignal = useSignal(initDataRaw)
  const [tick, setTick] = useState(0)
  const [copied, setCopied] = useState(false)

  const log = useMemo(
    () => collectInitDataLog(telegram),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick forces refresh; rawSignal tracks SDK updates
    [telegram, tick, rawSignal],
  )

  useEffect(() => {
    console.log('[init-data-debug]', log)
  }, [log])

  const json = useMemo(() => JSON.stringify(log, null, 2), [log])

  return (
    <section className="surface-panel border border-amber-500/40 bg-amber-500/5 px-3 py-3 sm:px-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
          InitData debug
        </h2>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => setTick((n) => n + 1)}
          >
            Refresh
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(json)
                setCopied(true)
                window.setTimeout(() => setCopied(false), 1500)
              } catch {
                // ignore
              }
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>

      <div className="mb-2 grid gap-1 text-xs">
        <p>
          <span className="text-muted-foreground">inTelegram:</span>{' '}
          <b>{String(log.hook.inTelegram)}</b>
        </p>
        <p>
          <span className="text-muted-foreground">userId:</span>{' '}
          <b>{log.hook.userId ?? 'null'}</b>
        </p>
        <p>
          <span className="text-muted-foreground">WebApp.initData length:</span>{' '}
          <b>
            {log.windowTelegramWebApp.present
              ? log.windowTelegramWebApp.initDataLength
              : 'no WebApp'}
          </b>
        </p>
        <p>
          <span className="text-muted-foreground">auth header:</span>{' '}
          <b className={log.authHeaderOk ? 'text-emerald-600' : 'text-destructive'}>
            {log.authHeaderOk ? 'OK' : 'MISSING'}
          </b>
        </p>
        <p className="break-all text-muted-foreground">API: {log.apiBaseUrl}</p>
      </div>

      <pre className="max-h-72 overflow-auto rounded-lg bg-background/80 p-2 text-[10px] leading-snug text-foreground whitespace-pre-wrap break-all">
        {json}
      </pre>
    </section>
  )
}
