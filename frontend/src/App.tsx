import { useCallback, useEffect, useState } from 'react'
import { AppErrorBoundary } from '@/components/AppErrorBoundary'
import { AppLayout } from '@/components/layout/AppLayout'
import { AppTabProvider } from '@/components/layout/AppTabContext'
import { MemoryOpenProvider } from '@/components/memory/MemoryOpenContext'
import { SplashDoneProvider } from '@/components/splash/SplashDoneContext'
import { SplashScreen } from '@/components/splash/SplashScreen'
import { shouldSkipSplash } from '@/lib/splashPlatform'

export default function App() {
  const [splashDone, setSplashDone] = useState(() => shouldSkipSplash())

  useEffect(() => {
    if (splashDone) {
      document.documentElement.dataset.splash = 'done'
      return
    }
    document.documentElement.dataset.splash = 'active'
    return () => {
      if (document.documentElement.dataset.splash !== 'done') {
        delete document.documentElement.dataset.splash
      }
    }
  }, [splashDone])

  // Last-resort: if splash never completes (broken WebView timers), show app
  useEffect(() => {
    if (splashDone) return
    const id = window.setTimeout(() => {
      document.documentElement.dataset.splash = 'done'
      setSplashDone(true)
    }, 3500)
    return () => window.clearTimeout(id)
  }, [splashDone])

  const onSplashComplete = useCallback(() => {
    document.documentElement.dataset.splash = 'done'
    setSplashDone(true)
  }, [])

  return (
    <AppErrorBoundary>
      <SplashDoneProvider value={splashDone}>
        <AppTabProvider>
          <MemoryOpenProvider>
            <div className="app-shell min-h-dvh min-h-[100vh]">
              <AppLayout />
            </div>
            {!splashDone && <SplashScreen onComplete={onSplashComplete} />}
          </MemoryOpenProvider>
        </AppTabProvider>
      </SplashDoneProvider>
    </AppErrorBoundary>
  )
}
