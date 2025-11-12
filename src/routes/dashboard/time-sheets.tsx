import { createFileRoute, Link, Outlet, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState, useMemo } from 'react'
import { type ColumnDef, type Row } from '@tanstack/react-table'
import { FileText, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { cn } from '@/lib/utils'
import { timeSheetRepository } from '@/repositories/timeSheet.repository'
import { organisationRepository } from '@/repositories/organisation.repository'
import { projectRepository } from '@/repositories/project.repository'
import { timeEntryRepository } from '@/repositories/timeEntry.repository'
import { createTimeSheetSchema, addEntriesToSheetSchema, type TimeSheet, type Organisation, type Project, type TimeEntry } from '@/schemas'
import type { TimeSheetSummary } from '@/types'
import { DataTable } from '@/components/DataTable'
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
import { Combobox } from '@/components/ui/combobox'

// Server Functions
const getAllDataFn = createServerFn({ method: 'GET' }).handler(async () => {

  const timeSheets = await timeSheetRepository.findAll()
  const organisations = await organisationRepository.findAll()
  const projects = await projectRepository.findAll()
  const timeEntries = await timeEntryRepository.findAll()

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
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const sheetsWithDetails = useMemo(() => {
    return data.sheetsWithData.map((item: any) => {
      const sheet = item.sheet
      const organisation = data.organisations.find((o: any) => o.id === sheet.organisationId)

      // Get unique project IDs from entries
      const projectIds = [...new Set(item.entries.map((e: any) => e.projectId).filter(Boolean))]
      const projectNames = projectIds
        .map(id => data.projects.find((p: any) => p.id === id)?.name)
        .filter(Boolean)
        .join(', ')

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
        projectNames: projectNames || 'No projects',
        createdAt: sheet.createdAt,
        updatedAt: sheet.updatedAt,
        entries: item.entries, // For expandable rows
      }
    })
  }, [data])

  const filteredSheets = useMemo(() => {
    if (statusFilter === 'all') return sheetsWithDetails
    return sheetsWithDetails.filter((sheet: TimeSheetSummary) => sheet.status === statusFilter)
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
        if (start && end) return `${start} to ${end}`
        if (start) return `From ${start}`
        if (end) return `Until ${end}`
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
      cell: ({ getValue }) => getValue() || <span className="text-gray-400">-</span>,
    },
    {
      accessorKey: 'projectNames',
      header: 'Projects',
      cell: ({ getValue }) => getValue() || <span className="text-gray-400">-</span>,
    },
  ]

  return (
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
          projects={data.projects}
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
        renderExpandedRow={(row) => (
          <ExpandedTimeEntries
            entries={row.original.entries}
            projects={data.projects}
          />
        )}
      />

      <Outlet />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    draft: {
      label: 'Draft',
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
    },
    submitted: {
      label: 'Submitted',
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
    },
    approved: {
      label: 'Approved',
      className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
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

function ExpandedTimeEntries({ entries, projects }: { entries: any[]; projects: any[] }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground bg-muted/30">
        No time entries in this sheet.
      </div>
    )
  }

  // Group entries by project
  const groupedEntries = entries.reduce((acc, entry) => {
    const projectId = entry.projectId || 'no-project'
    if (!acc[projectId]) {
      acc[projectId] = []
    }
    acc[projectId].push(entry)
    return acc
  }, {} as Record<string, any[]>)

  const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0)

  return (
    <div className="bg-muted/30 p-4">
      <div className="space-y-4">
        {Object.entries(groupedEntries).map(([projectId, projectEntries]) => {
          const project = projects.find((p: any) => p.id === projectId)
          const projectName = project?.name || 'No Project'
          const projectHours = projectEntries.reduce((sum, entry) => sum + entry.hours, 0)

          return (
            <div key={projectId} className="space-y-2">
              <div className="flex items-center justify-between px-2 py-1">
                <h4 className="text-sm font-semibold">{projectName}</h4>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {projectHours.toFixed(2)}h
                </span>
              </div>
              <div className="space-y-2">
                {projectEntries.map((entry: any) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-3 bg-background rounded-md border hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium text-sm">{entry.title}</span>
                        <span className="text-xs text-muted-foreground">{entry.date}</span>
                      </div>
                      {entry.description && (
                        <p className="text-sm text-muted-foreground">{entry.description}</p>
                      )}
                    </div>
                    <div className="text-sm font-medium tabular-nums whitespace-nowrap">
                      {entry.hours.toFixed(2)}h
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md border border-border/50">
          <span className="text-sm font-medium">Total Hours</span>
          <span className="text-sm font-bold tabular-nums">{totalHours.toFixed(2)}h</span>
        </div>
      </div>
    </div>
  )
}

function AddTimeSheetDialog({
  organisations,
  projects,
  timeEntries,
}: {
  organisations: any[]
  projects: any[]
  timeEntries: any[]
}) {
  const [open, setOpen] = useState(false)
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set())
  const [selectedOrgId, setSelectedOrgId] = useState<string>('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm({
    defaultValues: {
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      organisationId: '',
    },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: createTimeSheetSchema,
      onSubmit: createTimeSheetSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        setSubmitError(null)
        const sheet = await createTimeSheetFn({
          data: {
            title: value.title,
            description: value.description,
            startDate: value.startDate || undefined,
            endDate: value.endDate || undefined,
            organisationId: value.organisationId,
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
        setSubmitError(error instanceof Error ? error.message : String(error))
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
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) {
        setOpen(false)
        form.reset()
        setSelectedOrgId('')
        setSelectedEntryIds(new Set())
        setSubmitError(null)
      } else {
        setOpen(open)
      }
    }}>
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

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void form.handleSubmit()
          }}
          className="flex flex-col flex-1"
        >
        <ScrollArea className="flex-1">
          <div className="px-6 py-6 space-y-6 pb-4">
            <div className="space-y-6">
          <form.Field
            name="title"
            validators={{
              onChange: createTimeSheetSchema.shape.title,
              onBlur: createTimeSheetSchema.shape.title,
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
                {field.state.meta.isTouched && field.state.meta.errors && field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-destructive">
                    {typeof field.state.meta.errors[0] === 'string'
                      ? field.state.meta.errors[0]
                      : field.state.meta.errors[0].message}
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
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  placeholder="Optional notes about this time sheet"
                  rows={3}
                />
              </div>
            )}
          </form.Field>

          <div className="grid grid-cols-2 gap-4">
            <form.Field
              name="startDate"
              validators={{
                onChange: createTimeSheetSchema.shape.startDate,
                onBlur: createTimeSheetSchema.shape.startDate,
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <label htmlFor={field.name} className="text-sm font-medium">
                    Start Date *
                  </label>
                  <Input
                    id={field.name}
                    type="date"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors && field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">
                      {typeof field.state.meta.errors[0] === 'string'
                        ? field.state.meta.errors[0]
                        : field.state.meta.errors[0].message}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field
              name="endDate"
              validators={{
                onChange: createTimeSheetSchema.shape.endDate,
                onBlur: createTimeSheetSchema.shape.endDate,
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <label htmlFor={field.name} className="text-sm font-medium">
                    End Date *
                  </label>
                  <Input
                    id={field.name}
                    type="date"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors && field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">
                      {typeof field.state.meta.errors[0] === 'string'
                        ? field.state.meta.errors[0]
                        : field.state.meta.errors[0].message}
                    </p>
                  )}
                </div>
              )}
            </form.Field>
          </div>

          <form.Field
            name="organisationId"
            validators={{
              onChange: createTimeSheetSchema.shape.organisationId,
              onBlur: createTimeSheetSchema.shape.organisationId,
            }}
          >
            {(field) => {
              const organisationOptions = organisations.map((org: any) => ({
                value: org.id,
                label: org.name,
              }))

              return (
                <div className="space-y-2">
                  <label htmlFor={field.name} className="text-sm font-medium">
                    Organisation *
                  </label>
                  <Combobox
                    options={organisationOptions}
                    value={field.state.value}
                    onChange={(value) => {
                      field.handleChange(value)
                      setSelectedOrgId(value)
                      setSelectedEntryIds(new Set())
                    }}
                    onBlur={field.handleBlur}
                    placeholder="Select organisation..."
                    searchPlaceholder="Search organisations..."
                    emptyText="No organisation found."
                    className="w-full"
                  />
                  {field.state.meta.isTouched && field.state.meta.errors && field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">
                      {typeof field.state.meta.errors[0] === 'string'
                        ? field.state.meta.errors[0]
                        : field.state.meta.errors[0].message}
                    </p>
                  )}
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
                      if (selectedEntryIds.size === availableEntries.length) {
                        setSelectedEntryIds(new Set())
                      } else {
                        setSelectedEntryIds(new Set(availableEntries.map((e: any) => e.id)))
                      }
                    }}
                  >
                    {selectedEntryIds.size === availableEntries.length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </div>

              {availableEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  No available time entries for this organisation.
                </p>
              ) : (
                <div className="space-y-2">
                  {availableEntries.map((entry: any) => {
                    const toggleEntry = () => {
                      const newSet = new Set(selectedEntryIds)
                      if (newSet.has(entry.id)) {
                        newSet.delete(entry.id)
                      } else {
                        newSet.add(entry.id)
                      }
                      setSelectedEntryIds(newSet)
                    }

                    return (
                      <div
                        key={entry.id}
                        className="flex items-start gap-3 p-3 bg-background rounded-md border hover:bg-accent/50 cursor-pointer transition-colors"
                        onClick={toggleEntry}
                      >
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedEntryIds.has(entry.id)}
                            onCheckedChange={toggleEntry}
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-baseline gap-2">
                            <span className="font-medium text-sm">{entry.title}</span>
                            <span className="text-xs text-muted-foreground">{entry.date}</span>
                          </div>
                          {entry.description && (
                            <p className="text-xs text-muted-foreground">{entry.description}</p>
                          )}
                        </div>
                        <div className="text-sm font-medium tabular-nums whitespace-nowrap">
                          {entry.hours}h
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {selectedEntryIds.size > 0 && (
                <p className="text-sm text-muted-foreground">
                  {selectedEntryIds.size} {selectedEntryIds.size === 1 ? 'entry' : 'entries'} selected
                </p>
              )}
            </div>
          )}
            </div>
          </div>
        </ScrollArea>

        {submitError && (
          <div className="px-6 py-3 bg-destructive/10 border-t border-destructive/20">
            <p className="text-sm text-destructive">{submitError}</p>
          </div>
        )}

        <DialogFooter className="px-6 pb-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting, state.isTouched]}
          >
            {([canSubmit, isSubmitting, isTouched]) => (
              <Button type="submit" disabled={!isTouched || !canSubmit || isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Time Sheet'}
              </Button>
            )}
          </form.Subscribe>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
