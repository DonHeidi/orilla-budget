import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { EntryStatus } from '@/schemas'
import { CircleCheck, CircleHelp, Clock } from 'lucide-react'

interface EntryStatusBadgeProps {
  status: EntryStatus
  className?: string
  showIcon?: boolean
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
}: EntryStatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={cn('gap-1', className)}>
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  )
}
