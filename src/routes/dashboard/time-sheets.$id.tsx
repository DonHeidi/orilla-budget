import { createFileRoute, useRouter, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import { useState, useEffect } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Trash2, Plus, X, ExternalLink, Check, MessageCircleQuestion, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeSheetRepository } from '@/repositories/timeSheet.repository'
import { organisationRepository } from '@/repositories/organisation.repository'
import { projectRepository } from '@/repositories/project.repository'
import { accountRepository } from '@/repositories/account.repository'
import { projectApprovalSettingsRepository } from '@/repositories/projectApprovalSettings.repository'
import { projectMemberRepository } from '@/repositories/projectMember.repository'
import { sessionRepository } from '@/repositories/session.repository'
import { SESSION_COOKIE_NAME } from '@/lib/auth.shared'
import {
  canApproveTimeSheet,
  canApproveEntry,
  canQuestionEntry,
  canRejectTimeSheet,
  canRevertToDraft,
} from '@/lib/permissions'
import {
  addEntriesToSheetSchema,
  type TimeSheet,
  type TimeEntry,
  type Organisation,
  type Project,
  type Account,
  type EntryStatus,
} from '@/schemas'
import { EntryStatusBadge } from '@/components/EntryStatusBadge'
import { TimeSheetApprovalSummary } from '@/components/TimeSheetApprovalSummary'
import { DataTable } from '@/components/DataTable'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'

// Server Functions
const getTimeSheetDetailFn = createServerFn({ method: 'GET' }).handler(
  async ({ data }: { data: { id: string } }) => {
    const { id } = data

    // Get current user
    const token = getCookie(SESSION_COOKIE_NAME)
    let currentUser = null
    if (token) {
      const sessionData = await sessionRepository.findValidWithUserAndPii(token)
      if (sessionData?.user) {
        currentUser = sessionData.user
      }
    }

    const sheetData = await timeSheetRepository.findWithEntries(id)
    const organisations = await organisationRepository.findAll()
    const projects = await projectRepository.findAll()
    const accounts = await accountRepository.findAll()

    // Get approval settings and project members if sheet has a project
    let approvalSettings = null
    let projectMembers: Array<{ userId: string; role: string }> = []
    let userMembership = null

    if (sheetData?.timeSheet.projectId) {
      approvalSettings = await projectApprovalSettingsRepository.findByProjectId(
        sheetData.timeSheet.projectId
      )
      projectMembers = await projectMemberRepository.findByProjectId(
        sheetData.timeSheet.projectId
      )
      if (currentUser) {
        userMembership = projectMembers.find((m) => m.userId === currentUser.id) || null
      }
    }

    // Check if sheet can be approved (entry status check)
    let canApproveResult = null
    if (sheetData) {
      canApproveResult = await timeSheetRepository.canApproveSheet(id)
    }

    // Check if any client/reviewer has interacted with this sheet
    // (approved entries, questioned entries, or messages from non-experts)
    let hasClientInteraction = false
    if (sheetData && sheetData.entries.length > 0) {
      // Check if any entry has been approved or questioned by someone other than the sheet creator
      const clientOrReviewerUserIds = projectMembers
        .filter((m) => ['client', 'reviewer', 'owner'].includes(m.role))
        .map((m) => m.userId)

      for (const entry of sheetData.entries) {
        // Check if entry was status-changed by a client/reviewer
        if (
          entry.statusChangedBy &&
          clientOrReviewerUserIds.includes(entry.statusChangedBy)
        ) {
          hasClientInteraction = true
          break
        }
      }

      // Also check for entry messages from clients/reviewers
      if (!hasClientInteraction) {
        const { entryMessageRepository } = await import(
          '@/repositories/entryMessage.repository'
        )
        for (const entry of sheetData.entries) {
          const messages = await entryMessageRepository.findByEntryId(entry.id)
          if (messages.some((m) => clientOrReviewerUserIds.includes(m.authorId))) {
            hasClientInteraction = true
            break
          }
        }
      }
    }

    // Check permission to approve (user/role based)
    let approvalPermission = { allowed: false, reason: 'Not authenticated' }
    let rejectPermission = { allowed: false, reason: 'Not authenticated' }
    let revertPermission = { allowed: false, reason: 'Not authenticated' }

    if (currentUser && sheetData) {
      const userContext = { id: currentUser.id, role: currentUser.role }
      const membershipContext = userMembership as { role: any } | null

      approvalPermission = canApproveTimeSheet(userContext, {
        timeSheet: sheetData.timeSheet,
        projectMembers: projectMembers as Array<{ userId: string; role: any }>,
        userMembership: membershipContext,
      })

      rejectPermission = canRejectTimeSheet(userContext, {
        timeSheet: sheetData.timeSheet,
        userMembership: membershipContext,
      })

      revertPermission = canRevertToDraft(userContext, {
        timeSheet: sheetData.timeSheet,
        userMembership: membershipContext,
        hasClientInteraction,
      })
    }

    return {
      sheetData: sheetData,
      organisations: organisations,
      projects: projects,
      accounts: accounts,
      approvalSettings: approvalSettings,
      canApproveResult: canApproveResult,
      approvalPermission: approvalPermission,
      rejectPermission: rejectPermission,
      revertPermission: revertPermission,
      projectMembers: projectMembers,
      userMembership: userMembership,
      currentUser: currentUser ? { id: currentUser.id, role: currentUser.role } : null,
      hasClientInteraction: hasClientInteraction,
    }
  }
)

