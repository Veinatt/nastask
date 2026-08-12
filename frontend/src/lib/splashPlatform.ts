/**
 * macOS Telegram WKWebView (and similar) often breaks splash FLIP/opacity
 * into a permanent blank beige screen. Skip splash there entirely.
 */
export function shouldSkipSplash(): boolean {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return true
    }
  } catch {
    // ignore
  }

  try {
    const platform = String(
      (
        window as unknown as {
          Telegram?: { WebApp?: { platform?: string } }
        }
      ).Telegram?.WebApp?.platform ?? '',
    ).toLowerCase()
    if (platform === 'macos') return true
  } catch {
    // ignore
  }

  try {
    const ua = navigator.userAgent || ''
    const isMac = /Macintosh|Mac OS X/i.test(ua)
    const isTelegram = /Telegram/i.test(ua)
    // Telegram Desktop / Mini App on Mac (WKWebView)
    if (isMac && isTelegram) return true
  } catch {
    // ignore
  }

  return false
}
