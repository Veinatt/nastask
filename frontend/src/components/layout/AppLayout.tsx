import { Outlet } from 'react-router-dom'
import { Navigation } from './Navigation'
import { SyncStatusBanner } from '@/components/layout/SyncStatusBanner'
import { useDeadlineAutoComplete } from '@/hooks/useDeadlineAutoComplete'
import { useSettingsSync } from '@/hooks/useSettingsSync'
import { useTasksSync } from '@/hooks/useTasksSync'
import { useTelegram } from '@/hooks/useTelegram'

export function AppLayout() {
  useTelegram()
  useSettingsSync()
  useTasksSync()
  useDeadlineAutoComplete()

  return (
    <div className="min-h-dvh flex flex-col">
      <Navigation />
      <SyncStatusBanner />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-4 pb-24 md:pb-8">
        <Outlet />
      </main>
    </div>
  )
}
