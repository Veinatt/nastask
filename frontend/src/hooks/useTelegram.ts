import { useEffect, useMemo, useState } from 'react'
import {
  init,
  initData,
  miniApp,
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

function tryInitTelegram(): boolean {
  try {
    init()

    if (miniApp.mount.isAvailable()) {
      void miniApp.mount()
    }
    if (themeParams.mount.isAvailable()) {
      themeParams.mount()
      themeParams.bindCssVars.ifAvailable()
    }
    if (viewport.mount.isAvailable()) {
      void viewport.mount().then(() => {
        viewport.bindCssVars.ifAvailable()
        viewport.expand.ifAvailable()
      })
    }

    return true
  } catch {
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
