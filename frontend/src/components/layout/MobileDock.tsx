import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/hooks/useI18n'
import { NAV_ITEMS } from '@/components/layout/navItems'
import { useAppTab, type AppTab } from '@/components/layout/AppTabContext'
import { OrbitalStartButton } from '@/components/home/OrbitalStartButton'
import { useStartActions } from '@/components/home/StartActionsContext'
import type { LucideIcon } from 'lucide-react'

function DockTab({
  label,
  active,
  icon: Icon,
  onSelect,
}: {
  label: string
  active: boolean
  icon: LucideIcon
  onSelect: () => void
}) {
  const wasActive = useRef(active)
  const [bounceKey, setBounceKey] = useState(0)

  useEffect(() => {
    if (active && !wasActive.current) setBounceKey((k) => k + 1)
    wasActive.current = active
  }, [active])

  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      onClick={onSelect}
      className="flex h-full min-w-0 w-full items-center justify-center text-primary-soft outline-none dark:text-foreground"
    >
      <span
        key={bounceKey}
        className={cn(
          'inline-flex origin-center',
          active && bounceKey > 0 && 'animate-dock-icon-bounce',
        )}
      >
        <Icon
          className="shrink-0 overflow-visible text-primary-soft dark:text-foreground"
          size={28}
          strokeWidth={active ? 2.35 : 1.35}
          style={{
            width: active ? 28 : 24,
            height: active ? 28 : 24,
            transition:
              'width 0.28s var(--ease-bounce), height 0.28s var(--ease-bounce)',
          }}
          aria-hidden
        />
      </span>
    </button>
  )
}

/** Floating mobile dock: 2 tabs | orbital start | 2 tabs. */
export function MobileDock() {
  const { t } = useI18n()
  const { tab, setTab } = useAppTab()
  const { openStart, openManual, starting } = useStartActions()

  const left = NAV_ITEMS.slice(0, 2)
  const right = NAV_ITEMS.slice(2, 4)

  return (
    <div
      className="pointer-events-none md:hidden fixed inset-x-0 z-50 px-4"
      style={{
        // Same inset as px-4 on the sides (+ Telegram safe area under the dock).
        bottom:
          'calc(1rem + var(--tg-safe-area-inset-bottom, 0px) + var(--tg-content-safe-area-inset-bottom, 0px))',
      }}
    >
      <div
        className={cn(
          'pointer-events-auto relative mx-auto grid max-w-lg grid-cols-5 items-center overflow-visible',
          'h-14 rounded-[1.75rem] bg-card px-1 py-1.5',
          '![box-shadow:var(--shadow-dock)]',
        )}
      >
        {left.map(({ to, labelKey, icon }) => (
          <DockTab
            key={to}
            label={t(labelKey)}
            icon={icon}
            active={tab === to}
            onSelect={() => setTab(to as AppTab)}
          />
        ))}

        <div className="relative z-10 flex items-center justify-center">
          <OrbitalStartButton
            disabled={starting}
            onStart={openStart}
            onManual={openManual}
          />
        </div>

        {right.map(({ to, labelKey, icon }) => (
          <DockTab
            key={to}
            label={t(labelKey)}
            icon={icon}
            active={tab === to}
            onSelect={() => setTab(to as AppTab)}
          />
        ))}
      </div>
    </div>
  )
}
