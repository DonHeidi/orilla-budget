import {
  createFileRoute,
  useNavigate,
  useRouter,
  getRouteApi,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState, useEffect } from 'react'
import { Clock, Building2, FolderKanban, FileText, Calendar } from 'lucide-react'
import { timeEntryRepository } from '@/repositories/timeEntry.repository'
import { entryMessageRepository } from '@/repositories/entryMessage.repository'
import { projectMemberRepository } from '@/repositories/projectMember.repository'
import { hasProjectPermission } from '@/lib/permissions'
import { getCurrentUser } from '@/repositories/auth.repository'
import type { TimeEntry, EntryStatus, EntryMessage } from '@/schemas'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { EntryStatusBadge } from '@/components/EntryStatusBadge'
import { EntryApprovalActions } from '@/components/EntryApprovalActions'
import { EntryMessageThread } from '@/components/EntryMessageThread'
import { EntryMessageInput } from '@/components/EntryMessageInput'
import { Separator } from '@/components/ui/separator'

const parentRouteApi = getRouteApi('/dashboard/time-entries')

// Helper functions
function hoursToTime(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}:${m.toString().padStart(2, '0')}`
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString)
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }
  return date.toLocaleString('en-US', options)
}


// Server function for updates
const updateTimeEntryFn = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: TimeEntry }) => {
    const { id, createdAt, ...updateData } = data

    // Filter out undefined values
    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    )

    if (Object.keys(cleanUpdateData).length === 0) {
      throw new Error('No fields to update')
    }

    return await timeEntryRepository.update(id, cleanUpdateData)
  }
)

// Server function to get entry messages
const getEntryMessagesFn = createServerFn({ method: 'GET' }).handler(
  async ({ data }: { data: { entryId: string } }) => {
    const messages = await entryMessageRepository.findByEntryId(data.entryId)
    return { messages }
  }
)

// Server function to create a message and optionally change status
const createEntryMessageFn = createServerFn({ method: 'POST' }).handler(
  async ({
    data,
  }: {
    data: {
      entryId: string
      content: string
      statusChange?: EntryStatus
    }
  }) => {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Not authenticated')
    }

    const timestamp = new Date().toISOString()
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    // Create the message
    const message = await entryMessageRepository.create({
      id: messageId,
      timeEntryId: data.entryId,
      authorId: user.id,
      content: data.content,
      statusChange: data.statusChange || null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })

    // Update entry status if specified
    if (data.statusChange) {
      await timeEntryRepository.updateStatus(
        data.entryId,
        data.statusChange,
        user.id
      )
    }

    return { message }
  }
)

// Server function to update entry status (without message)
const updateEntryStatusFn = createServerFn({ method: 'POST' }).handler(
  async ({
    data,
  }: {
    data: {
      entryId: string
      status: EntryStatus
    }
  }) => {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Not authenticated')
    }

    await timeEntryRepository.updateStatus(
      data.entryId,
      data.status,
      user.id
    )

    return { success: true }
  }
)

// Server function to get current user permissions for entry
const getEntryPermissionsFn = createServerFn({ method: 'GET' }).handler(
  async ({ data }: { data: { entryId: string; projectId?: string } }) => {
    const user = await getCurrentUser()
    if (!user) {
      return { canApprove: false, canQuestion: false, canComment: false, isOwner: false }
    }

    // If no project, only system admins can approve
    if (!data.projectId) {
      const isAdmin = user.role === 'super_admin' || user.role === 'admin'
      return {
        canApprove: isAdmin,
        canQuestion: isAdmin,
        canComment: true,
        isOwner: false,
      }
    }

    // Get user's role in project
    const membership = await projectMemberRepository.findByProjectAndUser(
      data.projectId,
      user.id
    )

    if (!membership) {
      // Check system admin
      const isAdmin = user.role === 'super_admin' || user.role === 'admin'
      return {
        canApprove: isAdmin,
        canQuestion: isAdmin,
        canComment: isAdmin,
        isOwner: false,
      }
    }

    // Check permissions based on project role
    const role = membership.projectRole as 'owner' | 'expert' | 'reviewer' | 'client' | 'viewer'
    const canApprove = hasProjectPermission({ role }, 'entries:approve')
    const canQuestion = hasProjectPermission({ role }, 'entries:question')
    const canComment = hasProjectPermission({ role }, 'messages:create')

    // Check if user is the entry owner (created it)
    const entry = await timeEntryRepository.findById(data.entryId)
    const isOwner = entry?.createdBy === user.id

    return { canApprove, canQuestion, canComment, isOwner }
  }
)

// Route definition - no loader needed, uses parent data
export const Route = createFileRoute('/dashboard/time-entries/$id')({
  component: TimeEntryDetailPage,
})

function TimeEntryDetailPage() {
  const { id } = Route.useParams()
  const parentData = parentRouteApi.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editedValues, setEditedValues] = useState<Partial<TimeEntry>>({})
  const [messages, setMessages] = useState<EntryMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)
  const [permissions, setPermissions] = useState({
    canApprove: false,
    canQuestion: false,
    canComment: false,
    isOwner: false,
  })

  // Get data from parent route
  const timeEntries = parentData?.timeEntries || []
  const organisations = parentData?.organisations || []
  const projects = parentData?.projects || []

  const timeEntry = timeEntries.find((e: TimeEntry) => e.id === id)

  // Load messages and permissions when entry is available
  useEffect(() => {
    if (timeEntry) {
      // Load messages
      getEntryMessagesFn({ data: { entryId: id } })
        .then((result) => {
          setMessages(result.messages)
          setIsLoadingMessages(false)
        })
        .catch((err) => {
          console.error('Failed to load messages:', err)
          setIsLoadingMessages(false)
        })

      // Load permissions
      getEntryPermissionsFn({
        data: { entryId: id, projectId: timeEntry.projectId },
      })
        .then((result) => {
          setPermissions(result)
        })
        .catch((err) => {
          console.error('Failed to load permissions:', err)
        })
    }
  }, [id, timeEntry?.projectId])

  if (!timeEntry) {
    return (
      <Sheet
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            navigate({ to: '/dashboard/time-entries' })
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-[540px] p-0">
          <SheetHeader className="px-6 py-5 border-b border-border/40">
            <SheetTitle>Error</SheetTitle>
            <SheetDescription>Time entry not found</SheetDescription>
          </SheetHeader>
          <div className="px-6 py-6">
            <p className="text-muted-foreground">
              The requested time entry could not be found.
            </p>
          </div>
          <div className="flex gap-3 justify-end px-6 py-4 border-t border-border/40 bg-muted/30">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/dashboard/time-entries' })}
            >
              Back to List
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  const organisation = organisations.find(
    (o: any) => o.id === timeEntry.organisationId
  )
  const project = projects.find((p: any) => p.id === timeEntry.projectId)

  const currentValues = { ...timeEntry, ...editedValues }

  const handleFieldClick = (fieldName: string) => {
    setEditingField(fieldName)
  }

  const handleFieldBlur = async () => {
    if (Object.keys(editedValues).length > 0) {
      const updatePayload = {
        id: timeEntry.id,
        createdAt: timeEntry.createdAt,
        ...editedValues,
      }
      await updateTimeEntryFn({ data: updatePayload as TimeEntry })
      setEditedValues({})
      // Invalidate router cache to refetch data without full page reload
      router.invalidate()
    }
    setEditingField(null)
  }

  const handleFieldChange = (fieldName: string, value: any) => {
    setEditedValues((prev) => ({ ...prev, [fieldName]: value }))
  }

  const handleStatusChange = async (newStatus: EntryStatus) => {
    await updateEntryStatusFn({ data: { entryId: id, status: newStatus } })
    router.invalidate()
  }

  const handleSendMessage = async (content: string, statusChange?: EntryStatus) => {
    await createEntryMessageFn({
      data: {
        entryId: id,
        content,
        statusChange,
      },
    })
    // Refresh messages
    const result = await getEntryMessagesFn({ data: { entryId: id } })
    setMessages(result.messages)
    // Refresh entry data if status changed
    if (statusChange) {
      router.invalidate()
    }
  }

  const entryStatus = (timeEntry.status as EntryStatus) || 'pending'

  return (
    <Sheet
      open={true}
      onOpenChange={(open) => {
        if (!open) {
          navigate({ to: '/dashboard/time-entries' })
        }
      }}
    >
      <SheetContent className="w-full sm:max-w-[540px] overflow-y-auto p-0">
        {/* Header */}
        <SheetHeader className="px-6 py-5 border-b border-border/40">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="font-display text-lg tracking-wide">
                {currentValues.title || 'Untitled Entry'}
              </SheetTitle>
              <SheetDescription className="mt-1">
                {currentValues.date} • {hoursToTime(currentValues.hours)}
              </SheetDescription>
            </div>
            <EntryStatusBadge status={entryStatus} />
          </div>
        </SheetHeader>

        <div className="px-6 py-6 space-y-6">
          {/* Time Summary Card */}
          <Card className="bg-muted/30 border-border/40">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Date
                  </p>
                  <p className="text-xl font-semibold mt-1">
                    {currentValues.date}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Duration
                  </p>
                  <p className="text-xl font-semibold tabular-nums mt-1">
                    {hoursToTime(currentValues.hours)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Approval Actions */}
          {(permissions.canApprove || permissions.canQuestion) && (
            <div className="space-y-2">
              <h3 className="font-display text-sm tracking-wider uppercase text-muted-foreground">
                Approval Actions
              </h3>
              <EntryApprovalActions
                currentStatus={entryStatus}
                onApprove={() => handleStatusChange('approved')}
                onQuestion={() => handleStatusChange('questioned')}
                onReset={() => handleStatusChange('pending')}
                canApprove={permissions.canApprove}
                canQuestion={permissions.canQuestion}
              />
            </div>
          )}

          {/* Details Section */}
          <div className="space-y-4">
            <h3 className="font-display text-sm tracking-wider uppercase text-muted-foreground">
              Details
            </h3>

            {/* Title */}
            <button
              type="button"
              onClick={() => handleFieldClick('title')}
              className="w-full text-left rounded-lg px-3 py-3 -mx-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Title
                  </p>
                  {editingField === 'title' ? (
                    <Input
                      autoFocus
                      value={currentValues.title}
                      onChange={(e) => handleFieldChange('title', e.target.value)}
                      onBlur={handleFieldBlur}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 h-9"
                    />
                  ) : (
                    <p className="text-sm font-medium mt-1">{currentValues.title}</p>
                  )}
                </div>
              </div>
            </button>

            {/* Description */}
            <button
              type="button"
              onClick={() => handleFieldClick('description')}
              className="w-full text-left rounded-lg px-3 py-3 -mx-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Description
                </p>
                {editingField === 'description' ? (
                  <textarea
                    autoFocus
                    value={currentValues.description}
                    onChange={(e) =>
                      handleFieldChange('description', e.target.value)
                    }
                    onBlur={handleFieldBlur}
                    onClick={(e) => e.stopPropagation()}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    rows={3}
                  />
                ) : (
                  <p className="text-sm mt-1 text-muted-foreground">
                    {currentValues.description || 'No description'}
                  </p>
                )}
              </div>
            </button>

            {/* Date & Hours */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleFieldClick('date')}
                className="text-left rounded-lg px-3 py-3 -mx-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Date
                    </p>
                    {editingField === 'date' ? (
                      <Input
                        autoFocus
                        type="date"
                        value={currentValues.date}
                        onChange={(e) => handleFieldChange('date', e.target.value)}
                        onBlur={handleFieldBlur}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 h-9"
                      />
                    ) : (
                      <p className="text-sm mt-1">{currentValues.date}</p>
                    )}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleFieldClick('hours')}
                className="text-left rounded-lg px-3 py-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Hours
                    </p>
                    {editingField === 'hours' ? (
                      <div className="flex gap-2 items-center mt-1">
                        <Input
                          autoFocus
                          type="number"
                          min="0"
                          max="99"
                          value={Math.floor(currentValues.hours)}
                          onChange={(e) => {
                            const hours = parseInt(e.target.value) || 0
                            const minutes = Math.round(
                              (currentValues.hours % 1) * 60
                            )
                            handleFieldChange('hours', hours + minutes / 60)
                          }}
                          onBlur={handleFieldBlur}
                          onClick={(e) => e.stopPropagation()}
                          className="w-16 h-9"
                        />
                        <span className="text-xs">h</span>
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          step="15"
                          value={Math.round((currentValues.hours % 1) * 60)}
                          onChange={(e) => {
                            const hours = Math.floor(currentValues.hours)
                            const minutes = parseInt(e.target.value) || 0
                            handleFieldChange('hours', hours + minutes / 60)
                          }}
                          onBlur={handleFieldBlur}
                          onClick={(e) => e.stopPropagation()}
                          className="w-16 h-9"
                        />
                        <span className="text-xs">m</span>
                      </div>
                    ) : (
                      <p className="text-sm tabular-nums mt-1">
                        {hoursToTime(currentValues.hours)}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            </div>

            {/* Organisation */}
            <button
              type="button"
              onClick={() => handleFieldClick('organisationId')}
              className="w-full text-left rounded-lg px-3 py-3 -mx-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Organisation
                  </p>
                  {editingField === 'organisationId' ? (
                    <select
                      autoFocus
                      value={currentValues.organisationId || ''}
                      onChange={(e) => {
                        handleFieldChange(
                          'organisationId',
                          e.target.value || undefined
                        )
                        handleFieldChange('projectId', undefined)
                      }}
                      onBlur={handleFieldBlur}
                      onClick={(e) => e.stopPropagation()}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                    >
                      <option value="">None</option>
                      {organisations.map((org: any) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm mt-1">
                      {organisation?.name || 'Not assigned'}
                    </p>
                  )}
                </div>
              </div>
            </button>

            {/* Project */}
            <button
              type="button"
              onClick={() => handleFieldClick('projectId')}
              className="w-full text-left rounded-lg px-3 py-3 -mx-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <FolderKanban className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Project
                  </p>
                  {editingField === 'projectId' ? (
                    <select
                      autoFocus
                      value={currentValues.projectId || ''}
                      onChange={(e) =>
                        handleFieldChange('projectId', e.target.value || undefined)
                      }
                      onBlur={handleFieldBlur}
                      onClick={(e) => e.stopPropagation()}
                      disabled={!currentValues.organisationId}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">None</option>
                      {projects
                        .filter(
                          (p: any) =>
                            p.organisationId === currentValues.organisationId
                        )
                        .map((proj: any) => (
                          <option key={proj.id} value={proj.id}>
                            {proj.name}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <p className="text-sm mt-1">
                      {project?.name || 'Not assigned'}
                    </p>
                  )}
                </div>
              </div>
            </button>

            {/* Billed & Created */}
            <div className="grid grid-cols-2 gap-4">
              <div className="px-3 py-3 -mx-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Billed
                </p>
                <div className="flex items-center mt-1">
                  <input
                    type="checkbox"
                    checked={currentValues.billed || false}
                    onChange={(e) => {
                      handleFieldChange('billed', e.target.checked)
                      handleFieldBlur()
                    }}
                    className="h-4 w-4 rounded border-input cursor-pointer"
                  />
                  <span className="ml-2 text-sm">
                    {currentValues.billed ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              <div className="px-3 py-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Created
                </p>
                <p className="text-sm mt-1">
                  {formatDateTime(timeEntry.createdAt)}
                </p>
              </div>
            </div>

            {timeEntry.statusChangedAt && (
              <div className="px-3 py-3 -mx-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status Changed
                </p>
                <p className="text-sm mt-1">
                  {formatDateTime(timeEntry.statusChangedAt)}
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Messages Section */}
          <div className="space-y-4">
            <h3 className="font-display text-sm tracking-wider uppercase text-muted-foreground">
              Comments & Questions
            </h3>

            {isLoadingMessages ? (
              <p className="text-sm text-muted-foreground">Loading messages...</p>
            ) : (
              <EntryMessageThread messages={messages} />
            )}

            {permissions.canComment && (
              <EntryMessageInput
                onSendMessage={handleSendMessage}
                currentStatus={entryStatus}
                canApprove={permissions.canApprove}
                canQuestion={permissions.canQuestion}
                placeholder="Add a comment or question..."
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end px-6 py-4 border-t border-border/40 bg-muted/30">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: '/dashboard/time-entries' })}
          >
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
