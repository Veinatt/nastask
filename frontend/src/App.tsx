import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppErrorBoundary } from '@/components/AppErrorBoundary'
import { AppLayout } from '@/components/layout/AppLayout'
import { SplashDoneProvider } from '@/components/splash/SplashDoneContext'
import { HomePage } from '@/pages/HomePage'
import { StatsPage } from '@/pages/StatsPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { SettingsPage } from '@/pages/SettingsPage'

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
        <BrowserRouter>
          <div className="min-h-dvh">
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<HomePage />} />
                <Route path="stats" element={<StatsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </div>
        </BrowserRouter>
      </SplashDoneProvider>
    </AppErrorBoundary>
  )
}
