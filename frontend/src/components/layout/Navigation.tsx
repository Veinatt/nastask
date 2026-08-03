import { NavLink } from 'react-router-dom'
import { CheckSquare, FileBarChart2, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { to: '/', label: 'Задачи', icon: CheckSquare, end: true },
  { to: '/reports', label: 'Отчёты', icon: FileBarChart2 },
  { to: '/settings', label: 'Настройки', icon: Settings },
] as const

export function Navigation() {
  return (
    <>
      <nav className="hidden md:flex items-center gap-1 border-b bg-card/80 px-4 py-2 sticky top-0 z-40 backdrop-blur">
        <div className="mr-6 text-lg font-semibold text-primary">NasTask</div>
        {items.map(({ to, label, icon: Icon, ...rest }) => (
          <NavLink
            key={to}
            to={to}
            end={'end' in rest ? rest.end : false}
            className={({ isActive }) =>
              cn(
                'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-3">
          {items.map(({ to, label, icon: Icon, ...rest }) => (
            <NavLink
              key={to}
              to={to}
              end={'end' in rest ? rest.end : false}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-2.5 text-xs font-medium',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  )
}