const updateTimeSheetFn = createServerFn({ method: 'POST' }).handler(
  async ({ id, data }: { id: string; data: Partial<TimeSheet> }) => {
    const { createdAt, updatedAt, ...updateData } = data
    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    )

    if (Object.keys(cleanUpdateData).length === 0) {
      throw new Error('No fields to update')
    }

    return await timeSheetRepository.update(id, cleanUpdateData)
  }
)

const deleteTimeSheetFn = createServerFn({ method: 'POST' }).handler(
  async ({ id }: { id: string }) => {
    return await timeSheetRepository.delete(id)
  }
)

const addEntriesToSheetFn = createServerFn({ method: 'POST' })
  .inputValidator(addEntriesToSheetSchema)
  .handler(async ({ data }) => {
    return await timeSheetRepository.addEntries(data.sheetId, data.entryIds)
  })

const removeEntryFromSheetFn = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: { sheetId: string; entryId: string } }) => {
    return await timeSheetRepository.removeEntry(data.sheetId, data.entryId)
  }
)

const submitTimeSheetFn = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: { id: string } }) => {
    return await timeSheetRepository.submitSheet(data.id)
  }
)

const approveTimeSheetFn = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: { id: string } }) => {
    const token = getCookie(SESSION_COOKIE_NAME)
    if (!token) throw new Error('Not authenticated')

    const sessionData = await sessionRepository.findValidWithUserAndPii(token)
    if (!sessionData?.user) throw new Error('Not authenticated')

    return await timeSheetRepository.approveSheet(data.id, sessionData.user.id)
  }
)

const rejectTimeSheetFn = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: { id: string; reason?: string } }) => {
    return await timeSheetRepository.rejectSheet(data.id, data.reason)
  }
)

const revertToDraftFn = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: { id: string } }) => {
    return await timeSheetRepository.revertToDraft(data.id)
  }
)

const getAvailableEntriesFn = createServerFn({ method: 'POST' }).handler(
  async (filters?: { organisationId?: string; projectId?: string }) => {
    const entries = await timeSheetRepository.getAvailableEntries(filters)
    return entries
  }
)

