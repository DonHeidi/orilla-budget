import { createFileRoute, getRouteApi, Link, Outlet, useMatchRoute, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useMemo, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Users, Mail, Building2 } from 'lucide-react'
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { organisationRepository } from '@/server/repositories/organisation.repository'
import { createOrganisationSchema, type Organisation } from '@/schemas'
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

const parentRouteApi = getRouteApi('/dashboard/_orgs')

const createOrganisationFn = createServerFn({ method: 'POST' })
  .inputValidator(createOrganisationSchema)
  .handler(async ({ data }) => {
    const organisation: Organisation = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: data.name,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      totalBudgetHours: data.totalBudgetHours,
      createdAt: new Date().toISOString(),
    }
    return await organisationRepository.create(organisation)
  })

// Route definition
export const Route = createFileRoute('/dashboard/_orgs/organisations')({
  component: OrganisationsPage,
})

type OrganisationWithDetails = {
  id: string
  name: string
  contactName: string
  contactEmail: string
  totalBudgetHours: number
  accountCount: number
  createdAt: string
}

function OrganisationsPage() {
  const parentData = parentRouteApi.useLoaderData()
  const navigate = useNavigate({ from: Route.fullPath })
  const matchRoute = useMatchRoute()
  const isOrganisations = matchRoute({ to: '/dashboard/organisations', fuzzy: true })
  const isAccounts = matchRoute({ to: '/dashboard/accounts', fuzzy: true })

  const organisationsWithDetails = useMemo(() => {
    return parentData.organisations.map((org: any) => {
      const accountCount = parentData.accounts.filter((a: any) => a.organisationId === org.id).length
      return {
        id: org.id,
        name: org.name,
        contactName: org.contactName,
        contactEmail: org.contactEmail,
        totalBudgetHours: org.totalBudgetHours,
        accountCount,
        createdAt: org.createdAt,
      }
    })
  }, [parentData])

  const organisationColumns: ColumnDef<OrganisationWithDetails>[] = [
    {
      accessorKey: 'name',
      header: 'Organisation Name',
    },
    {
      accessorKey: 'contactName',
      header: 'Contact',
      cell: ({ getValue }) => (
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-gray-500" />
          <span>{getValue() as string}</span>
        </div>
      ),
    },
    {
      accessorKey: 'contactEmail',
      header: 'Email',
      cell: ({ getValue }) => (
        <div className="flex items-center gap-1">
          <Mail className="h-4 w-4 text-gray-500" />
          <span>{getValue() as string}</span>
        </div>
      ),
    },
    {
      accessorKey: 'totalBudgetHours',
      header: 'Budget (hours)',
      cell: ({ getValue }) => `${getValue()} hours`,
    },
    {
      accessorKey: 'accountCount',
      header: 'Accounts',
      cell: ({ getValue }) => `${getValue()} accounts`,
    },
  ]

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Organisations & Accounts</h1>
      </div>

      <div className="flex gap-2 mb-6 border-b">
        <Link
          to="/dashboard/organisations"
          className={`px-4 py-2 font-medium transition-colors ${
            isOrganisations
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
          }`}
        >
          <Building2 className="inline-block mr-2 h-4 w-4" />
          Organisations ({parentData.organisations.length})
        </Link>
        <Link
          to="/dashboard/accounts"
          className={`px-4 py-2 font-medium transition-colors ${
            isAccounts
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
          }`}
        >
          <Users className="inline-block mr-2 h-4 w-4" />
          Accounts ({parentData.accounts.length})
        </Link>
      </div>

      <div className="flex justify-end mb-4">
        <AddOrganisationSheet />
      </div>

      <DataTable
        columns={organisationColumns}
        data={organisationsWithDetails}
        getRowId={(row) => row.id}
        onRowClick={(row) => {
          navigate({ to: '/dashboard/organisations/$id', params: { id: row.original.id } })
        }}
      />

      <Outlet />
    </div>
  )
}

function AddOrganisationSheet() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const form = useForm({
    defaultValues: {
      name: '',
      contactName: '',
      contactEmail: '',
      totalBudgetHours: 0,
    },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: createOrganisationSchema,
    },
    onSubmit: async ({ value }) => {
      await createOrganisationFn({
        data: {
          name: value.name,
          contactName: value.contactName,
          contactEmail: value.contactEmail,
          totalBudgetHours: value.totalBudgetHours,
        }
      })
      setOpen(false)
      form.reset()
      navigate({ to: '/dashboard/organisations' })
    },
  })

  const handleClose = () => {
    setOpen(false)
    form.reset()
  }

  return (
    <Sheet open={open} onOpenChange={(open) => {
      if (!open) handleClose()
      else setOpen(open)
    }}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Organisation
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="space-y-3 pb-6 border-b">
          <SheetTitle>Add Organisation</SheetTitle>
          <SheetDescription>
            Create a new organisation to manage accounts and budgets
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
          <form.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <label htmlFor={field.name} className="text-sm font-medium">
                  Organisation Name *
                </label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g., Google Inc."
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

          <form.Field name="contactName">
            {(field) => (
              <div className="space-y-2">
                <label htmlFor={field.name} className="text-sm font-medium">
                  Contact Name *
                </label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g., Sundar Pichai"
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

          <form.Field name="contactEmail">
            {(field) => (
              <div className="space-y-2">
                <label htmlFor={field.name} className="text-sm font-medium">
                  Contact Email *
                </label>
                <Input
                  id={field.name}
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g., sundar@google.com"
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

          <form.Field name="totalBudgetHours">
            {(field) => (
              <div className="space-y-2">
                <label htmlFor={field.name} className="text-sm font-medium">
                  Total Budget (hours) *
                </label>
                <Input
                  id={field.name}
                  type="number"
                  step="0.5"
                  min="0"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(parseFloat(e.target.value) || 0)}
                  placeholder="e.g., 100"
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

          <div className="flex gap-3 justify-end pt-6 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">
              Create Organisation
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
