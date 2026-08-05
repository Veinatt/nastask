import { useEffect, useMemo, useState } from 'react'
import {
  init,
  initData,
  miniApp,
  restoreInitData,
  themeParams,
  viewport,
  useSignal,
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

function applyResolvedTheme(inTelegram: boolean, telegramIsDark?: boolean | null) {
  const preference = getThemePreference()
  const systemDark = inTelegram
    ? Boolean(telegramIsDark ?? miniApp.isDark())
    : null
  applyTheme(preference, systemDark)
}

/** Hide Telegram's native loading placeholder even if SDK init failed. */
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

function tryInitTelegram(): boolean {
  try {
    init()

    // themeParams before miniApp (SDK docs)
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
      // outside Telegram / no launch params yet
    }

    if (viewport.mount.isAvailable()) {
      void viewport.mount().then(() => {
        viewport.bindCssVars.ifAvailable()
        viewport.expand.ifAvailable()
      })
    }

    // Critical for Main App / mobile: otherwise Telegram keeps its loader forever
    miniApp.ready.ifAvailable()
    signalNativeReady()

    return true
  } catch {
    signalNativeReady()
    return false
  }
}

/** Init once at module load so signals are safe to read in hooks. */
const telegramReady = tryInitTelegram()
applyResolvedTheme(telegramReady, telegramReady ? Boolean(miniApp.isDark()) : null)

const DEV_FAKE_USER_ID = Number(import.meta.env.VITE_DEV_USER_ID ?? 334808852)

export function useTelegram() {
  const [inTelegram] = useState(telegramReady)
  const tgUser = useSignal(initData.user)
  const isDark = useSignal(miniApp.isDark)

  useEffect(() => {
    // Re-signal ready after first React paint (covers late WebView injection)
    miniApp.ready.ifAvailable()
    signalNativeReady()
    try {
      restoreInitData()
    } catch {
      // ignore
    }

    const apply = () => {
      applyResolvedTheme(inTelegram, inTelegram ? Boolean(miniApp.isDark()) : null)
    }
    apply()

    window.addEventListener(THEME_CHANGE_EVENT, apply)

    let cleanupMq: (() => void) | undefined
    if (!inTelegram) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const onChange = () => apply()
      mq.addEventListener('change', onChange)
      cleanupMq = () => mq.removeEventListener('change', onChange)
    }

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, apply)
      cleanupMq?.()
    }
  }, [inTelegram, isDark])

  const user = useMemo<TelegramUser | null>(() => {
    // Prefer real Telegram user even on localhost (e.g. Telegram Desktop WebView)
    if (tgUser) {
      return {
        id: tgUser.id,
        firstName: tgUser.first_name,
        lastName: tgUser.last_name,
        username: tgUser.username,
      }
    }

    // Browser DEV without Telegram — fake user for local API testing
    if (import.meta.env.DEV) {
      return {
        id: DEV_FAKE_USER_ID,
        firstName: 'Dev',
        lastName: 'User',
        username: 'devuser',
      }
    }

    return null
  }, [tgUser])

  const initDataRaw =
    typeof initData.raw === 'function' ? initData.raw() ?? null : null

  return {
    inTelegram,
    user,
    userId: user?.id ?? null,
    initDataRaw,
    isDark: inTelegram ? Boolean(isDark) : undefined,
  }
}
