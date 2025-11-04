import { createFileRoute, Link, Outlet, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState, useMemo } from 'react'
import { type ColumnDef, type Row } from '@tanstack/react-table'
import { FileText, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { cn } from '@/lib/utils'
import { createTimeSheetSchema, type TimeSheet, type Organisation, type Project, type TimeEntry } from '@/schemas'
import type { TimeSheetSummary } from '@/types'
import { DataTable } from '@/components/DataTable'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

// Server Functions
const getAllDataFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { timeSheetRepository } = await import('@/server/repositories/timeSheet.repository')
  const { organisationRepository } = await import('@/server/repositories/organisation.repository')
  const { projectRepository } = await import('@/server/repositories/project.repository')
  const { timeEntryRepository } = await import('@/server/repositories/timeEntry.repository')

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
    timeSheets: JSON.parse(JSON.stringify(timeSheets)),
    organisations: JSON.parse(JSON.stringify(organisations)),
    projects: JSON.parse(JSON.stringify(projects)),
    timeEntries: JSON.parse(JSON.stringify(timeEntries)),
    sheetsWithData: JSON.parse(JSON.stringify(sheetsWithData)),
  }
})

const createTimeSheetFn = createServerFn({ method: 'POST' })
  .inputValidator(createTimeSheetSchema)
  .handler(async ({ data }) => {
    const { timeSheetRepository } = await import('@/server/repositories/timeSheet.repository')
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
      createdAt: now,
      updatedAt: now,
    }
    return await timeSheetRepository.create(sheet)
  })

const deleteTimeSheetFn = createServerFn({ method: 'POST' }).handler(
  async ({ id }: { id: string }) => {
    const { timeSheetRepository } = await import('@/server/repositories/timeSheet.repository')
    return await timeSheetRepository.delete(id)
  }
)

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
      const project = data.projects.find((p: any) => p.id === sheet.projectId)

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
      accessorKey: 'projectName',
      header: 'Project',
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
        <AddTimeSheetSheet
          organisations={data.organisations}
          projects={data.projects}
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

function AddTimeSheetSheet({
  organisations,
  projects,
}: {
  organisations: any[]
  projects: any[]
}) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const form = useForm({
    defaultValues: {
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      organisationId: '',
      projectId: '',
    },
    validatorAdapter: zodValidator(),
    validators: {
      onSubmit: createTimeSheetSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await createTimeSheetFn({
          data: {
            title: value.title,
            description: value.description,
            startDate: value.startDate || undefined,
            endDate: value.endDate || undefined,
            organisationId: value.organisationId || undefined,
            projectId: value.projectId || undefined,
          },
        })
        setOpen(false)
        form.reset()
        router.invalidate()
      } catch (error) {
        console.error('Error creating time sheet:', error)
      }
    },
  })

  return (
    <Sheet open={open} onOpenChange={(open) => {
      if (!open) {
        setOpen(false)
        form.reset()
      } else {
        setOpen(open)
      }
    }}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Time Sheet
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="space-y-3 pb-6 border-b">
          <SheetTitle>Create Time Sheet</SheetTitle>
          <SheetDescription>
            Create a new time sheet to organize time entries for approval
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
          className="space-y-6 py-6 px-1"
        >
          <form.Field name="title" validators={{
            onChange: ({ value }) => !value ? 'Title is required' : undefined,
          }}>
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
                {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-red-500">{field.state.meta.errors[0]}</p>
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
                  <label htmlFor={field.name} className="text-sm font-medium">
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
                  <label htmlFor={field.name} className="text-sm font-medium">
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

          <form.Field name="organisationId">
            {(field) => (
              <div className="space-y-2">
                <label htmlFor={field.name} className="text-sm font-medium">
                  Organisation (optional)
                </label>
                <select
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value)
                    form.setFieldValue('projectId', '')
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="">None</option>
                  {organisations.map((org: any) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </form.Field>

          <form.Field name="projectId">
            {(field) => {
              const selectedOrg = form.getFieldValue('organisationId')
              const availableProjects = selectedOrg
                ? projects.filter((p: any) => p.organisationId === selectedOrg)
                : []

              return (
                <div className="space-y-2">
                  <label htmlFor={field.name} className="text-sm font-medium">
                    Project (optional)
                  </label>
                  <select
                    id={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    disabled={!selectedOrg}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">
                      {selectedOrg ? 'None' : 'Select organisation first'}
                    </option>
                    {availableProjects.map((proj: any) => (
                      <option key={proj.id} value={proj.id}>
                        {proj.name}
                      </option>
                    ))}
                  </select>
                </div>
              )
            }}
          </form.Field>

          <div className="flex gap-3 justify-end pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Time Sheet</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
