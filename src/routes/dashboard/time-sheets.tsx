import {
  createFileRoute,
  Link,
  Outlet,
  useRouter,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState, useMemo } from 'react'
import { type ColumnDef, type Row } from '@tanstack/react-table'
import { FileText, Plus, ChevronDown, ChevronRight, ArrowRight } from 'lucide-react'
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { cn } from '@/lib/utils'
import { timeSheetRepository } from '@/repositories/timeSheet.repository'
import { organisationRepository } from '@/repositories/organisation.repository'
import { projectRepository } from '@/repositories/project.repository'
import { timeEntryRepository } from '@/repositories/timeEntry.repository'
import { accountRepository } from '@/repositories/account.repository'
import {
  createTimeSheetSchema,
  addEntriesToSheetSchema,
  type TimeSheet,
  type Organisation,
  type Project,
  type TimeEntry,
  type Account,
} from '@/schemas'
import type { TimeSheetSummary } from '@/types'
import { DataTable } from '@/components/DataTable'
import { TimeEntriesTable } from '@/components/TimeEntriesTable'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useLocale } from '@/hooks/use-locale'
import { formatDate, formatDateTime, hoursToTime } from '@/lib/date-utils'
import { CheckCircle, XCircle, LayoutGrid, Table as TableIcon } from 'lucide-react'
import { TabNavigation } from '@/components/TabNavigation'

const timeTabs = [
  { label: 'Time Entries', href: '/dashboard/time-entries' },
  { label: 'Time Sheets', href: '/dashboard/time-sheets' },
]

// Server Functions
const getAllDataFn = createServerFn({ method: 'GET' }).handler(async () => {
  const timeSheets = await timeSheetRepository.findAll()
  const organisations = await organisationRepository.findAll()
  const projects = await projectRepository.findAll()
  const timeEntries = await timeEntryRepository.findAll()
  const accounts = await accountRepository.findAll()

  // Get entry counts and totals for each sheet
  const sheetsWithData = await Promise.all(
    timeSheets.map(async (sheet) => {
      const sheetData = await timeSheetRepository.findWithEntries(sheet.id)
      return {
        sheet,
        entries: sheetData?.entries || [],
        totalHours: sheetData?.totalHours || 0,
      }
    })
  )

  return {
    timeSheets,
    organisations,
    projects,
    timeEntries,
    accounts,
    sheetsWithData,
  }
})

const createTimeSheetFn = createServerFn({ method: 'POST' })
  .inputValidator(createTimeSheetSchema)
  .handler(async ({ data }) => {
    const now = new Date().toISOString()
    const sheet: TimeSheet = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title: data.title,
      description: data.description || '',
      startDate: data.startDate,
      endDate: data.endDate,
      status: 'draft',
      organisationId: data.organisationId,
      projectId: data.projectId,
      accountId: data.accountId,
      createdAt: now,
      updatedAt: now,
    }
    return await timeSheetRepository.create(sheet)
  })

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

export const Route = createFileRoute('/dashboard/time-sheets')({
  component: TimeSheetsPage,
  loader: () => getAllDataFn(),
})

