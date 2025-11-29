import { cn } from '@/lib/utils'
import type { EntryStatus } from '@/schemas'
import { CircleCheck, CircleHelp, Clock } from 'lucide-react'

interface TimeSheetApprovalSummaryProps {
  entries: Array<{ status: EntryStatus }>
  className?: string
}

export function TimeSheetApprovalSummary({
  entries,
  className,
}: TimeSheetApprovalSummaryProps) {
  const pendingCount = entries.filter((e) => e.status === 'pending').length
  const questionedCount = entries.filter((e) => e.status === 'questioned').length
  const approvedCount = entries.filter((e) => e.status === 'approved').length
  const totalCount = entries.length

  if (totalCount === 0) {
    return (
      <div className={cn('text-muted-foreground text-sm', className)}>
        No entries in this time sheet
      </div>
    )
  }

  const allApproved = approvedCount === totalCount
  const hasQuestions = questionedCount > 0

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-4 text-sm">
        {pendingCount > 0 && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{pendingCount} pending</span>
          </div>
        )}
        {questionedCount > 0 && (
          <div className="flex items-center gap-1 text-destructive">
            <CircleHelp className="h-4 w-4" />
            <span>{questionedCount} questioned</span>
          </div>
        )}
        {approvedCount > 0 && (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <CircleCheck className="h-4 w-4" />
            <span>{approvedCount} approved</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden flex">
        {approvedCount > 0 && (
          <div
            className="h-full bg-green-500"
            style={{ width: `${(approvedCount / totalCount) * 100}%` }}
          />
        )}
        {pendingCount > 0 && (
          <div
            className="h-full bg-muted-foreground/30"
            style={{ width: `${(pendingCount / totalCount) * 100}%` }}
          />
        )}
        {questionedCount > 0 && (
          <div
            className="h-full bg-destructive"
            style={{ width: `${(questionedCount / totalCount) * 100}%` }}
          />
        )}
      </div>

      {/* Status message */}
      <p className="text-sm text-muted-foreground">
        {allApproved && 'All entries approved'}
        {hasQuestions && `${questionedCount} ${questionedCount === 1 ? 'entry has' : 'entries have'} open questions`}
        {!allApproved && !hasQuestions && `${approvedCount} of ${totalCount} entries approved`}
      </p>
    </div>
  )
}
