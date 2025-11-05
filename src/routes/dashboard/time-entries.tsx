import { createFileRoute, useNavigate, useRouter, Outlet } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useMemo, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { CheckCircle, XCircle, Plus, X } from 'lucide-react'
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { organisationRepository } from '@/repositories/organisation.repository'
import { projectRepository } from '@/repositories/project.repository'
import { timeEntryRepository } from '@/repositories/timeEntry.repository'
import { quickTimeEntrySchema, type TimeEntry } from '@/schemas'
import { DataTable } from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'

// Helper functions
function timeToHours(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours + (minutes || 0) / 60
}

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
    hour12: true
  }
  return date.toLocaleString('en-US', options)
}

// Server functions
const getAllDataFn = createServerFn({ method: 'GET' }).handler(async () => {
  const organisations = await organisationRepository.findAll()
  const projects = await projectRepository.findAll()
  const timeEntries = await timeEntryRepository.findAll()

  return {
    organisations: organisations,
    projects: projects,
    timeEntries: timeEntries,
  }
})

const createTimeEntryFn = createServerFn({ method: 'POST' })
  .inputValidator(quickTimeEntrySchema)
  .handler(async ({ data }) => {
    const timeEntry: TimeEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      projectId: data.projectId,
      organisationId: data.organisationId,
      title: data.title,
      description: data.description || '',
      hours: data.hours,
      date: data.date,
      billed: false,
      createdAt: new Date().toISOString(),
    }
    return await timeEntryRepository.create(timeEntry)
  })

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

// Route definition
export const Route = createFileRoute('/dashboard/time-entries')({
  component: TimeEntriesPage,
  loader: () => getAllDataFn(),
})

type TimeEntryWithDetails = {
  id: string
  date: string
  organisationName: string
  projectName: string
  title: string
  hours: number
  approvedDate?: string
}

function TimeEntriesPage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate({ from: Route.fullPath })
  const [filterOrganisationId, setFilterOrganisationId] = useState<string>('')
  const [filterProjectId, setFilterProjectId] = useState<string>('')

  const timeEntriesWithDetails = useMemo(() => {
    return data.timeEntries.map((entry: any) => {
      const organisation = data.organisations.find((c: any) => c.id === entry.organisationId)
      const project = data.projects.find((p: any) => p.id === entry.projectId)
      return {
        id: entry.id,
        date: entry.date,
        organisationName: organisation?.name || '',
        projectName: project?.name || '',
        title: entry.title,
        hours: entry.hours,
        approvedDate: entry.approvedDate,
        organisationId: entry.organisationId,
        projectId: entry.projectId,
      }
    })
  }, [data])

  const filteredTimeEntries = useMemo(() => {
    let filtered = timeEntriesWithDetails

    if (filterOrganisationId) {
      filtered = filtered.filter(entry => entry.organisationId === filterOrganisationId)
    }

    if (filterProjectId) {
      filtered = filtered.filter(entry => entry.projectId === filterProjectId)
    }

    return filtered
  }, [timeEntriesWithDetails, filterOrganisationId, filterProjectId])

  const organisationOptions: ComboboxOption[] = useMemo(() => {
    return data.organisations.map((org: any) => ({
      value: org.id,
      label: org.name,
    }))
  }, [data.organisations])

  const projectOptions: ComboboxOption[] = useMemo(() => {
    const projects = filterOrganisationId
      ? data.projects.filter((p: any) => p.organisationId === filterOrganisationId)
      : data.projects

    return projects.map((proj: any) => ({
      value: proj.id,
      label: proj.name,
    }))
  }, [data.projects, filterOrganisationId])

  const handleOrganisationChange = (value: string) => {
    setFilterOrganisationId(value)
    // Clear project filter if organisation changes
    if (filterProjectId) {
      const selectedProject = data.projects.find((p: any) => p.id === filterProjectId)
      if (selectedProject && selectedProject.organisationId !== value) {
        setFilterProjectId('')
      }
    }
  }

  const clearFilters = () => {
    setFilterOrganisationId('')
    setFilterProjectId('')
  }

  const hasActiveFilters = filterOrganisationId || filterProjectId

  const columns: ColumnDef<TimeEntryWithDetails>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
    },
    {
      accessorKey: 'organisationName',
      header: 'Organisation',
    },
    {
      accessorKey: 'projectName',
      header: 'Project',
    },
    {
      accessorKey: 'title',
      header: 'Title',
    },
    {
      accessorKey: 'hours',
      header: 'Time',
      cell: ({ getValue }) => {
        const hours = getValue() as number
        return hoursToTime(hours)
      },
    },
    {
      id: 'approved-status',
      accessorKey: 'approvedDate',
      header: 'Approved',
      cell: ({ getValue }) => {
        const approvedDate = getValue() as string | undefined
        return (
          <div className="flex items-center justify-center">
            {approvedDate ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-300" />
            )}
          </div>
        )
      },
    },
    {
      id: 'approved-date',
      accessorKey: 'approvedDate',
      header: 'Approved Date',
      cell: ({ getValue }) => {
        const approvedDate = getValue() as string | undefined
        return approvedDate ? formatDateTime(approvedDate) : '-'
      },
    },
  ]

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Time Entries</h1>
        <QuickTimeEntrySheet organisations={data.organisations} projects={data.projects} />
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Filter by:</span>
          <Combobox
            options={organisationOptions}
            value={filterOrganisationId}
            onChange={handleOrganisationChange}
            placeholder="Organisation"
            searchPlaceholder="Search organisations..."
            emptyText="No organisation found."
            className="w-[200px]"
          />
          <Combobox
            options={projectOptions}
            value={filterProjectId}
            onChange={setFilterProjectId}
            placeholder="Project"
            searchPlaceholder="Search projects..."
            emptyText="No project found."
            className="w-[200px]"
          />
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8"
          >
            <X className="mr-1 h-4 w-4" />
            Clear filters
          </Button>
        )}
        <div className="text-sm text-muted-foreground ml-auto">
          Showing {filteredTimeEntries.length} of {timeEntriesWithDetails.length} entries
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredTimeEntries}
        getRowId={(row) => row.id}
        onRowDoubleClick={(row) => {
          navigate({ to: '/dashboard/time-entries/$id', params: { id: row.original.id } })
        }}
      />

      <Outlet />
    </div>
  )
}

