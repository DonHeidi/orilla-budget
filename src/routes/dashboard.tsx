import { createFileRoute, Link, Outlet, redirect, useRouter } from '@tanstack/react-router'
import { createServerFn, useServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { useState, useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import {
  Clock,
  Users,
  FolderKanban,
  ChevronDown,
  Plus,
  Moon,
  Sun,
  Monitor,
  CheckCircle,
  XCircle,
  ChevronUp,
  FileText,
  LogOut,
  Contact,
} from 'lucide-react'
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { cn } from '@/lib/utils'
import { authRepository } from '@/repositories/auth.repository'
import { organisationRepository } from '@/repositories/organisation.repository'
import { accountRepository } from '@/repositories/account.repository'
import { projectRepository } from '@/repositories/project.repository'
import { timeEntryRepository } from '@/repositories/timeEntry.repository'
import {
  quickTimeEntrySchema,
  type Organisation,
  type Account,
  type Project,
  type TimeEntry,
} from '@/schemas'
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
  SidebarHeader,
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
import { AuthProvider } from '@/components/auth-provider'
import { getCurrentSessionFn, logoutFn } from '@/lib/auth-server'
import type { AuthSession } from '@/lib/auth'
import { hasSystemPermission } from '@/lib/permissions'

// Server Functions
const getAllDataFn = createServerFn({ method: 'GET' }).handler(async () => {
  const organisations = await organisationRepository.findAll()
  const accounts = await accountRepository.findAll()
  const projects = await projectRepository.findAll()
  const timeEntries = await timeEntryRepository.findAll()

  // Return plain objects to ensure serializability
  return {
    organisations: organisations,
    accounts: accounts,
    projects: projects,
    timeEntries: timeEntries,
  }
})

/**
 * Generate a slug from text
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const createOrganisationFn = createServerFn({ method: 'POST' })
  .inputValidator((data: {
    name: string
    contactName: string
    contactEmail: string
    totalBudgetHours: number
  }) => data)
  .handler(async ({ data }) => {
    const request = getRequest()

    // Create organization via Better Auth API
    const result = await authRepository.createOrganization({
      name: data.name,
      slug: slugify(data.name),
    })

    if (!result) {
      throw new Error('Failed to create organization')
    }

    // Update with custom contact fields
    await organisationRepository.updateContactFields(result.id, {
      contactName: data.contactName,
      contactEmail: data.contactEmail,
    })

    // Fetch the updated organization
    const org = await organisationRepository.findById(result.id)
    if (!org) {
      throw new Error('Failed to fetch created organization')
    }

    return org
  })

const createAccountFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { organisationId: string; name: string; email: string }) => data)
  .handler(async ({ data }) => {
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
  })

const createProjectFn = createServerFn({ method: 'POST' })
  .inputValidator((data: {
    organisationId: string
    name: string
    description: string
    category: 'budget' | 'fixed'
    budgetHours: number
  }) => data)
  .handler(async ({ data }) => {
    const request = getRequest()

    // Create team (project) via Better Auth API
    const result = await authRepository.createTeam({
      name: data.name,
      organizationId: data.organisationId,
    })

    if (!result) {
      throw new Error('Failed to create project')
    }

    // Update with custom project fields
    await projectRepository.updateCustomFields(result.id, {
      description: data.description,
      category: data.category,
      budgetHours: data.budgetHours,
    })

    // Fetch the updated project
    const project = await projectRepository.findById(result.id)
    if (!project) {
      throw new Error('Failed to fetch created project')
    }

    return project
  })

const createTimeEntryFn = createServerFn({ method: 'POST' })
  .inputValidator(quickTimeEntrySchema)
  .handler(async ({ data }) => {
    const session = await getCurrentSessionFn()
    if (!session.user) throw new Error('Unauthorized')

    const timeEntry: TimeEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      createdByUserId: session.user.id,
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

const updateTimeEntryFn = createServerFn({ method: 'POST' })
  .inputValidator((data: TimeEntry) => data)
  .handler(async ({ data }) => {
    console.log('Update data received:', data)
    const { id, createdAt, ...updateData } = data
    console.log('After destructuring - id:', id, 'updateData:', updateData)

    // Filter out undefined values
    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    )
    console.log('Clean update data:', cleanUpdateData)

    if (Object.keys(cleanUpdateData).length === 0) {
      throw new Error('No fields to update')
    }

    return await timeEntryRepository.update(id, cleanUpdateData)
  })

const updateProjectFn = createServerFn({ method: 'POST' })
  .inputValidator((data: Project) => data)
  .handler(async ({ data }) => {
    const request = getRequest()
    const { id, createdAt, organizationId, ...updateData } = data

    // Filter out undefined values
    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    ) as Record<string, unknown>

    if (Object.keys(cleanUpdateData).length === 0) {
      throw new Error('No fields to update')
    }

    // Use Better Auth API for name updates
    if (cleanUpdateData.name) {
      await authRepository.updateTeam(id, {
        name: cleanUpdateData.name as string,
      })
    }

    // Update custom fields via repository helper
    const customFields: Record<string, unknown> = {}
    if ('description' in cleanUpdateData) customFields.description = cleanUpdateData.description
    if ('category' in cleanUpdateData) customFields.category = cleanUpdateData.category
    if ('budgetHours' in cleanUpdateData) customFields.budgetHours = cleanUpdateData.budgetHours

    if (Object.keys(customFields).length > 0) {
      await projectRepository.updateCustomFields(id, customFields as { description?: string | null; category?: string | null; budgetHours?: number | null })
    }

    return await projectRepository.findById(id)
  })

const deleteProjectFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const request = getRequest()

    // Get the project to find its organization
    const project = await projectRepository.findById(data.id)
    if (!project) {
      throw new Error('Project not found')
    }

    // Delete via Better Auth API
    await authRepository.removeTeam(data.id)
  })

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
  beforeLoad: async () => {
    const session = await getCurrentSessionFn()
    if (!session.user) {
      throw redirect({ to: '/login' })
    }
    return { auth: session }
  },
  loader: () => getAllDataFn(),
})

function Dashboard() {
  const data = Route.useLoaderData()
  const routeContext = Route.useRouteContext() as { auth: AuthSession }
  const auth = routeContext.auth
  const router = useRouter()
  const [timeEntryDialogOpen, setTimeEntryDialogOpen] = useState(false)
  const [timeEntriesExpanded, setTimeEntriesExpanded] = useState(true)
  const { theme, setTheme } = useTheme()
  const logout = useServerFn(logoutFn)

  // Derive permissions from auth context (resolved server-side in beforeLoad)
  const user = auth.user
  const displayName = user?.pii?.name || user?.handle || user?.email || 'User'
  const canViewUsers = user && hasSystemPermission(user, 'users:view')
  const canViewOrganisations = user && hasSystemPermission(user, 'organisations:view')
  const hasProjects = auth.projectMemberships.length > 0

  const handleLogout = async () => {
    await logout()
    router.navigate({ to: '/login' })
  }

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  return (
    <AuthProvider
      initialUser={auth.user}
      initialMemberships={auth.projectMemberships}
    >
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <Sidebar>
            <SidebarHeader className="border-b px-4 py-3">
              <div>
                <p className="font-medium">Orilla Budget</p>
                <p className="text-sm text-muted-foreground">{displayName}</p>
                {hasProjects && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {auth.projectMemberships.length} project
                    {auth.projectMemberships.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </SidebarHeader>

            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Work</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <div className="flex items-center justify-between w-full">
                        <SidebarMenuButton asChild className="flex-1">
                          <Link to="/dashboard/time-entries">
                            <Clock className="mr-2 h-4 w-4" />
                            <span>Time Entries</span>
                          </Link>
                        </SidebarMenuButton>
                        <button
                          onClick={() => setTimeEntriesExpanded(!timeEntriesExpanded)}
                          className="p-1 hover:bg-sidebar-accent rounded mr-2"
                        >
                          {timeEntriesExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {timeEntriesExpanded && (
                        <SidebarMenuSub>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => setTimeEntryDialogOpen(true)}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              <span>Quick Entry</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link to="/dashboard/time-sheets">
                          <FileText className="mr-2 h-4 w-4" />
                          <span>Time Sheets</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link to="/dashboard/organisations">
                          <Users className="mr-2 h-4 w-4" />
                          <span>Organisations & Accounts</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link to="/dashboard/projects">
                          <FolderKanban className="mr-2 h-4 w-4" />
                          <span>Projects</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link to="/dashboard/contacts">
                          <Contact className="mr-2 h-4 w-4" />
                          <span>Teams & Contacts</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              {/* Admin section - only visible to users with admin permissions */}
              {(canViewUsers || canViewOrganisations) && (
                <SidebarGroup>
                  <SidebarGroupLabel>Administration</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {canViewUsers && (
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild>
                            <Link to="/dashboard/users">
                              <Users className="mr-2 h-4 w-4" />
                              <span>Users</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}
            </SidebarContent>

            <SidebarFooter>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={cycleTheme}
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
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={handleLogout} tooltip="Sign out">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
          </Sidebar>

          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <h1 className="text-lg font-semibold">Dashboard</h1>
            </header>

            <div className="flex flex-1 flex-col">
              <Outlet />
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
    </AuthProvider>
  )
}

type TimeEntryWithDetails = {
  id: string
  date: string
  organisationName: string
  projectName: string
  title: string
  hours: number
  approvedDate?: string
}

function TimeEntriesTab({ data }: { data: any }) {
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)

  const timeEntriesWithDetails = useMemo(() => {
    return data.timeEntries.map((entry: any) => {
      const organisation = data.organisations.find(
        (c: any) => c.id === entry.organisationId
      )
      const project = data.projects.find((p: any) => p.id === entry.projectId)
      return {
        id: entry.id,
        date: entry.date,
        organisationName: organisation?.name || '',
        projectName: project?.name || '',
        title: entry.title,
        hours: entry.hours,
        approvedDate: entry.approvedDate,
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
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-gray-900">Time Entries</h2>
        <QuickTimeEntrySheet
          organisations={data.organisations}
          projects={data.projects}
        />
      </div>

      <DataTable
        columns={columns}
        data={timeEntriesWithDetails}
        getRowId={(row) => row.id}
        onRowDoubleClick={(row) => {
          const fullEntry = data.timeEntries.find(
            (e: any) => e.id === row.original.id
          )
          if (fullEntry) {
            setSelectedEntry(fullEntry)
            setDetailSheetOpen(true)
          }
        }}
      />

      <TimeEntryDetailSheet
        entry={selectedEntry}
        organisations={data.organisations}
        projects={data.projects}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />
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

// Helper function to format ISO date to human-friendly format
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
  const [error, setError] = useState<string | null>(null)
  const createTimeEntry = useServerFn(createTimeEntryFn)
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
    validators: {
      onSubmit: ({ value }) => {
        if (!value.title.trim()) {
          return { fields: { title: 'Title is required' } }
        }
        const hours = timeToHours(value.time)
        if (hours <= 0) {
          return { fields: { time: 'Time must be greater than 0' } }
        }
        return undefined
      },
    },
    onSubmit: async ({ value }) => {
      setError(null)
      try {
        const hours = timeToHours(value.time)
        await createTimeEntry({
          data: {
            title: value.title,
            hours: hours,
            date: value.date,
            description: value.description,
            organisationId: value.organisationId,
            projectId: value.projectId,
          },
        })
        onOpenChange?.(false)
        router.invalidate()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create time entry')
      }
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
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}

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
                {field.state.meta.errors &&
                  field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-500">
                      {field.state.meta.errors
                        .map((err) =>
                          typeof err === 'string'
                            ? err
                            : err.message || JSON.stringify(err)
                        )
                        .join(', ')}
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
                        field.handleChange(
                          `${hours.padStart(2, '0')}:${minutes}`
                        )
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
                        field.handleChange(
                          `${hours}:${minutes.padStart(2, '0')}`
                        )
                      }}
                      className="w-20"
                      placeholder="00"
                    />
                    <span className="text-sm">min</span>
                  </div>
                  {field.state.meta.errors &&
                    field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-red-500">
                        {field.state.meta.errors
                          .map((err) =>
                            typeof err === 'string'
                              ? err
                              : err.message || JSON.stringify(err)
                          )
                          .join(', ')}
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
                  {field.state.meta.errors &&
                    field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-red-500">
                        {field.state.meta.errors
                          .map((err) =>
                            typeof err === 'string'
                              ? err
                              : err.message || JSON.stringify(err)
                          )
                          .join(', ')}
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
                  const availableProjects = projects.filter(
                    (p: any) => p.organisationId === selectedOrgId
                  )

                  return (
                    <div className="space-y-2">
                      <label
                        htmlFor={field.name}
                        className="text-sm font-medium"
                      >
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
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
            >
              Cancel
            </Button>
            <form.Subscribe selector={(state) => [state.isSubmitting]}>
              {([isSubmitting]) => (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Entry'}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function QuickTimeEntrySheet({
  organisations,
  projects,
}: {
  organisations: any[]
  projects: any[]
}) {
  const [open, setOpen] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const createTimeEntry = useServerFn(createTimeEntryFn)
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
    validators: {
      onSubmit: ({ value }) => {
        if (!value.title.trim()) {
          return { fields: { title: 'Title is required' } }
        }
        const hours = timeToHours(value.time)
        if (hours <= 0) {
          return { fields: { time: 'Time must be greater than 0' } }
        }
        return undefined
      },
    },
    onSubmit: async ({ value }) => {
      setError(null)
      try {
        const hours = timeToHours(value.time)
        await createTimeEntry({
          data: {
            title: value.title,
            hours: hours,
            date: value.date,
            description: value.description,
            organisationId: value.organisationId,
            projectId: value.projectId,
          },
        })
        setOpen(false)
        router.invalidate()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create time entry')
      }
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
          <SheetDescription>Log your time with full details</SheetDescription>
        </SheetHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
          className="space-y-6 py-6 px-1"
        >
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}

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
                {field.state.meta.errors &&
                  field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-500">
                      {field.state.meta.errors
                        .map((err) =>
                          typeof err === 'string'
                            ? err
                            : err.message || JSON.stringify(err)
                        )
                        .join(', ')}
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
                        field.handleChange(
                          `${hours.padStart(2, '0')}:${minutes}`
                        )
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
                        field.handleChange(
                          `${hours}:${minutes.padStart(2, '0')}`
                        )
                      }}
                      className="w-20"
                      placeholder="00"
                    />
                    <span className="text-sm">min</span>
                  </div>
                  {field.state.meta.errors &&
                    field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-red-500">
                        {field.state.meta.errors
                          .map((err) =>
                            typeof err === 'string'
                              ? err
                              : err.message || JSON.stringify(err)
                          )
                          .join(', ')}
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
                      {selectedOrg
                        ? 'Select project (optional)'
                        : 'Select organisation first'}
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
            <form.Subscribe selector={(state) => [state.isSubmitting]}>
              {([isSubmitting]) => (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Entry'}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function TimeEntryDetailSheet({
  entry,
  organisations,
  projects,
  open,
  onOpenChange,
}: {
  entry: TimeEntry | null
  organisations: any[]
  projects: any[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editedValues, setEditedValues] = useState<Partial<TimeEntry>>({})
  const updateTimeEntry = useServerFn(updateTimeEntryFn)

  if (!entry) return null

  const organisation = organisations.find(
    (o: any) => o.id === entry.organisationId
  )
  const project = projects.find((p: any) => p.id === entry.projectId)

  const currentValues = { ...entry, ...editedValues }

  const handleFieldClick = (fieldName: string) => {
    setEditingField(fieldName)
  }

  const handleFieldBlur = async () => {
    if (Object.keys(editedValues).length > 0) {
      // Save changes to server - send only the id and changed fields
      const updatePayload = {
        id: entry.id,
        createdAt: entry.createdAt,
        ...editedValues,
      }
      await updateTimeEntry({ data: updatePayload as TimeEntry })
      // Reset edited values
      setEditedValues({})
      // Reload the page to show updated data
      window.location.reload()
    }
    setEditingField(null)
  }

  const handleFieldChange = (fieldName: string, value: any) => {
    setEditedValues((prev) => ({ ...prev, [fieldName]: value }))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="space-y-3 pb-6 border-b">
          <SheetTitle>Time Entry Details</SheetTitle>
          <SheetDescription>
            View detailed information about this time entry
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Title</label>
              {editingField === 'title' ? (
                <Input
                  autoFocus
                  value={currentValues.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  onBlur={handleFieldBlur}
                  className="mt-1"
                />
              ) : (
                <p
                  className="text-base mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2"
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
              {editingField === 'description' ? (
                <textarea
                  autoFocus
                  value={currentValues.description}
                  onChange={(e) =>
                    handleFieldChange('description', e.target.value)
                  }
                  onBlur={handleFieldBlur}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm mt-1"
                  rows={3}
                />
              ) : (
                <p
                  className="text-base mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2 min-h-[1.5rem]"
                  onClick={() => handleFieldClick('description')}
                >
                  {currentValues.description || 'Click to add description...'}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Date
                </label>
                {editingField === 'date' ? (
                  <Input
                    autoFocus
                    type="date"
                    value={currentValues.date}
                    onChange={(e) => handleFieldChange('date', e.target.value)}
                    onBlur={handleFieldBlur}
                    className="mt-1"
                  />
                ) : (
                  <p
                    className="text-base mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2"
                    onClick={() => handleFieldClick('date')}
                  >
                    {currentValues.date}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">
                  Hours
                </label>
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
                      className="w-20"
                    />
                    <span className="text-sm">h</span>
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
                      className="w-20"
                    />
                    <span className="text-sm">min</span>
                  </div>
                ) : (
                  <p
                    className="text-base mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2"
                    onClick={() => handleFieldClick('hours')}
                  >
                    {hoursToTime(currentValues.hours)}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">
                Organisation
              </label>
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background mt-1"
                >
                  <option value="">None</option>
                  {organisations.map((org: any) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p
                  className="text-base mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2"
                  onClick={() => handleFieldClick('organisationId')}
                >
                  {organisation?.name || 'Click to select organisation...'}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">
                Project
              </label>
              {editingField === 'projectId' ? (
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
                <p
                  className="text-base mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2"
                  onClick={() => handleFieldClick('projectId')}
                >
                  {project?.name || 'Click to select project...'}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Approved
                </label>
                <div className="flex items-center mt-1">
                  {entry.approvedDate ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      <span className="text-base">Yes</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-base">No</span>
                    </>
                  )}
                </div>
              </div>

              {entry.approvedDate && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Approved Date
                  </label>
                  <p className="text-base mt-1">
                    {formatDateTime(entry.approvedDate)}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">
                Created
              </label>
              <p className="text-base mt-1">
                {formatDateTime(entry.createdAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-6 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function OrganisationsTab({ data }: { data: any }) {
  const [showForm, setShowForm] = useState<'organisation' | 'account' | null>(
    null
  )

  return (
    <div>
      <div className="flex gap-4 mb-4">
        <button
          onClick={() =>
            setShowForm(showForm === 'organisation' ? null : 'organisation')
          }
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
      {showForm === 'account' && (
        <AccountForm organisations={data.organisations} />
      )}

      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Organisations
      </h2>
      <div className="space-y-4">
        {data.organisations.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
            No organisations yet
          </div>
        ) : (
          data.organisations.map((organisation: any) => {
            const organisationAccounts = data.accounts.filter(
              (a: any) => a.organisationId === organisation.id
            )
            const organisationTimeEntries = data.timeEntries.filter(
              (t: any) => t.organisationId === organisation.id
            )
            const totalHours = organisationTimeEntries.reduce(
              (sum: number, t: any) => sum + t.hours,
              0
            )

            return (
              <div
                key={organisation.id}
                className="bg-white p-6 rounded-lg shadow"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {organisation.name}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  Contact:{' '}
                  <span className="font-medium">
                    {organisation.contactName}
                  </span>{' '}
                  ({organisation.contactEmail})
                </p>
                <p className="text-gray-600 mb-4">
                  Budget: {organisation.totalBudgetHours}h | Used:{' '}
                  {totalHours.toFixed(2)}h | Remaining:{' '}
                  {(organisation.totalBudgetHours - totalHours).toFixed(2)}h
                </p>

                <h4 className="font-medium text-gray-900 mb-2">Accounts:</h4>
                {organisationAccounts.length === 0 ? (
                  <p className="text-gray-500 text-sm">No accounts yet</p>
                ) : (
                  <ul className="space-y-1">
                    {organisationAccounts.map((account: any) => (
                      <li key={account.id} className="text-sm text-gray-700">
                        <span className="font-medium">{account.name}</span> (
                        {account.email}) - Access Code:{' '}
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                          {account.accessCode}
                        </span>
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
    contactName: '',
    contactEmail: '',
    totalBudgetHours: '',
  })
  const createOrganisation = useServerFn(createOrganisationFn)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    await createOrganisation({
      data: {
        name: formData.name,
        contactName: formData.contactName,
        contactEmail: formData.contactEmail,
        totalBudgetHours: parseFloat(formData.totalBudgetHours),
      },
    })

    window.location.reload()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded-lg shadow mb-6"
    >
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Organisation Name
          </label>
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
            onChange={(e) =>
              setFormData({ ...formData, totalBudgetHours: e.target.value })
            }
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contact Name
          </label>
          <input
            type="text"
            value={formData.contactName}
            onChange={(e) =>
              setFormData({ ...formData, contactName: e.target.value })
            }
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., John Doe"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contact Email
          </label>
          <input
            type="email"
            value={formData.contactEmail}
            onChange={(e) =>
              setFormData({ ...formData, contactEmail: e.target.value })
            }
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., john@example.com"
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
  const createAccount = useServerFn(createAccountFn)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    await createAccount({
      data: {
        organisationId: formData.organisationId,
        name: formData.name,
        email: formData.email,
      },
    })

    window.location.reload()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded-lg shadow mb-6"
    >
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Organisation
          </label>
          <select
            value={formData.organisationId}
            onChange={(e) =>
              setFormData({ ...formData, organisationId: e.target.value })
            }
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Name
          </label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
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
  category: 'budget' | 'fixed'
  budgetHours: number
  usedHours: number
  remainingHours: number
}

function ProjectsTab({ data }: { data: any }) {
  const [showForm, setShowForm] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)

  const columns: ColumnDef<ProjectWithDetails>[] = [
    {
      accessorKey: 'name',
      header: 'Project Name',
      cell: ({ getValue }) => (
        <span className="font-medium">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ getValue }) => {
        const category = getValue() as 'budget' | 'fixed'
        return (
          <span
            className={cn(
              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
              category === 'budget'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
            )}
          >
            {category === 'budget' ? 'Budget' : 'Fixed Price'}
          </span>
        )
      },
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
          const organisationProjects = data.projects.filter(
            (p: any) => p.organisationId === organisation.id
          )
          if (organisationProjects.length === 0) return null

          const projectsWithDetails: ProjectWithDetails[] =
            organisationProjects.map((project: any) => {
              const projectTimeEntries = data.timeEntries.filter(
                (t: any) => t.projectId === project.id
              )
              const totalHours = projectTimeEntries.reduce(
                (sum: number, t: any) => sum + t.hours,
                0
              )

              return {
                id: project.id,
                name: project.name,
                description: project.description,
                category: project.category,
                budgetHours: project.budgetHours,
                usedHours: totalHours,
                remainingHours: project.budgetHours - totalHours,
              }
            })

          return (
            <div key={organisation.id}>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {organisation.name}
              </h3>
              <DataTable
                columns={columns}
                data={projectsWithDetails}
                getRowId={(row) => row.id}
                onRowDoubleClick={(row) => {
                  const fullProject = data.projects.find(
                    (p: any) => p.id === row.original.id
                  )
                  if (fullProject) {
                    setSelectedProject(fullProject)
                    setDetailSheetOpen(true)
                  }
                }}
              />
            </div>
          )
        })}
      </div>

      <ProjectDetailSheet
        project={selectedProject}
        organisations={data.organisations}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />
    </div>
  )
}

function ProjectForm({ organisations }: { organisations: any[] }) {
  const createProject = useServerFn(createProjectFn)

  const form = useForm({
    defaultValues: {
      organisationId: '',
      name: '',
      description: '',
      category: 'budget' as 'budget' | 'fixed',
      budgetHours: 0,
    },
    onSubmit: async ({ value }) => {
      await createProject({
        data: {
          organisationId: value.organisationId,
          name: value.name,
          description: value.description,
          category: value.category,
          budgetHours: value.budgetHours,
        },
      })
      window.location.reload()
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className="bg-white dark:bg-gray-950 p-6 rounded-lg shadow mb-6"
    >
      <div className="grid md:grid-cols-2 gap-4">
        <form.Field name="organisationId">
          {(field) => (
            <div>
              <label
                htmlFor={field.name}
                className="block text-sm font-medium mb-1"
              >
                Organisation *
              </label>
              <select
                id={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="">Select an organisation</option>
                {organisations.map((org: any) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
              {field.state.meta.errors &&
                field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-red-500 mt-1">
                    {field.state.meta.errors
                      .map((err) =>
                        typeof err === 'string'
                          ? err
                          : err.message || JSON.stringify(err)
                      )
                      .join(', ')}
                  </p>
                )}
            </div>
          )}
        </form.Field>

        <form.Field name="name">
          {(field) => (
            <div>
              <label
                htmlFor={field.name}
                className="block text-sm font-medium mb-1"
              >
                Project Name *
              </label>
              <Input
                id={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Enter project name"
              />
              {field.state.meta.errors &&
                field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-red-500 mt-1">
                    {field.state.meta.errors
                      .map((err) =>
                        typeof err === 'string'
                          ? err
                          : err.message || JSON.stringify(err)
                      )
                      .join(', ')}
                  </p>
                )}
            </div>
          )}
        </form.Field>

        <form.Field name="description">
          {(field) => (
            <div className="md:col-span-2">
              <label
                htmlFor={field.name}
                className="block text-sm font-medium mb-1"
              >
                Description *
              </label>
              <textarea
                id={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                placeholder="Enter project description"
                rows={3}
              />
              {field.state.meta.errors &&
                field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-red-500 mt-1">
                    {field.state.meta.errors
                      .map((err) =>
                        typeof err === 'string'
                          ? err
                          : err.message || JSON.stringify(err)
                      )
                      .join(', ')}
                  </p>
                )}
            </div>
          )}
        </form.Field>

        <form.Field name="category">
          {(field) => (
            <div>
              <label
                htmlFor={field.name}
                className="block text-sm font-medium mb-1"
              >
                Category *
              </label>
              <select
                id={field.name}
                value={field.state.value}
                onChange={(e) =>
                  field.handleChange(e.target.value as 'budget' | 'fixed')
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="budget">Budget (Time & Materials)</option>
                <option value="fixed">Fixed Price</option>
              </select>
              {field.state.meta.errors &&
                field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-red-500 mt-1">
                    {field.state.meta.errors
                      .map((err) =>
                        typeof err === 'string'
                          ? err
                          : err.message || JSON.stringify(err)
                      )
                      .join(', ')}
                  </p>
                )}
            </div>
          )}
        </form.Field>

        <form.Field name="budgetHours">
          {(field) => (
            <div>
              <label
                htmlFor={field.name}
                className="block text-sm font-medium mb-1"
              >
                Budget (hours) *
              </label>
              <Input
                id={field.name}
                type="number"
                step="0.5"
                value={field.state.value}
                onChange={(e) =>
                  field.handleChange(parseFloat(e.target.value) || 0)
                }
                placeholder="0"
              />
              {field.state.meta.errors &&
                field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-red-500 mt-1">
                    {field.state.meta.errors
                      .map((err) =>
                        typeof err === 'string'
                          ? err
                          : err.message || JSON.stringify(err)
                      )
                      .join(', ')}
                  </p>
                )}
            </div>
          )}
        </form.Field>
      </div>

      <Button type="submit" className="mt-4">
        Add Project
      </Button>
    </form>
  )
}

function ProjectDetailSheet({
  project,
  organisations,
  open,
  onOpenChange,
}: {
  project: Project | null
  organisations: any[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editedValues, setEditedValues] = useState<Partial<Project>>({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const updateProject = useServerFn(updateProjectFn)
  const deleteProject = useServerFn(deleteProjectFn)

  if (!project) return null

  const organisation = organisations.find(
    (o: any) => o.id === project.organisationId
  )
  const currentValues = { ...project, ...editedValues }

  const handleFieldClick = (fieldName: string) => {
    setEditingField(fieldName)
  }

  const handleFieldBlur = async () => {
    if (Object.keys(editedValues).length > 0) {
      const updatePayload = {
        id: project.id,
        createdAt: project.createdAt,
        ...editedValues,
      }
      await updateProject({ data: updatePayload as Project })
      setEditedValues({})
      window.location.reload()
    }
    setEditingField(null)
  }

  const handleFieldChange = (fieldName: string, value: any) => {
    setEditedValues((prev) => ({ ...prev, [fieldName]: value }))
  }

  const handleDelete = async () => {
    await deleteProject({ data: { id: project.id } })
    setShowDeleteConfirm(false)
    onOpenChange(false)
    window.location.reload()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="space-y-3 pb-6 border-b">
          <SheetTitle>Project Details</SheetTitle>
          <SheetDescription>View and edit project information</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">
                Organisation
              </label>
              {editingField === 'organisationId' ? (
                <select
                  autoFocus
                  value={currentValues.organisationId || ''}
                  onChange={(e) =>
                    handleFieldChange('organisationId', e.target.value)
                  }
                  onBlur={handleFieldBlur}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background mt-1"
                >
                  {organisations.map((org: any) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p
                  className="text-base mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2"
                  onClick={() => handleFieldClick('organisationId')}
                >
                  {organisation?.name || 'Unknown'}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">
                Project Name
              </label>
              {editingField === 'name' ? (
                <Input
                  autoFocus
                  value={currentValues.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  onBlur={handleFieldBlur}
                  className="mt-1"
                />
              ) : (
                <p
                  className="text-base mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2"
                  onClick={() => handleFieldClick('name')}
                >
                  {currentValues.name}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">
                Description
              </label>
              {editingField === 'description' ? (
                <textarea
                  autoFocus
                  value={currentValues.description}
                  onChange={(e) =>
                    handleFieldChange('description', e.target.value)
                  }
                  onBlur={handleFieldBlur}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm mt-1"
                  rows={3}
                />
              ) : (
                <p
                  className="text-base mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2 min-h-[1.5rem]"
                  onClick={() => handleFieldClick('description')}
                >
                  {currentValues.description || 'Click to add description...'}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Category
                </label>
                {editingField === 'category' ? (
                  <select
                    autoFocus
                    value={currentValues.category}
                    onChange={(e) =>
                      handleFieldChange(
                        'category',
                        e.target.value as 'budget' | 'fixed'
                      )
                    }
                    onBlur={handleFieldBlur}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background mt-1"
                  >
                    <option value="budget">Budget (Time & Materials)</option>
                    <option value="fixed">Fixed Price</option>
                  </select>
                ) : (
                  <p
                    className="text-base mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2"
                    onClick={() => handleFieldClick('category')}
                  >
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        currentValues.category === 'budget'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                      )}
                    >
                      {currentValues.category === 'budget'
                        ? 'Budget'
                        : 'Fixed Price'}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">
                  Budget (hours)
                </label>
                {editingField === 'budgetHours' ? (
                  <Input
                    autoFocus
                    type="number"
                    step="0.5"
                    value={currentValues.budgetHours}
                    onChange={(e) =>
                      handleFieldChange(
                        'budgetHours',
                        parseFloat(e.target.value)
                      )
                    }
                    onBlur={handleFieldBlur}
                    className="mt-1"
                  />
                ) : (
                  <p
                    className="text-base mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2"
                    onClick={() => handleFieldClick('budgetHours')}
                  >
                    {currentValues.budgetHours}h
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">
                Created
              </label>
              <p className="text-base mt-1">
                {formatDateTime(project.createdAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-between pt-6 border-t">
          <Button
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete Project
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md">
              <h3 className="text-lg font-semibold mb-2">Delete Project</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to delete this project? This action cannot
                be undone and will also delete all associated time entries.
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
      </SheetContent>
    </Sheet>
  )
}
