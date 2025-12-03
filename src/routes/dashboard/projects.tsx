import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { useMemo, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, FolderKanban } from 'lucide-react'
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { cn } from '@/lib/utils'
import { authRepository } from '@/repositories/auth.repository'
import { organisationRepository } from '@/repositories/organisation.repository'
import { projectRepository } from '@/repositories/project.repository'
import { projectMemberRepository } from '@/repositories/projectMember.repository'
import { timeEntryRepository } from '@/repositories/timeEntry.repository'
import { getCurrentUser, isAdmin } from '@/repositories/auth.repository'
import { createProjectSchema, type Project } from '@/schemas'
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

const getProjectsDataFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await getCurrentUser()
    if (!user) throw new Error('Unauthorized')

    // Admins see everything
    if (isAdmin(user)) {
      const organisations = await organisationRepository.findAll()
      const projects = await projectRepository.findAll()
      const timeEntries = await timeEntryRepository.findAll()
      return { organisations, projects, timeEntries }
    }

    // Experts see only their projects (where they have membership)
    const projects = await projectRepository.findByUserId(user.id)
    const orgIds = [
      ...new Set(projects.map((p) => p.organisationId).filter(Boolean)),
    ] as string[]
    const organisations = await organisationRepository.findByIds(orgIds)

    // Time entries for display (from user's projects)
    const projectIds = projects.map((p) => p.id)
    const timeEntries = await timeEntryRepository.findByProjectIds(projectIds)

    return { organisations, projects, timeEntries }
  }
)

const createProjectFn = createServerFn({ method: 'POST' })
  .inputValidator(createProjectSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const user = await getCurrentUser()
    if (!user) throw new Error('Unauthorized')

    // Create team (project) via Better Auth API
    const result = await authRepository.createTeam({
      name: data.name,
      organizationId: data.organisationId || '',
    })

    if (!result) {
      throw new Error('Failed to create project')
    }

    // Update with custom project fields
    await projectRepository.updateCustomFields(result.id, {
      description: data.description || '',
      category: data.category,
      budgetHours: data.category === 'fixed' ? null : (data.budgetHours ?? null),
    })

    // Better Auth createTeam automatically adds the creator as a member
    // Update the project role
    await projectMemberRepository.updateProjectRole(result.id, user.id, 'owner')

    // Fetch the updated project
    const created = await projectRepository.findById(result.id)
    if (!created) {
      throw new Error('Failed to fetch created project')
    }

    return created
  })

export const Route = createFileRoute('/dashboard/projects')({
  component: ProjectsPage,
  loader: () => getProjectsDataFn(),
})

type ProjectWithDetails = {
  id: string
  name: string
  description: string
  organisationName: string
  category: 'budget' | 'fixed'
  budgetHours: number
  usedHours: number
  remainingHours: number
}

function ProjectsPage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate({ from: Route.fullPath })

  const projectsWithDetails = useMemo(() => {
    return data.projects.map((project: any) => {
      const organisation = data.organisations.find(
        (o: any) => o.id === project.organisationId
      )
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
        organisationName: organisation?.name || 'Personal',
        category: project.category,
        budgetHours: project.budgetHours,
        usedHours: totalHours,
        remainingHours: project.budgetHours - totalHours,
      }
    })
  }, [data])

  const columns: ColumnDef<ProjectWithDetails>[] = [
    {
      accessorKey: 'name',
      header: 'Project Name',
      cell: ({ getValue }) => (
        <div className="flex items-center gap-1">
          <FolderKanban className="h-4 w-4 text-gray-500" />
          <span className="font-medium">{getValue() as string}</span>
        </div>
      ),
    },
    {
      accessorKey: 'organisationName',
      header: 'Organisation',
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ getValue }) => {
        const desc = getValue() as string
        return desc.length > 50 ? `${desc.substring(0, 50)}...` : desc
      },
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
      cell: ({ getValue, row }) => {
        const budget = getValue() as number | null
        const category = row.original.category
        if (category === 'fixed') {
          return <span className="text-gray-400 italic">Fixed price</span>
        }
        return budget !== null ? (
          `${budget}h`
        ) : (
          <span className="text-gray-400">-</span>
        )
      },
    },
    {
      accessorKey: 'usedHours',
      header: 'Used',
      cell: ({ getValue, row }) => {
        const hours = getValue() as number
        const budget = row.original.budgetHours
        const category = row.original.category

        if (category === 'fixed' || !budget) {
          return <span className="text-gray-400">-</span>
        }

        const percentage = (hours / budget) * 100

        return (
          <div className="flex items-center gap-2">
            <span
              className={
                percentage > 100
                  ? 'text-red-600 dark:text-red-400 font-semibold'
                  : percentage > 75
                    ? 'text-orange-600 dark:text-orange-400 font-medium'
                    : 'text-gray-900 dark:text-gray-100'
              }
            >
              {percentage.toFixed(1)}%
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({hours.toFixed(1)}h)
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: 'remainingHours',
      header: 'Remaining',
      cell: ({ getValue, row }) => {
        const remaining = getValue() as number
        const category = row.original.category
        const budget = row.original.budgetHours

        if (category === 'fixed' || !budget) {
          return <span className="text-gray-400">-</span>
        }

        const percentage = (remaining / budget) * 100

        return (
          <div className="flex items-center gap-2">
            <span
              className={
                remaining < 0
                  ? 'text-red-600 dark:text-red-400 font-semibold'
                  : 'text-green-600 dark:text-green-400 font-medium'
              }
            >
              {percentage.toFixed(1)}%
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({remaining.toFixed(1)}h)
            </span>
          </div>
        )
      },
    },
  ]

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Projects</h1>
      </div>

      <div className="flex justify-end mb-4">
        <AddProjectSheet organisations={data.organisations} />
      </div>

      <DataTable
        columns={columns}
        data={projectsWithDetails}
        getRowId={(row) => row.id}
        onRowClick={(row) => {
          navigate({
            to: '/dashboard/projects/$id',
            params: { id: row.original.id },
          })
        }}
      />

      <Outlet />
    </div>
  )
}

