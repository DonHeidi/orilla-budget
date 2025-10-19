import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState, useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Clock, Users, FolderKanban, ChevronDown, Plus, Moon, Sun, Monitor } from 'lucide-react'
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { cn } from '@/lib/utils'
import { organisationRepository } from '@/server/repositories/organisation.repository'
import { accountRepository } from '@/server/repositories/account.repository'
import { projectRepository } from '@/server/repositories/project.repository'
import { timeEntryRepository } from '@/server/repositories/timeEntry.repository'
import type { Organisation, Account, Project, TimeEntry } from '@/types'
import { quickTimeEntrySchema, createTimeEntrySchema } from '@/schemas'
import { DataTable } from '@/components/DataTable'
import { useTheme } from '@/components/theme-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

// Server Functions
const getAllDataFn = createServerFn({ method: 'GET' }).handler(async () => {
  const organisations = await organisationRepository.findAll()
  const accounts = await accountRepository.findAll()
  const projects = await projectRepository.findAll()
  const timeEntries = await timeEntryRepository.findAll()

  // Return plain objects to ensure serializability
  return {
    organisations: JSON.parse(JSON.stringify(organisations)),
    accounts: JSON.parse(JSON.stringify(accounts)),
    projects: JSON.parse(JSON.stringify(projects)),
    timeEntries: JSON.parse(JSON.stringify(timeEntries)),
  }
})

const createOrganisationFn = createServerFn({ method: 'POST' }).handler(
  async (data: { name: string; totalBudgetHours: number }) => {
    const organisation: Organisation = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: data.name,
      totalBudgetHours: data.totalBudgetHours,
      createdAt: new Date().toISOString(),
    }
    return await organisationRepository.create(organisation)
  }
)

const createAccountFn = createServerFn({ method: 'POST' }).handler(
  async (data: { organisationId: string; name: string; email: string }) => {
    const accessCode = Math.random().toString(36).substring(2, 10).toUpperCase()
    const account: Account = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      organisationId: data.organisationId,
      name: data.name,
      email: data.email,
      accessCode,
      createdAt: new Date().toISOString(),
    }
    return await accountRepository.create(account)
  }
)

const createProjectFn = createServerFn({ method: 'POST' }).handler(
  async (data: { organisationId: string; name: string; description: string; budgetHours: number }) => {
    const project: Project = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      organisationId: data.organisationId,
      name: data.name,
      description: data.description,
      budgetHours: data.budgetHours,
      createdAt: new Date().toISOString(),
    }
    return await projectRepository.create(project)
  }
)

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
      createdAt: new Date().toISOString(),
    }
    return await timeEntryRepository.create(timeEntry)
  })

export const Route = createFileRoute('/admin')({
  component: AdminDashboard,
  loader: () => getAllDataFn(),
})

function AdminDashboard() {
  const data = Route.useLoaderData()
  const [activeView, setActiveView] = useState<'time' | 'organisations' | 'projects'>('time')
  const [timeEntryDialogOpen, setTimeEntryDialogOpen] = useState(false)
  const [timeMenuOpen, setTimeMenuOpen] = useState(true)
  const { theme, setTheme } = useTheme()

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Admin Dashboard</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      type="button"
                      onClick={() => {
                        if (activeView !== 'time') {
                          setActiveView('time')
                          setTimeMenuOpen(true)
                        } else {
                          setTimeMenuOpen((prev) => !prev)
                        }
                      }}
                      isActive={activeView === 'time'}
                      data-state={timeMenuOpen ? 'open' : 'closed'}
                      aria-expanded={timeMenuOpen}
                      aria-controls="time-entry-submenu"
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      <span>Time Entries</span>
                      <ChevronDown
                        className={cn(
                          'ml-auto h-4 w-4 transition-transform duration-200 ease-linear',
                          timeMenuOpen && 'rotate-180'
                        )}
                      />
                    </SidebarMenuButton>
                    {timeMenuOpen && (
                      <SidebarMenuSub id="time-entry-submenu">
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton onClick={() => setTimeEntryDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            <span>New Entry</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveView('organisations')}
                      isActive={activeView === 'organisations'}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      <span>Organisations & Accounts</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveView('projects')}
                      isActive={activeView === 'projects'}
                    >
                      <FolderKanban className="mr-2 h-4 w-4" />
                      <span>Projects</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => {
                    if (theme === 'light') setTheme('dark')
                    else if (theme === 'dark') setTheme('system')
                    else setTheme('light')
                  }}
                  tooltip={
                    theme === 'light'
                      ? 'Switch to dark mode'
                      : theme === 'dark'
                      ? 'Switch to system mode'
                      : 'Switch to light mode'
                  }
                >
                  {theme === 'light' ? (
                    <>
                      <Sun className="mr-2 h-4 w-4" />
                      <span>Light</span>
                    </>
                  ) : theme === 'dark' ? (
                    <>
                      <Moon className="mr-2 h-4 w-4" />
                      <span>Dark</span>
                    </>
                  ) : (
                    <>
                      <Monitor className="mr-2 h-4 w-4" />
                      <span>System</span>
                    </>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="text-lg font-semibold">Admin Dashboard</h1>
          </header>

          <div className="flex flex-1 flex-col gap-4 p-4">
            {activeView === 'time' && <TimeEntriesTab data={data} />}
            {activeView === 'organisations' && <OrganisationsTab data={data} />}
            {activeView === 'projects' && <ProjectsTab data={data} />}
          </div>
        </SidebarInset>
      </div>
      <QuickTimeEntryDialog
        organisations={data.organisations}
        projects={data.projects}
        open={timeEntryDialogOpen}
        onOpenChange={setTimeEntryDialogOpen}
      />
    </SidebarProvider>
  )
}

type TimeEntryWithDetails = {
  id: string
  date: string
  organisationName: string
  projectName: string
  title: string
  hours: number
}

function TimeEntriesTab({ data }: { data: any }) {
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
      }
    })
  }, [data])

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
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-gray-900">Time Entries</h2>
        <QuickTimeEntrySheet organisations={data.organisations} projects={data.projects} />
      </div>

      <DataTable columns={columns} data={timeEntriesWithDetails} />
    </div>
  )
}

