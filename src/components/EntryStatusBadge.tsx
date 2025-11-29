import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { EntryStatus } from '@/schemas'
import { CircleCheck, CircleHelp, Clock } from 'lucide-react'

interface EntryStatusBadgeProps {
  status: EntryStatus
  className?: string
  showIcon?: boolean
  size?: 'default' | 'sm'
}

const statusConfig: Record<
  EntryStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }
> = {
  pending: {
    label: 'Pending',
    variant: 'secondary',
    icon: Clock,
  },
  questioned: {
    label: 'Questioned',
    variant: 'destructive',
    icon: CircleHelp,
  },
  approved: {
    label: 'Approved',
    variant: 'default',
    icon: CircleCheck,
  },
}

export function EntryStatusBadge({
  status,
  className,
  showIcon = true,
  size = 'default',
}: EntryStatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge
      variant={config.variant}
      className={cn(
        'gap-1',
        size === 'sm' && 'text-xs py-0 px-1.5',
        className
      )}
    >
      {showIcon && <Icon className={cn(size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3')} />}
      {config.label}
    </Badge>
  )
}