const approveEntryFn = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: { sheetId: string; entryId: string } }) => {
    const token = getCookie(SESSION_COOKIE_NAME)
    if (!token) throw new Error('Not authenticated')

    const sessionData = await sessionRepository.findValidWithUserAndPii(token)
    if (!sessionData?.user) throw new Error('Not authenticated')

    return await timeSheetRepository.approveEntryInSheet(
      data.sheetId,
      data.entryId,
      sessionData.user.id
    )
  }
)

const questionEntryFn = createServerFn({ method: 'POST' }).handler(
  async ({
    data,
  }: {
    data: {
      sheetId: string
      entryId: string
      message?: string
    }
  }) => {
    const token = getCookie(SESSION_COOKIE_NAME)
    if (!token) throw new Error('Not authenticated')

    const sessionData = await sessionRepository.findValidWithUserAndPii(token)
    if (!sessionData?.user) throw new Error('Not authenticated')

    await timeSheetRepository.questionEntryInSheet(
      data.sheetId,
      data.entryId,
      sessionData.user.id
    )

    // If a message was provided, create an entry message
    if (data.message && data.message.trim()) {
      const { entryMessageRepository } = await import(
        '@/repositories/entryMessage.repository'
      )
      await entryMessageRepository.create(
        {
          timeEntryId: data.entryId,
          content: data.message.trim(),
          statusChange: 'questioned',
        },
        sessionData.user.id
      )
    }
  }
)

const resolveQuestionFn = createServerFn({ method: 'POST' }).handler(
  async ({
    data,
  }: {
    data: {
      sheetId: string
      entryId: string
      message?: string
    }
  }) => {
    const token = getCookie(SESSION_COOKIE_NAME)
    if (!token) throw new Error('Not authenticated')

    const sessionData = await sessionRepository.findValidWithUserAndPii(token)
    if (!sessionData?.user) throw new Error('Not authenticated')

    // Update the entry status back to pending
    const { timeEntries } = await import('@/db/schema')
    const { db } = await import('@/db')
    const { eq } = await import('drizzle-orm')

    const now = new Date().toISOString()
    await db
      .update(timeEntries)
      .set({
        status: 'pending',
        statusChangedAt: now,
        statusChangedBy: sessionData.user.id,
      })
      .where(eq(timeEntries.id, data.entryId))

    // If a message was provided, create an entry message
    if (data.message && data.message.trim()) {
      const { entryMessageRepository } = await import(
        '@/repositories/entryMessage.repository'
      )
      await entryMessageRepository.create(
        {
          timeEntryId: data.entryId,
          content: data.message.trim(),
          statusChange: 'pending',
        },
        sessionData.user.id
      )
    }
  }
)

export const Route = createFileRoute('/dashboard/time-sheets/$id')({
  component: TimeSheetDetailPage,
  loader: ({ params }) => getTimeSheetDetailFn({ data: { id: params.id } }),
})