function AddProjectSheet({ organisations }: { organisations: any[] }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const form = useForm({
    defaultValues: {
      organisationId: '',
      name: '',
      description: '',
      category: 'budget' as 'budget' | 'fixed',
      budgetHours: 0 as number | null,
    },
    validatorAdapter: zodValidator(),
    validators: {
      onSubmitAsync: createProjectSchema,
    },
    onSubmit: async ({ value }) => {
      await createProjectFn({
        data: {
          organisationId: value.organisationId,
          name: value.name,
          description: value.description,
          category: value.category,
          budgetHours: value.category === 'fixed' ? null : value.budgetHours,
        },
      })
      setOpen(false)
      form.reset()
      navigate({ to: '/dashboard/projects' })
    },
  })

  const handleClose = () => {
    setOpen(false)
    form.reset()
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(open) => {
        if (!open) handleClose()
        else setOpen(open)
      }}
    >
      <SheetTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Project
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="space-y-3 pb-6 border-b">
          <SheetTitle>Add Project</SheetTitle>
          <SheetDescription>
            Create a new project to track time and budget
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
          <form.Field name="organisationId">
            {(field) => (
              <div className="space-y-2">
                <label htmlFor={field.name} className="text-sm font-medium">
                  Organisation
                </label>
                <select
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="">Personal (no organisation)</option>
                  {organisations.map((org: any) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </form.Field>

          <form.Field
            name="name"
            validators={{
              onChange: createProjectSchema.shape.name,
            }}
          >
            {(field) => (
              <div className="space-y-2">
                <label htmlFor={field.name} className="text-sm font-medium">
                  Project Name *
                </label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g., Website Redesign"
                />
                {field.state.meta.isTouched &&
                  field.state.meta.errors &&
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
                <textarea
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  placeholder="Describe the project..."
                  rows={3}
                />
                {field.state.meta.isTouched &&
                  field.state.meta.errors &&
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

          <form.Field name="category">
            {(field) => (
              <div className="space-y-2">
                <label htmlFor={field.name} className="text-sm font-medium">
                  Category *
                </label>
                <select
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) =>
                    field.handleChange(e.target.value as 'budget' | 'fixed')
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="budget">Budget (Time & Materials)</option>
                  <option value="fixed">Fixed Price</option>
                </select>
                {field.state.meta.isTouched &&
                  field.state.meta.errors &&
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

          <form.Subscribe selector={(state) => state.values.category}>
            {(category) =>
              category === 'budget' && (
                <form.Field
                  name="budgetHours"
                  validators={{
                    onChange: createProjectSchema.shape.budgetHours,
                  }}
                >
                  {(field) => (
                    <div className="space-y-2">
                      <label
                        htmlFor={field.name}
                        className="text-sm font-medium"
                      >
                        Budget (hours) *
                      </label>
                      <Input
                        id={field.name}
                        type="number"
                        step="0.5"
                        min="0"
                        value={field.state.value || 0}
                        onBlur={field.handleBlur}
                        onChange={(e) =>
                          field.handleChange(parseFloat(e.target.value) || 0)
                        }
                        placeholder="e.g., 40"
                      />
                      {field.state.meta.isTouched &&
                        field.state.meta.errors &&
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
              )
            }
          </form.Subscribe>

          <div className="flex gap-3 justify-end pt-6 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
