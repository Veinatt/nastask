import { Outlet } from 'react-router-dom'
import { Navigation } from './Navigation'
import { useTelegram } from '@/hooks/useTelegram'

export function AppLayout() {
  useTelegram()

  return (
    <div className="min-h-dvh flex flex-col">
      <Navigation />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-4 pb-24 md:pb-8">
        <Outlet />
      </main>
    </div>
  )
}
