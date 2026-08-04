import { Clock, BarChart3, FileBarChart2, Settings } from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/', labelKey: 'nav.home', icon: Clock, end: true },
  { to: '/stats', labelKey: 'nav.stats', icon: BarChart3, end: false },
  { to: '/reports', labelKey: 'nav.reports', icon: FileBarChart2, end: false },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings, end: false },
] as const

export const NAV_ROUTES = NAV_ITEMS.map((i) => i.to)
