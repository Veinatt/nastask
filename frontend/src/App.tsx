import { useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { SplashDoneProvider } from '@/components/splash/SplashDoneContext'
import { SplashScreen } from '@/components/splash/SplashScreen'
import { HomePage } from '@/pages/HomePage'
import { StatsPage } from '@/pages/StatsPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { SettingsPage } from '@/pages/SettingsPage'

export default function App() {
  const [splashDone, setSplashDone] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.splash = 'active'
    return () => {
      delete document.documentElement.dataset.splash
    }
  }, [])

  const onSplashComplete = useCallback(() => {
    // Sync before React paint — otherwise 1 frame with no logo and title still hidden
    document.documentElement.dataset.splash = 'done'
    setSplashDone(true)
  }, [])

  return (
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
        {!splashDone && <SplashScreen onComplete={onSplashComplete} />}
      </BrowserRouter>
    </SplashDoneProvider>
  )
}