function TimeSheetDetailPage() {
  const { id } = Route.useParams()
  const data = Route.useLoaderData()
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showAddEntriesDialog, setShowAddEntriesDialog] = useState(false)
  const [showQuestionDialog, setShowQuestionDialog] = useState(false)
  const [questioningEntry, setQuestioningEntry] = useState<TimeEntry | null>(null)
  const [questionMessage, setQuestionMessage] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editedValues, setEditedValues] = useState<Partial<TimeSheet>>({})

  if (!data.sheetData) {
    return <div>Time sheet not found</div>
  }

  const { timeSheet, entries, totalHours, organisation, project, account } =
    data.sheetData
  const {
    approvalSettings,
    canApproveResult,
    approvalPermission,
    rejectPermission,
    revertPermission,
    projectMembers,
    currentUser,
  } = data
  const currentValues = { ...timeSheet, ...editedValues }
  const isDraft = timeSheet.status === 'draft'
  const isSubmitted = timeSheet.status === 'submitted'

  // Combined approval check: both entry status AND user permission
  const canApprove = canApproveResult?.canApprove && approvalPermission?.allowed
  const approvalBlockReason = !canApproveResult?.canApprove
    ? canApproveResult?.reason
    : !approvalPermission?.allowed
      ? approvalPermission?.reason
      : undefined

  // Reject and revert permissions
  const canReject = rejectPermission?.allowed
  const canRevert = revertPermission?.allowed

  // Map entries to include status for approval summary
  const entriesWithStatus = entries.map((entry: TimeEntry) => ({
    ...entry,
    status: (entry.status as EntryStatus) || 'pending',
  }))

  const handleFieldClick = (fieldName: string) => {
    if (isDraft || fieldName === 'status') {
      setEditingField(fieldName)
    }
  }

  const handleFieldBlur = async () => {
    if (Object.keys(editedValues).length > 0) {
      await updateTimeSheetFn({
        id,
        data: { id, ...editedValues } as TimeSheet,
      })
      setEditedValues({})
      router.invalidate()
    }
    setEditingField(null)
  }

  const handleFieldChange = (fieldName: string, value: any) => {
    setEditedValues((prev) => ({ ...prev, [fieldName]: value }))
  }

  const handleDelete = async () => {
    await deleteTimeSheetFn({ id })
    setShowDeleteConfirm(false)
    router.navigate({ to: '/dashboard/time-sheets' })
  }

  const handleSubmit = async () => {
    if (entries.length === 0) {
      alert('Cannot submit an empty time sheet. Please add at least one entry.')
      return
    }
    try {
      await submitTimeSheetFn({ data: { id } })
      router.invalidate()
    } catch (err) {
      console.error('[handleSubmit] Error:', err)
      alert('Failed to submit time sheet. Please try again.')
    }
  }

  const handleApprove = async () => {
    // Check if approval is blocked (entry status or permission)
    if (!canApprove) {
      alert(approvalBlockReason || 'Cannot approve this time sheet')
      return
    }
    try {
      await approveTimeSheetFn({ data: { id } })
      router.invalidate()
    } catch (err) {
      console.error('[handleApprove] Error:', err)
      alert('Failed to approve time sheet. Please try again.')
    }
  }

  const handleReject = async () => {
    try {
      await rejectTimeSheetFn({ data: { id, reason: rejectionReason } })
      setShowRejectDialog(false)
      setRejectionReason('')
      router.invalidate()
    } catch (err) {
      console.error('[handleReject] Error:', err)
      alert('Failed to reject time sheet. Please try again.')
    }
  }

  const handleRevertToDraft = async () => {
    try {
      await revertToDraftFn({ data: { id } })
      router.invalidate()
    } catch (err) {
      console.error('[handleRevertToDraft] Error:', err)
      alert('Failed to revert time sheet. Please try again.')
    }
  }

  const handleRemoveEntry = async (entryId: string) => {
    // Prevent removal of approved entries
    const entry = entries.find((e: TimeEntry) => e.id === entryId)
    if (entry?.status === 'approved') {
      return
    }
    try {
      await removeEntryFromSheetFn({ data: { sheetId: id, entryId } })
      router.invalidate()
    } catch (err) {
      console.error('[handleRemoveEntry] Error:', err)
    }
  }

  const handleApproveEntry = async (entryId: string) => {
    try {
      await approveEntryFn({ data: { sheetId: id, entryId } })
      router.invalidate()
    } catch (err) {
      console.error('[handleApproveEntry] Error:', err)
    }
  }

  const handleOpenQuestionDialog = (entry: TimeEntry) => {
    setQuestioningEntry(entry)
    setQuestionMessage('')
    setShowQuestionDialog(true)
  }

  const handleQuestionEntry = async () => {
    if (!questioningEntry) return
    try {
      await questionEntryFn({
        data: {
          sheetId: id,
          entryId: questioningEntry.id,
          message: questionMessage,
        },
      })
      setShowQuestionDialog(false)
      setQuestioningEntry(null)
      setQuestionMessage('')
      router.invalidate()
    } catch (err) {
      console.error('[handleQuestionEntry] Error:', err)
    }
  }

  const handleResolveQuestion = async (entryId: string) => {
    try {
      await resolveQuestionFn({ data: { sheetId: id, entryId } })
      router.invalidate()
    } catch (err) {
      console.error('[handleResolveQuestion] Error:', err)
    }
  }

  const entryColumns: ColumnDef<TimeEntry>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <Link
          to="/dashboard/time-entries/$id"
          params={{ id: row.original.id }}
          className="font-medium text-primary hover:underline flex items-center gap-1"
        >
          {row.original.title}
          <ExternalLink className="h-3 w-3" />
        </Link>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = (row.original as TimeEntry & { status?: EntryStatus }).status || 'pending'
        return <EntryStatusBadge status={status} size="sm" />
      },
    },
    {
      accessorKey: 'hours',
      header: 'Hours',
      cell: ({ getValue }) => {
        const hours = getValue() as number
        const h = Math.floor(hours)
        const m = Math.round((hours - h) * 60)
        return `${h}:${m.toString().padStart(2, '0')}`
      },
    },
    {
      id: 'actions',
      header: () => null,
      cell: ({ row }) => {
        const status = (row.original as TimeEntry & { status?: EntryStatus }).status || 'pending'
        const isApproved = status === 'approved'
        const isQuestioned = status === 'questioned'

        // Draft: show remove button
        if (isDraft) {
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveEntry(row.original.id)}
              disabled={isApproved}
              title={isApproved ? 'Cannot remove approved entries' : 'Remove entry'}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )
        }

        // Submitted: show approval actions
        if (isSubmitted) {
          return (
            <div className="flex gap-1">
              {/* Approve button - show for pending entries */}
              {!isApproved && !isQuestioned && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleApproveEntry(row.original.id)}
                  title="Approve entry"
                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}

              {/* Question button - show for pending or approved entries */}
              {!isQuestioned && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenQuestionDialog(row.original)}
                  title="Question this entry"
                  className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                >
                  <MessageCircleQuestion className="h-4 w-4" />
                </Button>
              )}

              {/* Resolve button - show for questioned entries */}
              {isQuestioned && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleResolveQuestion(row.original.id)}
                  title="Mark as resolved (return to pending)"
                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          )
        }

        return null
      },
    },
  ]

  return (
    <Sheet
      open={true}
      onOpenChange={() => router.navigate({ to: '/dashboard/time-sheets' })}
    >
      <SheetContent className="w-full sm:max-w-[700px] overflow-y-auto">
        <SheetHeader className="space-y-3 pb-6 border-b">
          <SheetTitle>Time Sheet Details</SheetTitle>
          <SheetDescription>
            View and manage time sheet information and entries
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Header with Status and Actions */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <StatusBadge status={timeSheet.status} />
            </div>
            <div className="flex gap-2">
              {isDraft && (
                <>
                  <Button onClick={handleSubmit} size="sm">
                    Submit for Approval
                  </Button>
                  <Button
                    onClick={() => setShowDeleteConfirm(true)}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
              {timeSheet.status === 'submitted' && currentUser && (
                <>
                  <Button
                    onClick={handleApprove}
                    size="sm"
                    variant="default"
                    disabled={!canApprove}
                    title={approvalBlockReason}
                  >
                    Approve
                  </Button>
                  <Button
                    onClick={() => setShowRejectDialog(true)}
                    size="sm"
                    variant="destructive"
                    disabled={!canReject}
                    title={!canReject ? rejectPermission?.reason : undefined}
                  >
                    Reject
                  </Button>
                  <Button
                    onClick={handleRevertToDraft}
                    size="sm"
                    variant="outline"
                    disabled={!canRevert}
                    title={!canRevert ? revertPermission?.reason : undefined}
                  >
                    Revert to Draft
                  </Button>
                </>
              )}
              {(timeSheet.status === 'rejected' ||
                timeSheet.status === 'approved') &&
                currentUser && (
                  <Button
                    onClick={handleRevertToDraft}
                    size="sm"
                    variant="outline"
                    disabled={!canRevert}
                    title={!canRevert ? revertPermission?.reason : undefined}
                  >
                    Revert to Draft
                  </Button>
                )}
            </div>
          </div>

          {/* Approval Summary - show for submitted sheets */}
          {isSubmitted && entriesWithStatus.length > 0 && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <h3 className="text-sm font-medium mb-2">Entry Approval Status</h3>
              <TimeSheetApprovalSummary entries={entriesWithStatus} />
              {approvalBlockReason && (
                <p className="text-sm text-destructive mt-2">
                  {approvalBlockReason}
                </p>
              )}
            </div>
          )}

          {/* Editable Fields */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Title</label>
              {editingField === 'title' && isDraft ? (
                <Input
                  autoFocus
                  value={currentValues.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  onBlur={handleFieldBlur}
                  className="mt-1"
                />
              ) : (
                <p
                  className={cn(
                    'text-base mt-1 px-2 py-1 -mx-2 rounded',
                    isDraft &&
                      'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                  onClick={() => handleFieldClick('title')}
                >
                  {currentValues.title}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">
                Description
              </label>
              {editingField === 'description' && isDraft ? (
                <textarea
                  autoFocus
                  value={currentValues.description}
                  onChange={(e) =>
                    handleFieldChange('description', e.target.value)
                  }
                  onBlur={handleFieldBlur}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-1"
                  rows={3}
                />
              ) : (
                <p
                  className={cn(
                    'text-base mt-1 px-2 py-1 -mx-2 rounded min-h-[1.5rem]',
                    isDraft &&
                      'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                  onClick={() => handleFieldClick('description')}
                >
                  {currentValues.description || 'Click to add description...'}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Start Date
                </label>
                {editingField === 'startDate' && isDraft ? (
                  <Input
                    autoFocus
                    type="date"
                    value={currentValues.startDate || ''}
                    onChange={(e) =>
                      handleFieldChange(
                        'startDate',
                        e.target.value || undefined
                      )
                    }
                    onBlur={handleFieldBlur}
                    className="mt-1"
                  />
                ) : (
                  <p
                    className={cn(
                      'text-base mt-1 px-2 py-1 -mx-2 rounded',
                      isDraft &&
                        'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                    onClick={() => handleFieldClick('startDate')}
                  >
                    {currentValues.startDate || 'Not set'}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">
                  End Date
                </label>
                {editingField === 'endDate' && isDraft ? (
                  <Input
                    autoFocus
                    type="date"
                    value={currentValues.endDate || ''}
                    onChange={(e) =>
                      handleFieldChange('endDate', e.target.value || undefined)
                    }
                    onBlur={handleFieldBlur}
                    className="mt-1"
                  />
                ) : (
                  <p
                    className={cn(
                      'text-base mt-1 px-2 py-1 -mx-2 rounded',
                      isDraft &&
                        'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                    onClick={() => handleFieldClick('endDate')}
                  >
                    {currentValues.endDate || 'Not set'}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">
                Organisation
              </label>
              {editingField === 'organisationId' && isDraft ? (
                <select
                  autoFocus
                  value={currentValues.organisationId || ''}
                  onChange={(e) => {
                    handleFieldChange(
                      'organisationId',
                      e.target.value || undefined
                    )
                    // Clear account if it doesn't belong to the new org
                    if (currentValues.accountId) {
                      const acc = data.accounts.find((a: Account) => a.id === currentValues.accountId)
                      if (acc?.organisationId !== e.target.value) {
                        handleFieldChange('accountId', undefined)
                      }
                    }
                    handleFieldChange('projectId', undefined)
                  }}
                  onBlur={handleFieldBlur}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background mt-1"
                >
                  <option value="">None</option>
                  {data.organisations.map((org: Organisation) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p
                  className={cn(
                    'text-base mt-1 px-2 py-1 -mx-2 rounded',
                    isDraft &&
                      'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                  onClick={() => handleFieldClick('organisationId')}
                >
                  {organisation?.name || 'Not set'}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">
                Account
              </label>
              {editingField === 'accountId' && isDraft ? (
                <select
                  autoFocus
                  value={currentValues.accountId || ''}
                  onChange={(e) => {
                    const value = e.target.value || undefined
                    handleFieldChange('accountId', value)
                    // Bidirectional: auto-fill organisation from account
                    if (value) {
                      const acc = data.accounts.find((a: Account) => a.id === value)
                      if (acc && acc.organisationId !== currentValues.organisationId) {
                        handleFieldChange('organisationId', acc.organisationId)
                        handleFieldChange('projectId', undefined)
                      }
                    }
                  }}
                  onBlur={handleFieldBlur}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background mt-1"
                >
                  <option value="">None</option>
                  {data.accounts
                    .filter((a: Account) =>
                      !currentValues.organisationId || a.organisationId === currentValues.organisationId
                    )
                    .map((acc: Account) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.email})
                      </option>
                    ))}
                </select>
              ) : (
                <p
                  className={cn(
                    'text-base mt-1 px-2 py-1 -mx-2 rounded',
                    isDraft &&
                      'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                  onClick={() => handleFieldClick('accountId')}
                >
                  {account?.name || 'Not set'}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">
                Project
              </label>
              {editingField === 'projectId' && isDraft ? (
                <select
                  autoFocus
                  value={currentValues.projectId || ''}
                  onChange={(e) =>
                    handleFieldChange('projectId', e.target.value || undefined)
                  }
                  onBlur={handleFieldBlur}
                  disabled={!currentValues.organisationId}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background mt-1 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">None</option>
                  {data.projects
                    .filter(
                      (p: Project) =>
                        p.organisationId === currentValues.organisationId
                    )
                    .map((proj: Project) => (
                      <option key={proj.id} value={proj.id}>
                        {proj.name}
                      </option>
                    ))}
                </select>
              ) : (
                <p
                  className={cn(
                    'text-base mt-1 px-2 py-1 -mx-2 rounded',
                    isDraft &&
                      'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                  onClick={() => handleFieldClick('projectId')}
                >
                  {project?.name || 'Not set'}
                </p>
              )}
            </div>

            {timeSheet.rejectionReason && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Rejection Reason
                </label>
                <p className="text-base mt-1 text-red-600">
                  {timeSheet.rejectionReason}
                </p>
              </div>
            )}
          </div>

          {/* Time Entries Section */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Time Entries</h3>
                <p className="text-sm text-gray-500">
                  {entries.length} {entries.length === 1 ? 'entry' : 'entries'}{' '}
                  • Total: {totalHours.toFixed(2)}h
                </p>
              </div>
              {isDraft && (
                <Button onClick={() => setShowAddEntriesDialog(true)} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Entries
                </Button>
              )}
            </div>

            {entries.length > 0 ? (
              <DataTable
                columns={entryColumns}
                data={entries}
                getRowId={(row) => row.id}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                No entries in this time sheet yet.
                {isDraft && ' Click "Add Entries" to get started.'}
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md">
              <h3 className="text-lg font-semibold mb-2">Delete Time Sheet</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to delete this time sheet? This action
                cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Dialog */}
        {showRejectDialog && (
          <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject Time Sheet</DialogTitle>
                <DialogDescription>
                  Please provide a reason for rejecting this time sheet
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Reason for rejection..."
                  rows={3}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowRejectDialog(false)}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleReject}>
                  Reject
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Add Entries Dialog */}
        {showAddEntriesDialog && (
          <AddEntriesDialog
            sheetId={id}
            organisationId={timeSheet.organisationId}
            projectId={timeSheet.projectId}
            onClose={() => {
              setShowAddEntriesDialog(false)
              router.invalidate()
            }}
          />
        )}

        {/* Question Entry Dialog */}
        {showQuestionDialog && questioningEntry && (
          <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Question Entry</DialogTitle>
                <DialogDescription>
                  Add a question or comment about "{questioningEntry.title}"
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="text-sm text-muted-foreground">
                  <p><strong>Date:</strong> {questioningEntry.date}</p>
                  <p><strong>Hours:</strong> {questioningEntry.hours}h</p>
                  {questioningEntry.description && (
                    <p><strong>Description:</strong> {questioningEntry.description}</p>
                  )}
                </div>
                <textarea
                  value={questionMessage}
                  onChange={(e) => setQuestionMessage(e.target.value)}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="What would you like to clarify about this entry?"
                  rows={3}
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowQuestionDialog(false)
                    setQuestioningEntry(null)
                    setQuestionMessage('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={handleQuestionEntry}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <MessageCircleQuestion className="mr-2 h-4 w-4" />
                  Question Entry
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </SheetContent>
    </Sheet>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    draft: {
      label: 'Draft',
      className:
        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
    },
    submitted: {
      label: 'Submitted',
      className:
        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
    },
    approved: {
      label: 'Approved',
      className:
        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    },
    rejected: {
      label: 'Rejected',
      className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
    },
  }

  const variant = variants[status] || variants.draft

  return (
    <Badge variant="outline" className={cn('font-medium', variant.className)}>
      {variant.label}
    </Badge>
  )
}

function AddEntriesDialog({
  sheetId,
  organisationId,
  projectId,
  onClose,
}: {
  sheetId: string
  organisationId?: string
  projectId?: string
  onClose: () => void
}) {
  const [availableEntries, setAvailableEntries] = useState<TimeEntry[]>([])
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(
    new Set()
  )
  const [loading, setLoading] = useState(true)

  // Load available entries
  useEffect(() => {
    setLoading(true)
    getAvailableEntriesFn({ organisationId, projectId }).then((entries) => {
      setAvailableEntries(entries)
      setLoading(false)
    })
  }, [organisationId, projectId])

  const handleToggleEntry = (entryId: string) => {
    setSelectedEntryIds((prev) => {
      const next = new Set(prev)
      if (next.has(entryId)) {
        next.delete(entryId)
      } else {
        next.add(entryId)
      }
      return next
    })
  }

  const handleAddEntries = async () => {
    await addEntriesToSheetFn({
      data: { sheetId, entryIds: Array.from(selectedEntryIds) },
    })
    onClose()
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEntryIds(new Set(availableEntries.map((entry) => entry.id)))
    } else {
      setSelectedEntryIds(new Set())
    }
  }

  const allSelected =
    selectedEntryIds.size === availableEntries.length &&
    availableEntries.length > 0

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Time Entries</DialogTitle>
          <DialogDescription>
            Select entries to add to this time sheet. {selectedEntryIds.size}{' '}
            selected.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-gray-500">
            Loading available entries...
          </div>
        ) : availableEntries.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No available entries found. All entries may already be in approved
            time sheets.
          </div>
        ) : (
          <ScrollArea className="flex-1 border rounded-md">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Hours
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {availableEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    onClick={() => handleToggleEntry(entry.id)}
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedEntryIds.has(entry.id)}
                        onCheckedChange={() => handleToggleEntry(entry.id)}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm">{entry.date}</td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {entry.title}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {entry.description || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {entry.hours.toFixed(2)}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        )}

        <div className="flex gap-3 justify-end border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAddEntries}
            disabled={selectedEntryIds.size === 0}
          >
            Add {selectedEntryIds.size}{' '}
            {selectedEntryIds.size === 1 ? 'Entry' : 'Entries'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
