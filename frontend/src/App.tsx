import { useCallback, useEffect, useState } from 'react'
import { AppErrorBoundary } from '@/components/AppErrorBoundary'
import { AppLayout } from '@/components/layout/AppLayout'
import { AppTabProvider } from '@/components/layout/AppTabContext'
import { SplashDoneProvider } from '@/components/splash/SplashDoneContext'
import { SplashScreen } from '@/components/splash/SplashScreen'

export default function App() {
  const [splashDone, setSplashDone] = useState(false)

  useEffect(() => {
    // Only hide brand title while splash is actually running
    if (!splashDone) {
      document.documentElement.dataset.splash = 'active'
    }
    return () => {
      // Keep 'done' sticky if we already finished (avoid flash of hidden title)
      if (document.documentElement.dataset.splash !== 'done') {
        delete document.documentElement.dataset.splash
      }
    }
  }, [splashDone])

  // Last-resort: if splash never completes (broken WebView timers), show app anyway
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
          <div className="min-h-dvh">
            <AppLayout />
          </div>
          {!splashDone && <SplashScreen onComplete={onSplashComplete} />}
        </AppTabProvider>
      </SplashDoneProvider>
    </AppErrorBoundary>
  )
}
