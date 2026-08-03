import { useEffect, useMemo, useState } from 'react'
import {
  init,
  initData,
  miniApp,
  themeParams,
  viewport,
  useSignal,
} from '@telegram-apps/sdk-react'

type TelegramUser = {
  id: number
  firstName?: string
  lastName?: string
  username?: string
}

function applyColorScheme(isDark: boolean) {
  document.documentElement.classList.toggle('dark', isDark)
}

function applySystemTheme() {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  applyColorScheme(mq.matches)
  const listener = (event: MediaQueryListEvent) => applyColorScheme(event.matches)
  mq.addEventListener('change', listener)
  return () => mq.removeEventListener('change', listener)
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
if (!telegramReady) {
  applyColorScheme(window.matchMedia('(prefers-color-scheme: dark)').matches)
}

const DEV_FAKE_USER_ID = Number(import.meta.env.VITE_DEV_USER_ID ?? 334808852)

export function useTelegram() {
  const [inTelegram] = useState(telegramReady)
  const tgUser = useSignal(initData.user)
  const isDark = useSignal(miniApp.isDark)

  useEffect(() => {
    if (!inTelegram) {
      return applySystemTheme()
    }
    applyColorScheme(Boolean(miniApp.isDark()))
    return undefined
  }, [inTelegram])

  useEffect(() => {
    if (!inTelegram) return
    applyColorScheme(Boolean(isDark))
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
