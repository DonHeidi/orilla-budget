import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { TimeSheetStatus } from '@/schemas'
import { Clock, CheckCircle, XCircle, FileEdit } from 'lucide-react'

interface TimeSheetStatusBadgeProps {
  status: TimeSheetStatus
  className?: string
  showIcon?: boolean
}

const statusConfig: Record<
  TimeSheetStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }
> = {
  draft: {
    label: 'Draft',
    variant: 'outline',
    icon: FileEdit,
  },
  submitted: {
    label: 'Submitted',
    variant: 'secondary',
    icon: Clock,
  },
  approved: {
    label: 'Approved',
    variant: 'default',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Rejected',
    variant: 'destructive',
    icon: XCircle,
  },
}

export function TimeSheetStatusBadge({
  status,
  className,
  showIcon = true,
}: TimeSheetStatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={cn('gap-1', className)}>
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  )
}
