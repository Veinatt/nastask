import { useEffect } from 'react'
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
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
        {/*
          MemoryRouter: Telegram puts launch params in location.hash (#tgWebAppData=…).
          BrowserRouter pathname navigations fight that hash / WebView history and
          tab switches silently fail inside Mini Apps.
        */}
        <MemoryRouter initialEntries={['/']} initialIndex={0}>
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
        </MemoryRouter>
      </SplashDoneProvider>
    </AppErrorBoundary>
  )
}
