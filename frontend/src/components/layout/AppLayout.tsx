import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Navigation } from './Navigation'
import { SyncStatusBanner } from '@/components/layout/SyncStatusBanner'
import { NAV_ROUTES } from '@/components/layout/navItems'
import { useSplashDone } from '@/components/splash/SplashDoneContext'
import { useSync } from '@/hooks/useSync'
import { useTelegram } from '@/hooks/useTelegram'
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation'
import { cn } from '@/lib/utils'

export function AppLayout() {
  useTelegram()
  useSync()
  const location = useLocation()
  const splashDone = useSplashDone()
  const mainRef = useRef<HTMLElement>(null)
  useSwipeNavigation(NAV_ROUTES, mainRef)

  // page-in after splash restart caused a jump — only animate on later navigations
  const skipFirstPageIn = useRef(true)
  const [pageIn, setPageIn] = useState(false)

  useEffect(() => {
    if (!splashDone) {
      setPageIn(false)
      return
    }
    if (skipFirstPageIn.current) {
      skipFirstPageIn.current = false
      setPageIn(false)
      return
    }
    setPageIn(true)
  }, [location.pathname, splashDone])

  return (
    <div className="min-h-dvh flex flex-col">
      <Navigation />
      <SyncStatusBanner />
      <main
        ref={mainRef}
        className="mx-auto w-full min-w-0 max-w-6xl flex-1 overflow-x-clip px-4 py-5 pb-24 md:px-6 md:py-8 md:pb-10 touch-pan-y"
      >
        <div
          key={location.pathname}
          className={cn('min-w-0', pageIn && 'animate-page-in')}
        >
          <Outlet />
        </div>
      </main>
    </div>
  )
}
