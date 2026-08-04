import { useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Navigation } from './Navigation'
import { SyncStatusBanner } from '@/components/layout/SyncStatusBanner'
import { NAV_ROUTES } from '@/components/layout/navItems'
import { useSync } from '@/hooks/useSync'
import { useTelegram } from '@/hooks/useTelegram'
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation'

export function AppLayout() {
  useTelegram()
  useSync()
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  useSwipeNavigation(NAV_ROUTES, mainRef)

  return (
    <div className="min-h-dvh flex flex-col">
      <Navigation />
      <SyncStatusBanner />
      <main
        ref={mainRef}
        className="mx-auto w-full min-w-0 max-w-6xl flex-1 overflow-x-clip px-4 py-5 pb-24 md:px-6 md:py-8 md:pb-10 touch-pan-y"
      >
        <div key={location.pathname} className="min-w-0 animate-page-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