function TimeSheetsPage() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const locale = useLocale()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  const sheetsWithDetails = useMemo(() => {
    return data.sheetsWithData.map((item: any) => {
      const sheet = item.sheet
      const organisation = data.organisations.find(
        (o: any) => o.id === sheet.organisationId
      )
      const project = data.projects.find((p: any) => p.id === sheet.projectId)
      const account = data.accounts.find((a: any) => a.id === sheet.accountId)

      return {
        id: sheet.id,
        title: sheet.title,
        description: sheet.description,
        status: sheet.status,
        startDate: sheet.startDate,
        endDate: sheet.endDate,
        entryCount: item.entries.length,
        totalHours: item.totalHours,
        organisationName: organisation?.name,
        projectName: project?.name,
        accountName: account?.name,
        createdAt: sheet.createdAt,
        updatedAt: sheet.updatedAt,
        entries: item.entries, // For expandable rows
      }
    })
  }, [data])

  const filteredSheets = useMemo(() => {
    if (statusFilter === 'all') return sheetsWithDetails
    return sheetsWithDetails.filter(
      (sheet: TimeSheetSummary) => sheet.status === statusFilter
    )
  }, [sheetsWithDetails, statusFilter])

  const columns: ColumnDef<TimeSheetSummary>[] = [
    {
      id: 'expander',
      header: () => null,
      cell: ({ row }) => (
        <button
          onClick={() => row.toggleExpanded()}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
        >
          {row.getIsExpanded() ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      ),
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ getValue, row }) => (
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard/time-sheets/$id"
            params={{ id: row.original.id }}
            className="font-medium hover:underline"
          >
            {getValue() as string}
          </Link>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
    },
    {
      id: 'dateRange',
      header: 'Date Range',
      cell: ({ row }) => {
        const start = row.original.startDate
        const end = row.original.endDate
        if (!start && !end) return <span className="text-gray-400">-</span>
        if (start && end)
          return (
            <span className="flex items-center gap-1 whitespace-nowrap">
              {formatDate(start, locale)}
              <ArrowRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
              {formatDate(end, locale)}
            </span>
          )
        if (start) return `From ${formatDate(start, locale)}`
        if (end) return `Until ${formatDate(end, locale)}`
        return '-'
      },
    },
    {
      accessorKey: 'entryCount',
      header: 'Entries',
      cell: ({ getValue }) => {
        const count = getValue() as number
        return (
          <span className={count === 0 ? 'text-gray-400' : ''}>
            {count} {count === 1 ? 'entry' : 'entries'}
          </span>
        )
      },
    },
    {
      accessorKey: 'totalHours',
      header: 'Total Hours',
      cell: ({ getValue }) => {
        const hours = getValue() as number
        return hours > 0 ? `${hours.toFixed(2)}h` : '-'
      },
    },
    {
      accessorKey: 'organisationName',
      header: 'Organisation',
      cell: ({ getValue }) =>
        getValue() || <span className="text-gray-400">-</span>,
    },
    {
      accessorKey: 'accountName',
      header: 'Account',
      cell: ({ getValue }) =>
        getValue() || <span className="text-gray-400">-</span>,
    },
    {
      accessorKey: 'projectName',
      header: 'Project',
      cell: ({ getValue }) =>
        getValue() || <span className="text-gray-400">-</span>,
    },
  ]

  return (
    <div className="flex flex-1 flex-col">
      <TabNavigation tabs={timeTabs} className="px-6 pt-4" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold">Time Sheets</h2>
          <p className="text-sm text-muted-foreground">
            Organize time entries into sheets for approval
          </p>
        </div>
        <AddTimeSheetDialog
          organisations={data.organisations}
          accounts={data.accounts}
          timeEntries={data.timeEntries}
        />
      </div>

      <div className="flex gap-2 items-center">
        <label className="text-sm font-medium">Filter by status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          <option value="all">All</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filteredSheets}
        getRowId={(row) => row.id}
        renderSubComponent={({ row }) => {
          const entries = row.original.entries || []
          const projects = data.projects

          if (entries.length === 0) {
            return (
              <div className="p-4 text-sm text-muted-foreground">
                No time entries in this sheet yet.
              </div>
            )
          }

          // Group entries by project
          const entriesByProject = entries.reduce(
            (acc: Record<string, any[]>, entry: any) => {
              const projectId = entry.projectId || 'no-project'
              if (!acc[projectId]) {
                acc[projectId] = []
              }
              acc[projectId].push(entry)
              return acc
            },
            {}
          )

          return (
            <div className="p-4 space-y-6 bg-muted/20">
              <div className="flex items-center justify-end gap-2 pb-2 border-b">
                <span className="text-xs text-muted-foreground mr-2">View:</span>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-8 px-2"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="h-8 px-2"
                >
                  <TableIcon className="h-4 w-4" />
                </Button>
              </div>
              {Object.entries(entriesByProject).map(
                ([projectId, projectEntries]) => {
                  const project = projects.find((p: any) => p.id === projectId)
                  const projectTotal = projectEntries.reduce(
                    (sum, entry) => sum + entry.hours,
                    0
                  )

                  return (
                    <div key={projectId} className="space-y-3">
                      <div className="px-1">
                        <h4 className="font-semibold text-sm">
                          {project?.name || 'No Project'}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {projectEntries.length} {projectEntries.length === 1 ? 'entry' : 'entries'} · {projectTotal.toFixed(1)} hours total
                        </p>
                      </div>
                      {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {projectEntries.map((entry: any) => (
                            <div
                              key={entry.id}
                              className="bg-card border rounded-lg p-3 space-y-2 hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h5 className="font-medium text-sm line-clamp-2">
                                  {entry.title}
                                </h5>
                                {entry.approvedDate ? (
                                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-gray-300 flex-shrink-0" />
                                )}
                              </div>
                              {entry.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {entry.description}
                                </p>
                              )}
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">
                                  {formatDate(entry.date, locale)}
                                </span>
                                <span className="font-medium">
                                  {hoursToTime(entry.hours)}
                                </span>
                              </div>
                              <div className={`text-xs pt-1 border-t ${entry.approvedDate ? 'text-muted-foreground' : 'invisible'}`}>
                                Approved: {entry.approvedDate ? formatDateTime(entry.approvedDate, locale) : 'placeholder'}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <TimeEntriesTable entries={projectEntries} />
                      )}
                    </div>
                  )
                }
              )}
            </div>
          )
        }}
      />

      <Outlet />
      </div>
    </div>
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

function AddTimeSheetDialog({
  organisations,
  accounts,
  timeEntries,
}: {
  organisations: any[]
  accounts: any[]
  timeEntries: any[]
}) {
  const [open, setOpen] = useState(false)
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(
    new Set()
  )
  const [selectedOrgId, setSelectedOrgId] = useState<string>('')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const router = useRouter()

  const form = useForm({
    defaultValues: {
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      organisationId: '',
      accountId: '',
    },
    validatorAdapter: zodValidator(),
    validators: {
      onSubmit: createTimeSheetSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const sheet = await createTimeSheetFn({
          data: {
            title: value.title,
            description: value.description,
            startDate: value.startDate || undefined,
            endDate: value.endDate || undefined,
            organisationId: value.organisationId,
            accountId: value.accountId || undefined,
          },
        })

        // Add selected entries to the sheet
        if (selectedEntryIds.size > 0 && sheet) {
          await addEntriesToSheetFn({
            data: {
              sheetId: sheet.id,
              entryIds: Array.from(selectedEntryIds),
            },
          })
        }

        setOpen(false)
        form.reset()
        setSelectedEntryIds(new Set())
        router.invalidate()
      } catch (error) {
        console.error('Error creating time sheet:', error)
      }
    },
  })

  const availableEntries = useMemo(() => {
    return timeEntries.filter((entry: any) => {
      // Only show entries that aren't already in a sheet
      if (entry.timeSheetId) return false

      // Filter by organisation if one is selected
      if (selectedOrgId && entry.organisationId !== selectedOrgId) return false

      return true
    })
  }, [timeEntries, selectedOrgId])

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          setOpen(false)
          form.reset()
          setSelectedOrgId('')
          setSelectedAccountId('')
          setSelectedEntryIds(new Set())
        } else {
          setOpen(open)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Time Sheet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] h-[85vh] flex flex-col p-0">
        <DialogHeader className="space-y-3 px-6 pt-6">
          <DialogTitle>Create Time Sheet</DialogTitle>
          <DialogDescription>
            Create a new time sheet to organize time entries for approval
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-6 space-y-6 pb-4">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                form.handleSubmit()
              }}
              className="space-y-6"
            >
              <form.Field
                name="title"
                validators={{
                  onChange: ({ value }) =>
                    !value ? 'Title is required' : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <label htmlFor={field.name} className="text-sm font-medium">
                      Title *
                    </label>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="e.g., Week 1 - Feature Development"
                    />
                    {field.state.meta.errors &&
                      field.state.meta.errors.length > 0 && (
                        <p className="text-sm text-red-500">
                          {field.state.meta.errors[0]}
                        </p>
                      )}
                  </div>
                )}
              </form.Field>

              <form.Field name="description">
                {(field) => (
                  <div className="space-y-2">
                    <label htmlFor={field.name} className="text-sm font-medium">
                      Description
                    </label>
                    <textarea
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                      placeholder="Optional notes about this time sheet"
                      rows={3}
                    />
                  </div>
                )}
              </form.Field>

              <div className="grid grid-cols-2 gap-4">
                <form.Field name="startDate">
                  {(field) => (
                    <div className="space-y-2">
                      <label
                        htmlFor={field.name}
                        className="text-sm font-medium"
                      >
                        Start Date
                      </label>
                      <Input
                        id={field.name}
                        type="date"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="endDate">
                  {(field) => (
                    <div className="space-y-2">
                      <label
                        htmlFor={field.name}
                        className="text-sm font-medium"
                      >
                        End Date
                      </label>
                      <Input
                        id={field.name}
                        type="date"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </div>
                  )}
                </form.Field>
              </div>

              <form.Field
                name="organisationId"
                validators={{
                  onChange: ({ value }) =>
                    !value ? 'Organisation is required' : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <label htmlFor={field.name} className="text-sm font-medium">
                      Organisation *
                    </label>
                    <select
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        const value = e.target.value
                        field.handleChange(value)
                        // Clear account if it doesn't belong to the new org
                        if (selectedAccountId) {
                          const account = accounts.find((a: any) => a.id === selectedAccountId)
                          if (account?.organisationId !== value) {
                            form.setFieldValue('accountId', '')
                            setSelectedAccountId('')
                          }
                        }
                        setSelectedOrgId(value)
                        setSelectedEntryIds(new Set())
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    >
                      <option value="">Select organisation...</option>
                      {organisations.map((org: any) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                    {field.state.meta.errors &&
                      field.state.meta.errors.length > 0 && (
                        <p className="text-sm text-red-500">
                          {field.state.meta.errors[0]}
                        </p>
                      )}
                  </div>
                )}
              </form.Field>

              <form.Field name="accountId">
                {(field) => {
                  const selectedOrg = form.getFieldValue('organisationId')
                  const availableAccounts = selectedOrg
                    ? accounts.filter(
                        (a: any) => a.organisationId === selectedOrg
                      )
                    : accounts

                  return (
                    <div className="space-y-2">
                      <label
                        htmlFor={field.name}
                        className="text-sm font-medium"
                      >
                        Account (optional)
                      </label>
                      <select
                        id={field.name}
                        value={field.state.value}
                        onChange={(e) => {
                          const value = e.target.value
                          field.handleChange(value)
                          setSelectedAccountId(value)
                          // Bidirectional: auto-fill organisation from account
                          if (value) {
                            const account = accounts.find((a: any) => a.id === value)
                            if (account && account.organisationId !== selectedOrg) {
                              form.setFieldValue('organisationId', account.organisationId)
                              setSelectedOrgId(account.organisationId)
                              setSelectedEntryIds(new Set())
                            }
                          }
                        }}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      >
                        <option value="">None</option>
                        {availableAccounts.map((acc: any) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({acc.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                }}
              </form.Field>

              {/* Time Entry Selection */}
              {selectedOrgId && (
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      Select Time Entries ({availableEntries.length} available)
                    </label>
                    {availableEntries.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (
                            selectedEntryIds.size === availableEntries.length
                          ) {
                            setSelectedEntryIds(new Set())
                          } else {
                            setSelectedEntryIds(
                              new Set(availableEntries.map((e: any) => e.id))
                            )
                          }
                        }}
                      >
                        {selectedEntryIds.size === availableEntries.length
                          ? 'Deselect All'
                          : 'Select All'}
                      </Button>
                    )}
                  </div>

                  {availableEntries.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">
                      No available time entries for the selected filters.
                    </p>
                  ) : (
                    <div className="border rounded-md">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="w-10 p-2"></th>
                            <th className="text-left p-2">Title</th>
                            <th className="text-left p-2">Date</th>
                            <th className="text-right p-2">Hours</th>
                          </tr>
                        </thead>
                        <tbody>
                          {availableEntries.map((entry: any) => (
                            <tr
                              key={entry.id}
                              className="border-t hover:bg-muted/30 cursor-pointer"
                              onClick={() => {
                                const newSet = new Set(selectedEntryIds)
                                if (newSet.has(entry.id)) {
                                  newSet.delete(entry.id)
                                } else {
                                  newSet.add(entry.id)
                                }
                                setSelectedEntryIds(newSet)
                              }}
                            >
                              <td
                                className="p-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Checkbox
                                  checked={selectedEntryIds.has(entry.id)}
                                  onCheckedChange={(checked) => {
                                    const newSet = new Set(selectedEntryIds)
                                    if (checked) {
                                      newSet.add(entry.id)
                                    } else {
                                      newSet.delete(entry.id)
                                    }
                                    setSelectedEntryIds(newSet)
                                  }}
                                />
                              </td>
                              <td className="p-2">{entry.title}</td>
                              <td className="p-2">{entry.date || '-'}</td>
                              <td className="p-2 text-right">{entry.hours}h</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {selectedEntryIds.size > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {selectedEntryIds.size}{' '}
                      {selectedEntryIds.size === 1 ? 'entry' : 'entries'}{' '}
                      selected
                    </p>
                  )}
                </div>
              )}
            </form>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 pb-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button onClick={() => form.handleSubmit()}>Create Time Sheet</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
