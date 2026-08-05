import { useCallback, useEffect, useState } from 'react'
import { AppErrorBoundary } from '@/components/AppErrorBoundary'
import { AppLayout } from '@/components/layout/AppLayout'
import { AppTabProvider } from '@/components/layout/AppTabContext'
import { SplashDoneProvider } from '@/components/splash/SplashDoneContext'
import { SplashScreen } from '@/components/splash/SplashScreen'

export default function App() {
  const [splashDone, setSplashDone] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.splash = 'active'
    return () => {
      delete document.documentElement.dataset.splash
    }
  }, [])

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
