import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState, useMemo, useEffect } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Trash2, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeSheetRepository } from '@/repositories/timeSheet.repository'
import { organisationRepository } from '@/repositories/organisation.repository'
import { projectRepository } from '@/repositories/project.repository'
import { accountRepository } from '@/repositories/account.repository'
import {
  addEntriesToSheetSchema,
  type TimeSheet,
  type TimeEntry,
  type Organisation,
  type Project,
  type Account,
} from '@/schemas'
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
  async ({ id }: { id: string }) => {
    const sheetData = await timeSheetRepository.findWithEntries(id)
    const organisations = await organisationRepository.findAll()
    const projects = await projectRepository.findAll()
    const accounts = await accountRepository.findAll()

    return {
      sheetData: sheetData,
      organisations: organisations,
      projects: projects,
      accounts: accounts,
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
  async ({ sheetId, entryId }: { sheetId: string; entryId: string }) => {
    return await timeSheetRepository.removeEntry(sheetId, entryId)
  }
)

const submitTimeSheetFn = createServerFn({ method: 'POST' }).handler(
  async ({ id }: { id: string }) => {
    return await timeSheetRepository.submitSheet(id)
  }
)

const approveTimeSheetFn = createServerFn({ method: 'POST' }).handler(
  async ({ id }: { id: string }) => {
    return await timeSheetRepository.approveSheet(id)
  }
)

const rejectTimeSheetFn = createServerFn({ method: 'POST' }).handler(
  async ({ id, reason }: { id: string; reason?: string }) => {
    return await timeSheetRepository.rejectSheet(id, reason)
  }
)

const revertToDraftFn = createServerFn({ method: 'POST' }).handler(
  async ({ id }: { id: string }) => {
    return await timeSheetRepository.revertToDraft(id)
  }
)

const getAvailableEntriesFn = createServerFn({ method: 'POST' }).handler(
  async (filters?: { organisationId?: string; projectId?: string }) => {
    const entries = await timeSheetRepository.getAvailableEntries(filters)
    return entries
  }
)

export const Route = createFileRoute('/expert/time-sheets/$id')({
  component: TimeSheetDetailPage,
  loader: ({ params }) => getTimeSheetDetailFn({ id: params.id }),
})

function TimeSheetDetailPage() {
  const { id } = Route.useParams()
  const data = Route.useLoaderData()
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showAddEntriesDialog, setShowAddEntriesDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editedValues, setEditedValues] = useState<Partial<TimeSheet>>({})

  if (!data.sheetData) {
    return <div>Time sheet not found</div>
  }

  const { timeSheet, entries, totalHours, organisation, project, account } =
    data.sheetData
  const currentValues = { ...timeSheet, ...editedValues }
  const isDraft = timeSheet.status === 'draft'

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
    router.navigate({ to: '/expert/time-sheets' })
  }

  const handleSubmit = async () => {
    if (entries.length === 0) {
      alert('Cannot submit an empty time sheet. Please add at least one entry.')
      return
    }
    await submitTimeSheetFn({ id })
    router.invalidate()
  }

  const handleApprove = async () => {
    await approveTimeSheetFn({ id })
    router.invalidate()
  }

  const handleReject = async () => {
    await rejectTimeSheetFn({ id, reason: rejectionReason })
    setShowRejectDialog(false)
    setRejectionReason('')
    router.invalidate()
  }

  const handleRevertToDraft = async () => {
    await revertToDraftFn({ id })
    router.invalidate()
  }

  const handleRemoveEntry = async (entryId: string) => {
    // Prevent removal of approved entries
    const entry = timeSheetData?.entries.find((e) => e.id === entryId)
    if (entry?.approvedDate) {
      return
    }
    await removeEntryFromSheetFn({ sheetId: id, entryId })
    router.invalidate()
  }

  const entryColumns: ColumnDef<TimeEntry>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ getValue }) => (
        <span className="font-medium">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ getValue }) => {
        const desc = getValue() as string
        return desc || <span className="text-gray-400">-</span>
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
        const isApproved = !!row.original.approvedDate
        return (
          isDraft && (
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
        )
      },
    },
  ]

  return (
    <Sheet
      open={true}
      onOpenChange={() => router.navigate({ to: '/expert/time-sheets' })}
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
              {timeSheet.status === 'submitted' && (
                <>
                  <Button onClick={handleApprove} size="sm" variant="default">
                    Approve
                  </Button>
                  <Button
                    onClick={() => setShowRejectDialog(true)}
                    size="sm"
                    variant="destructive"
                  >
                    Reject
                  </Button>
                  <Button
                    onClick={handleRevertToDraft}
                    size="sm"
                    variant="outline"
                  >
                    Revert to Draft
                  </Button>
                </>
              )}
              {(timeSheet.status === 'rejected' ||
                timeSheet.status === 'approved') && (
                <Button
                  onClick={handleRevertToDraft}
                  size="sm"
                  variant="outline"
                >
                  Revert to Draft
                </Button>
              )}
            </div>
          </div>

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
