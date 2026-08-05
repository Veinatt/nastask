import { useEffect } from 'react'
import { AppErrorBoundary } from '@/components/AppErrorBoundary'
import { AppLayout } from '@/components/layout/AppLayout'
import { AppTabProvider } from '@/components/layout/AppTabContext'
import { SplashDoneProvider } from '@/components/splash/SplashDoneContext'

/** Temporary: splash disabled to debug blank Mini App screen. */
const SPLASH_ENABLED = false

export default function App() {
  const splashDone = !SPLASH_ENABLED

  useEffect(() => {
    document.documentElement.dataset.splash = splashDone ? 'done' : 'active'
    return () => {
      delete document.documentElement.dataset.splash
    }
  }, [splashDone])

  return (
    <AppErrorBoundary>
      <SplashDoneProvider value={splashDone}>
        <AppTabProvider>
          <div className="min-h-dvh">
            <AppLayout />
          </div>
        </AppTabProvider>
      </SplashDoneProvider>
    </AppErrorBoundary>
  )
}
