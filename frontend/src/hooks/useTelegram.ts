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
    if (!tgUser) return null
    return {
      id: tgUser.id,
      firstName: tgUser.first_name,
      lastName: tgUser.last_name,
      username: tgUser.username,
    }
  }, [tgUser])

  return {
    inTelegram,
    user,
    userId: user?.id ?? null,
    initDataRaw: typeof initData.raw === 'function' ? initData.raw() ?? null : null,
    isDark: inTelegram ? Boolean(isDark) : undefined,
  }
}
