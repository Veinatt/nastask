import { Clock, BarChart3, FileBarChart2, Settings } from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/', labelKey: 'nav.home', icon: Clock },
  { to: '/stats', labelKey: 'nav.stats', icon: BarChart3 },
  { to: '/reports', labelKey: 'nav.reports', icon: FileBarChart2 },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
] as const

export const NAV_ROUTES = NAV_ITEMS.map((i) => i.to)
