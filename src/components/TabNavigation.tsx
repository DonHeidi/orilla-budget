import { Link, useMatchRoute } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

interface Tab {
  label: string
  href: string
}

interface TabNavigationProps {
  tabs: Tab[]
  className?: string
}

export function TabNavigation({ tabs, className }: TabNavigationProps) {
  const matchRoute = useMatchRoute()

  return (
    <nav className={cn('flex border-b border-border', className)}>
      {tabs.map((tab) => {
        const isActive = matchRoute({ to: tab.href, fuzzy: true })
        return (
          <Link
            key={tab.href}
            to={tab.href}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
