import { cn } from '@/lib/utils'
import { useI18n } from '@/hooks/useI18n'
import { NAV_ITEMS } from '@/components/layout/navItems'
import { useAppTab, type AppTab } from '@/components/layout/AppTabContext'
import { useMemoryOpen } from '@/components/memory/MemoryOpenContext'
import { SyncStatusIcon } from '@/components/layout/SyncStatusBanner'
import { useTripleTap } from '@/hooks/useTripleTap'

/** Solid wordmark — size from parent / inline style / text-* class. */
export const APP_LOGO_GRADIENT =
  'logo font-semibold tracking-tight text-foreground'

/** Nav wordmark (fixed text-lg). */
export const APP_LOGO_CLASS = cn(
  APP_LOGO_GRADIENT,
  'cursor-default select-none text-lg',
)

type Props = {
  className?: string
}

export function Navigation({ className }: Props) {
  const { t } = useI18n()
  const { tab, setTab } = useAppTab()
  const { openMemory } = useMemoryOpen()
  const onLogoTap = useTripleTap(openMemory)

  const renderItems = (mobile: boolean) =>
    NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => {
      const isActive = tab === to
      return (
        <button
          key={to}
          type="button"
          onClick={() => setTab(to as AppTab)}
          className={
            mobile
              ? cn(
                  'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors duration-200',
                  isActive ? 'text-primary-soft' : 'text-muted-foreground',
                )
              : cn(
                  'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-200',
                  isActive
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
          }
        >
          <Icon className={cn(mobile ? 'h-5 w-5' : 'h-4 w-4')} />
          <span>{t(labelKey)}</span>
        </button>
      )
    })

  return (
    <div className={cn(className)}>
      {/* Top bar: single #app-logo for all breakpoints (enter/exit fly to this slot) */}
      <nav className="sticky top-0 z-40 flex items-center gap-1 border-b border-border bg-card px-4 py-2.5 md:px-6">
        <div className="mr-0 flex items-center gap-1.5 md:mr-8">
          <button
            type="button"
            id="app-logo"
            className={APP_LOGO_CLASS}
            onClick={onLogoTap}
            aria-label="NasTask"
          >
            NasTask
          </button>
          <SyncStatusIcon />
        </div>
        <div className="hidden md:flex items-center gap-1">{renderItems(false)}</div>
        {tab === '/' && (
          <button
            type="button"
            className="relative ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="1 новое сообщение"
            onClick={() => {
              window.dispatchEvent(new Event('open-postcard'))
            }}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 16.5 4 20l3.8-1.2A8 8 0 1 0 6 16.5z"
              />
            </svg>
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white">
              1
            </span>
          </button>
        )}
      </nav>

      <nav
        className="md:hidden fixed inset-x-0 z-50 border-t border-primary/10 bg-card/95 backdrop-blur-md"
        style={{
          bottom: 'var(--tg-safe-area-inset-bottom, 0px)',
          paddingBottom:
            'max(0.25rem, var(--tg-content-safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="grid grid-cols-4 max-w-lg mx-auto">{renderItems(true)}</div>
      </nav>
    </div>
  )
}
