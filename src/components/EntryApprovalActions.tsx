import { Button } from '@/components/ui/button'
import type { EntryStatus } from '@/schemas'
import { CircleCheck, CircleHelp, RotateCcw } from 'lucide-react'

interface EntryApprovalActionsProps {
  currentStatus: EntryStatus
  onApprove: () => void
  onQuestion: () => void
  onResetToPending?: () => void
  isLoading?: boolean
  canApprove?: boolean
  canQuestion?: boolean
}

export function EntryApprovalActions({
  currentStatus,
  onApprove,
  onQuestion,
  onResetToPending,
  isLoading = false,
  canApprove = true,
  canQuestion = true,
}: EntryApprovalActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {currentStatus !== 'approved' && canApprove && (
        <Button
          variant="default"
          size="sm"
          onClick={onApprove}
          disabled={isLoading}
          className="gap-1"
        >
          <CircleCheck className="h-4 w-4" />
          Approve
        </Button>
      )}

      {currentStatus !== 'questioned' && canQuestion && (
        <Button
          variant="destructive"
          size="sm"
          onClick={onQuestion}
          disabled={isLoading}
          className="gap-1"
        >
          <CircleHelp className="h-4 w-4" />
          Question
        </Button>
      )}

      {currentStatus !== 'pending' && onResetToPending && (
        <Button
          variant="outline"
          size="sm"
          onClick={onResetToPending}
          disabled={isLoading}
          className="gap-1"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      )}
    </div>
  )
}
