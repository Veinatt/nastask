import { cn } from '@/lib/utils'
import { useI18n } from '@/hooks/useI18n'
import { NAV_ITEMS } from '@/components/layout/navItems'
import { useAppTab, type AppTab } from '@/components/layout/AppTabContext'

export function Navigation() {
  const { t } = useI18n()
  const { tab, setTab } = useAppTab()

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
                  'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                    : 'text-muted-foreground hover:bg-primary/8 hover:text-foreground active:scale-[0.97]',
                )
          }
        >
          <Icon
            key={isActive ? 'on' : 'off'}
            className={cn(mobile ? 'h-5 w-5' : 'h-4 w-4', isActive && 'animate-nav-bounce')}
          />
          <span
            className={
              mobile
                ? 'transition-transform duration-300 ease-[var(--ease-bounce)]'
                : undefined
            }
          >
            {t(labelKey)}
          </span>
        </button>
      )
    })

  return (
    <>
      <nav className="hidden md:flex items-center gap-1 border-b border-primary/10 bg-card/70 px-6 py-2.5 sticky top-0 z-40 backdrop-blur-md">
        <div className="mr-8 text-lg font-bold tracking-tight bg-gradient-to-r from-primary to-[hsl(var(--brand-end))] bg-clip-text text-transparent">
          NasTask
        </div>
        {renderItems(false)}
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
    </>
  )
}