// Helper function to convert hh:mm to decimal hours
function timeToHours(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours + (minutes || 0) / 60
}

// Helper function to convert decimal hours to hh:mm
function hoursToTime(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}:${m.toString().padStart(2, '0')}`
}

function QuickTimeEntryDialog({
  organisations,
  projects,
  open,
  onOpenChange,
}: {
  organisations: any[]
  projects: any[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [showAdvanced, setShowAdvanced] = useState(false)

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
      onOpenChange?.(false)
      window.location.reload()
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Time Entry</DialogTitle>
          <DialogDescription>
            Quickly log your time. You can add more details later.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
          className="space-y-4"
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
                    Date
                  </label>
                  <Input
                    id={field.name}
                    type="date"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
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
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full"
          >
            {showAdvanced ? (
              <>
                <ChevronUp className="mr-2 h-4 w-4" />
                Hide additional details
              </>
            ) : (
              <>
                <ChevronDown className="mr-2 h-4 w-4" />
                Add more details
              </>
            )}
          </Button>

          {showAdvanced && (
            <div className="space-y-4 pt-2 border-t">
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
                      placeholder="Additional details..."
                      rows={3}
                    />
                  </div>
                )}
              </form.Field>

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
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    >
                      <option value="">Select an organisation</option>
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
                  const selectedOrgId = form.getFieldValue('organisationId')
                  const availableProjects = projects.filter((p: any) => p.organisationId === selectedOrgId)

                  return (
                    <div className="space-y-2">
                      <label htmlFor={field.name} className="text-sm font-medium">
                        Project
                      </label>
                      <select
                        id={field.name}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        disabled={!selectedOrgId}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                      >
                        <option value="">Select a project</option>
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
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Save Entry
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function QuickTimeEntrySheet({ organisations, projects }: { organisations: any[]; projects: any[] }) {
  const [open, setOpen] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

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
      window.location.reload()
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

function OrganisationsTab({ data }: { data: any }) {
  const [showForm, setShowForm] = useState<'organisation' | 'account' | null>(null)

  return (
    <div>
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => setShowForm(showForm === 'organisation' ? null : 'organisation')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm === 'organisation' ? 'Cancel' : 'Add Organisation'}
        </button>
        <button
          onClick={() => setShowForm(showForm === 'account' ? null : 'account')}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          {showForm === 'account' ? 'Cancel' : 'Add Account'}
        </button>
      </div>

      {showForm === 'organisation' && <OrganisationForm />}
      {showForm === 'account' && <AccountForm organisations={data.organisations} />}

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Organisations</h2>
      <div className="space-y-4">
        {data.organisations.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
            No organisations yet
          </div>
        ) : (
          data.organisations.map((organisation: any) => {
            const organisationAccounts = data.accounts.filter((a: any) => a.organisationId === organisation.id)
            const organisationTimeEntries = data.timeEntries.filter((t: any) => t.organisationId === organisation.id)
            const totalHours = organisationTimeEntries.reduce((sum: number, t: any) => sum + t.hours, 0)

            return (
              <div key={organisation.id} className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{organisation.name}</h3>
                <p className="text-gray-600 mb-4">
                  Budget: {organisation.totalBudgetHours}h | Used: {totalHours.toFixed(2)}h | Remaining:{' '}
                  {(organisation.totalBudgetHours - totalHours).toFixed(2)}h
                </p>

                <h4 className="font-medium text-gray-900 mb-2">Accounts:</h4>
                {organisationAccounts.length === 0 ? (
                  <p className="text-gray-500 text-sm">No accounts yet</p>
                ) : (
                  <ul className="space-y-1">
                    {organisationAccounts.map((account: any) => (
                      <li key={account.id} className="text-sm text-gray-700">
                        <span className="font-medium">{account.name}</span> ({account.email}) - Access
                        Code: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{account.accessCode}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function OrganisationForm() {
  const [formData, setFormData] = useState({
    name: '',
    totalBudgetHours: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    await createOrganisationFn({
      name: formData.name,
      totalBudgetHours: parseFloat(formData.totalBudgetHours),
    })

    window.location.reload()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow mb-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Organisation Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Google"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total Budget (hours)
          </label>
          <input
            type="number"
            step="0.5"
            value={formData.totalBudgetHours}
            onChange={(e) => setFormData({ ...formData, totalBudgetHours: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <button
        type="submit"
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Add Organisation
      </button>
    </form>
  )
}

function AccountForm({ organisations }: { organisations: any[] }) {
  const [formData, setFormData] = useState({
    organisationId: '',
    name: '',
    email: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    await createAccountFn({
      organisationId: formData.organisationId,
      name: formData.name,
      email: formData.email,
    })

    window.location.reload()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow mb-6">
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Organisation</label>
          <select
            value={formData.organisationId}
            onChange={(e) => setFormData({ ...formData, organisationId: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select an organisation</option>
            {organisations.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Larry Page"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <button
        type="submit"
        className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        Add Account
      </button>
    </form>
  )
}

type ProjectWithDetails = {
  id: string
  name: string
  description: string
  budgetHours: number
  usedHours: number
  remainingHours: number
}

function ProjectsTab({ data }: { data: any }) {
  const [showForm, setShowForm] = useState(false)

  const columns: ColumnDef<ProjectWithDetails>[] = [
    {
      accessorKey: 'name',
      header: 'Project Name',
      cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span>,
    },
    {
      accessorKey: 'description',
      header: 'Description',
    },
    {
      accessorKey: 'budgetHours',
      header: 'Budget',
      cell: ({ getValue }) => `${getValue()}h`,
    },
    {
      accessorKey: 'usedHours',
      header: 'Used',
      cell: ({ getValue }) => `${(getValue() as number).toFixed(2)}h`,
    },
    {
      accessorKey: 'remainingHours',
      header: 'Remaining',
      cell: ({ getValue }) => `${(getValue() as number).toFixed(2)}h`,
    },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-gray-900">Projects</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? 'Cancel' : 'Add Project'}
        </button>
      </div>

      {showForm && <ProjectForm organisations={data.organisations} />}

      <div className="space-y-6">
        {data.organisations.map((organisation: any) => {
          const organisationProjects = data.projects.filter((p: any) => p.organisationId === organisation.id)
          if (organisationProjects.length === 0) return null

          const projectsWithDetails: ProjectWithDetails[] = organisationProjects.map((project: any) => {
            const projectTimeEntries = data.timeEntries.filter((t: any) => t.projectId === project.id)
            const totalHours = projectTimeEntries.reduce((sum: number, t: any) => sum + t.hours, 0)

            return {
              id: project.id,
              name: project.name,
              description: project.description,
              budgetHours: project.budgetHours,
              usedHours: totalHours,
              remainingHours: project.budgetHours - totalHours,
            }
          })

          return (
            <div key={organisation.id}>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{organisation.name}</h3>
              <DataTable columns={columns} data={projectsWithDetails} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ProjectForm({ organisations }: { organisations: any[] }) {
  const [formData, setFormData] = useState({
    organisationId: '',
    name: '',
    description: '',
    budgetHours: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    await createProjectFn({
      organisationId: formData.organisationId,
      name: formData.name,
      description: formData.description,
      budgetHours: parseFloat(formData.budgetHours),
    })

    window.location.reload()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow mb-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Organisation</label>
          <select
            value={formData.organisationId}
            onChange={(e) => setFormData({ ...formData, organisationId: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select an organisation</option>
            {organisations.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Budget (hours)</label>
          <input
            type="number"
            step="0.5"
            value={formData.budgetHours}
            onChange={(e) => setFormData({ ...formData, budgetHours: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <button
        type="submit"
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Add Project
      </button>
    </form>
  )
}
