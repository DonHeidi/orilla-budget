import { cn } from '@/lib/utils'
import { EntryStatusBadge } from './EntryStatusBadge'
import type { EntryStatus } from '@/schemas'
import { formatDistanceToNow } from '@/lib/utils'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface MessageItem {
  id: string
  authorId: string
  authorHandle: string
  authorEmail: string
  content: string
  statusChange?: EntryStatus | null
  createdAt: string
  parentMessageId?: string | null
}

interface EntryMessageThreadProps {
  messages: MessageItem[]
  currentUserId?: string
  onDeleteMessage?: (messageId: string) => void
  canDeleteAny?: boolean
  className?: string
}

export function EntryMessageThread({
  messages,
  currentUserId,
  onDeleteMessage,
  canDeleteAny = false,
  className,
}: EntryMessageThreadProps) {
  if (messages.length === 0) {
    return (
      <div className={cn('text-muted-foreground text-sm py-4 text-center', className)}>
        No messages yet. Start the conversation below.
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {messages.map((message) => {
        const isOwnMessage = currentUserId === message.authorId
        const canDelete = onDeleteMessage && (isOwnMessage || canDeleteAny)

        return (
          <div
            key={message.id}
            className={cn(
              'rounded-lg border p-3',
              message.statusChange === 'questioned' && 'border-destructive/50 bg-destructive/5',
              message.statusChange === 'approved' && 'border-green-500/50 bg-green-50 dark:bg-green-950/20'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{message.authorHandle}</span>
                <span className="text-muted-foreground">
                  {formatDistanceToNow(message.createdAt)}
                </span>
                {message.statusChange && (
                  <EntryStatusBadge status={message.statusChange} showIcon={false} />
                )}
              </div>
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => onDeleteMessage(message.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
            <p className="mt-1 text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
        )
      })}
    </div>
  )
}
