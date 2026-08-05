import { useEffect, useState } from 'react'
import {
  init,
  initData,
  miniApp,
  restoreInitData,
  themeParams,
  viewport,
} from '@telegram-apps/sdk-react'
import {
  THEME_CHANGE_EVENT,
  applyTheme,
  getThemePreference,
} from '@/lib/theme'

type TelegramUser = {
  id: number
  firstName?: string
  lastName?: string
  username?: string
}

const DEV_FAKE_USER_ID = Number(import.meta.env.VITE_DEV_USER_ID ?? 334808852)

function signalNativeReady(): void {
  try {
    const tg = (
      window as unknown as { Telegram?: { WebApp?: { ready?: () => void } } }
    ).Telegram?.WebApp
    tg?.ready?.()
  } catch {
    // ignore
  }
}

function readNativeUser(): TelegramUser | null {
  try {
    const unsafe = (
      window as unknown as {
        Telegram?: {
          WebApp?: {
            initDataUnsafe?: {
              user?: {
                id?: number
                first_name?: string
                last_name?: string
                username?: string
              }
            }
          }
        }
      }
    ).Telegram?.WebApp?.initDataUnsafe?.user
    if (unsafe?.id != null && Number.isFinite(unsafe.id)) {
      return {
        id: unsafe.id,
        firstName: unsafe.first_name,
        lastName: unsafe.last_name,
        username: unsafe.username,
      }
    }
  } catch {
    // ignore
  }
  return null
}

function tryInitTelegram(): boolean {
  try {
    init()

    if (themeParams.mount.isAvailable()) {
      themeParams.mount()
      themeParams.bindCssVars.ifAvailable()
    }
    if (miniApp.mount.isAvailable()) {
      void miniApp.mount()
    }

    try {
      restoreInitData()
    } catch {
      // ignore
    }

    if (viewport.mount.isAvailable()) {
      void viewport
        .mount()
        .then(() => {
          viewport.bindCssVars.ifAvailable()
          viewport.expand.ifAvailable()
        })
        .catch(() => {
          // ignore viewport errors on odd clients
        })
    }

    miniApp.ready.ifAvailable()
    signalNativeReady()
    return true
  } catch (e) {
    console.warn('[telegram] init failed', e)
    signalNativeReady()
    return false
  }
}

function readSdkUser(): TelegramUser | null {
  try {
    const u = initData.user()
    if (!u) return null
    return {
      id: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
      username: u.username,
    }
  } catch {
    return null
  }
}

function readInitDataRaw(): string | null {
  try {
    const raw = initData.raw()
    if (raw && String(raw).trim()) return String(raw)
  } catch {
    // ignore
  }
  try {
    const raw = (
      window as unknown as { Telegram?: { WebApp?: { initData?: string } } }
    ).Telegram?.WebApp?.initData
    if (raw && String(raw).trim()) return String(raw)
  } catch {
    // ignore
  }
  return null
}

/**
 * Safe Telegram hook: no module-level SDK init, no useSignal
 * (signals can crash the whole tree if init() never succeeded).
 */
export function useTelegram() {
  const [inTelegram, setInTelegram] = useState(false)
  const [user, setUser] = useState<TelegramUser | null>(() => {
    if (import.meta.env.DEV) {
      return {
        id: DEV_FAKE_USER_ID,
        firstName: 'Dev',
        lastName: 'User',
        username: 'devuser',
      }
    }
    return null
  })
  const [initDataRaw, setInitDataRaw] = useState<string | null>(null)
  const [isDark, setIsDark] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    const ok = tryInitTelegram()
    setInTelegram(ok)

    const refreshUser = () => {
      const next = readSdkUser() ?? readNativeUser()
      if (next) {
        setUser(next)
      } else if (import.meta.env.DEV) {
        setUser({
          id: DEV_FAKE_USER_ID,
          firstName: 'Dev',
          lastName: 'User',
          username: 'devuser',
        })
      }
      setInitDataRaw(readInitDataRaw())
      try {
        if (ok) setIsDark(Boolean(miniApp.isDark()))
      } catch {
        // ignore
      }
    }

    refreshUser()
    applyTheme(getThemePreference(), ok ? isDark ?? null : null)

    const apply = () => {
      let telegramDark: boolean | null = null
      try {
        if (ok) telegramDark = Boolean(miniApp.isDark())
      } catch {
        telegramDark = null
      }
      applyTheme(getThemePreference(), telegramDark)
      refreshUser()
    }

    window.addEventListener(THEME_CHANGE_EVENT, apply)

    let cleanupMq: (() => void) | undefined
    if (!ok) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const onChange = () => apply()
      mq.addEventListener('change', onChange)
      cleanupMq = () => mq.removeEventListener('change', onChange)
    }

    // Late WebView injection — retry a few times
    const t1 = window.setTimeout(refreshUser, 300)
    const t2 = window.setTimeout(refreshUser, 1000)

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, apply)
      cleanupMq?.()
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    inTelegram,
    user,
    userId: user?.id ?? null,
    initDataRaw,
    isDark: inTelegram ? isDark : undefined,
  }
}
