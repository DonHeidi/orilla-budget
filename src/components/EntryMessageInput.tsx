import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { EntryStatus } from '@/schemas'
import { CircleCheck, CircleHelp, Send } from 'lucide-react'

interface EntryMessageInputProps {
  onSendMessage: (content: string, statusChange?: EntryStatus) => Promise<void>
  currentStatus: EntryStatus
  canApprove?: boolean
  canQuestion?: boolean
  isLoading?: boolean
  placeholder?: string
  className?: string
}

export function EntryMessageInput({
  onSendMessage,
  currentStatus,
  canApprove = true,
  canQuestion = true,
  isLoading = false,
  placeholder = 'Add a comment...',
  className,
}: EntryMessageInputProps) {
  const [content, setContent] = useState('')
  const [isSending, setIsSending] = useState(false)

  const handleSend = async (statusChange?: EntryStatus) => {
    if (!content.trim() && !statusChange) return

    setIsSending(true)
    try {
      await onSendMessage(content.trim(), statusChange)
      setContent('')
    } finally {
      setIsSending(false)
    }
  }

  const disabled = isLoading || isSending

  return (
    <div className={cn('space-y-2', className)}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={3}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
      />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {currentStatus !== 'approved' && canApprove && (
            <Button
              variant="default"
              size="sm"
              onClick={() => handleSend('approved')}
              disabled={disabled}
              className="gap-1"
            >
              <CircleCheck className="h-4 w-4" />
              {content.trim() ? 'Approve with comment' : 'Approve'}
            </Button>
          )}
          {currentStatus !== 'questioned' && canQuestion && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleSend('questioned')}
              disabled={disabled || !content.trim()}
              className="gap-1"
            >
              <CircleHelp className="h-4 w-4" />
              Question
            </Button>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSend()}
          disabled={disabled || !content.trim()}
          className="gap-1"
        >
          <Send className="h-4 w-4" />
          Comment
        </Button>
      </div>
    </div>
  )
}