function QuickTimeEntrySheet({ organisations, projects }: { organisations: any[]; projects: any[] }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const form = useForm({
    defaultValues: {
      title: '',
      time: '01:00',
      date: new Date().toISOString().split('T')[0] ?? '',
      description: '',
      organisationId: '',
      projectId: '',
    },
    onSubmit: async ({ value }) => {
      const hours = timeToHours(value.time)
      await createTimeEntryFn({
        data: {
          title: value.title,
          hours: hours,
          date: value.date,
          description: value.description,
          organisationId: value.organisationId,
          projectId: value.projectId,
        }
      })
      setOpen(false)
      router.invalidate()
    },
  })

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Quick Entry
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="space-y-3 pb-6 border-b">
          <SheetTitle>Add Time Entry</SheetTitle>
          <SheetDescription>
            Log your time with full details
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
          <form.Field name="title">
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
                  placeholder="What did you work on?"
                />
                {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-red-500">
                    {field.state.meta.errors.map((err) =>
                      typeof err === 'string' ? err : err.message || JSON.stringify(err)
                    ).join(', ')}
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
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Additional details (optional)"
                />
              </div>
            )}
          </form.Field>

          <div className="grid grid-cols-2 gap-4">
            <form.Field name="time">
              {(field) => (
                <div className="space-y-2">
                  <label htmlFor={field.name} className="text-sm font-medium">
                    Time (h:mm) *
                  </label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="hours"
                      type="number"
                      min="0"
                      max="99"
                      value={parseInt(field.state.value.split(':')[0]) || 0}
                      onChange={(e) => {
                        const hours = e.target.value || '0'
                        const minutes = field.state.value.split(':')[1] || '00'
                        field.handleChange(`${hours.padStart(2, '0')}:${minutes}`)
                      }}
                      className="w-20"
                      placeholder="1"
                    />
                    <span className="text-sm">h</span>
                    <Input
                      id="minutes"
                      type="number"
                      min="0"
                      max="59"
                      step="15"
                      value={parseInt(field.state.value.split(':')[1]) || 0}
                      onChange={(e) => {
                        const hours = field.state.value.split(':')[0] || '00'
                        const minutes = e.target.value || '0'
                        field.handleChange(`${hours}:${minutes.padStart(2, '0')}`)
                      }}
                      className="w-20"
                      placeholder="00"
                    />
                    <span className="text-sm">min</span>
                  </div>
                  {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-500">
                      {field.state.meta.errors.map((err) =>
                        typeof err === 'string' ? err : err.message || JSON.stringify(err)
                      ).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="date">
              {(field) => (
                <div className="space-y-2">
                  <label htmlFor={field.name} className="text-sm font-medium">
                    Date *
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
                  Organisation
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
                  <option value="">Select organisation (optional)</option>
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
                    Project
                  </label>
                  <select
                    id={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    disabled={!selectedOrg}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">
                      {selectedOrg ? 'Select project (optional)' : 'Select organisation first'}
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Save Entry
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

