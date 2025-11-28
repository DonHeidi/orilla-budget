import {
  createFileRoute,
  getRouteApi,
  Link,
  Outlet,
  useMatchRoute,
  useNavigate,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useMemo, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Mail, Building2, Users } from 'lucide-react'
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { accountRepository } from '@/repositories/account.repository'
import { createAccountSchema, type Account } from '@/schemas'
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

const createAccountFn = createServerFn({ method: 'POST' })
  .inputValidator(createAccountSchema)
  .handler(async ({ data }) => {
    const accessCode = Math.random().toString(36).substring(2, 10).toUpperCase()
    const account: Account = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      organisationId: data.organisationId,
      name: data.name,
      email: data.email,
      role: data.role || 'contact',
      accessCode: accessCode,
      createdAt: new Date().toISOString(),
    }
    return await accountRepository.create(account)
  })

// Route definition
export const Route = createFileRoute('/dashboard/_orgs/accounts')({
  component: AccountsPage,
})

type AccountWithDetails = {
  id: string
  organisationId: string
  organisationName: string
  name: string
  email: string
  role: 'contact' | 'project_manager' | 'finance'
  accessCode: string
  createdAt: string
}

function AccountsPage() {
  const parentData = parentRouteApi.useLoaderData()
  const navigate = useNavigate({ from: Route.fullPath })
  const matchRoute = useMatchRoute()
  const isOrganisations = matchRoute({
    to: '/dashboard/organisations',
    fuzzy: true,
  })
  const isAccounts = matchRoute({ to: '/dashboard/accounts', fuzzy: true })

  const accountsWithDetails = useMemo(() => {
    return parentData.accounts.map((account: any) => {
      const organisation = parentData.organisations.find(
        (o: any) => o.id === account.organisationId
      )
      return {
        id: account.id,
        organisationId: account.organisationId,
        organisationName: organisation?.name || '',
        name: account.name,
        email: account.email,
        role: account.role || 'contact',
        accessCode: account.accessCode,
        createdAt: account.createdAt,
      }
    })
  }, [parentData])

  const accountColumns: ColumnDef<AccountWithDetails>[] = [
    {
      accessorKey: 'name',
      header: 'Account Name',
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ getValue }) => (
        <div className="flex items-center gap-1">
          <Mail className="h-4 w-4 text-gray-500" />
          <span>{getValue() as string}</span>
        </div>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ getValue }) => {
        const role = getValue() as string
        const roleLabels = {
          contact: 'Contact',
          project_manager: 'Project Manager',
          finance: 'Finance/Controller',
        }
        return (
          <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-sm">
            {roleLabels[role as keyof typeof roleLabels] || role}
          </span>
        )
      },
    },
    {
      accessorKey: 'organisationName',
      header: 'Organisation',
      cell: ({ getValue }) => (
        <div className="flex items-center gap-1">
          <Building2 className="h-4 w-4 text-gray-500" />
          <span>{getValue() as string}</span>
        </div>
      ),
    },
    {
      accessorKey: 'accessCode',
      header: 'Access Code',
      cell: ({ getValue }) => (
        <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono">
          {getValue() as string}
        </code>
      ),
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
        <AddAccountSheet organisations={parentData.organisations} />
      </div>

      <DataTable
        columns={accountColumns}
        data={accountsWithDetails}
        getRowId={(row) => row.id}
        onRowClick={(row) => {
          navigate({
            to: '/dashboard/accounts/$id',
            params: { id: row.original.id },
          })
        }}
      />

      <Outlet />
    </div>
  )
}

function AddAccountSheet({ organisations }: { organisations: any[] }) {
  const [open, setOpen] = useState(false)
  const [createdAccessCode, setCreatedAccessCode] = useState<string | null>(
    null
  )
  const navigate = useNavigate()

  const form = useForm({
    defaultValues: {
      organisationId: '',
      name: '',
      email: '',
      role: 'contact' as 'contact' | 'project_manager' | 'finance',
    },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: createAccountSchema,
    },
    onSubmit: async ({ value }) => {
      const result = await createAccountFn({
        data: {
          organisationId: value.organisationId,
          name: value.name,
          email: value.email,
          role: value.role,
        },
      })
      setCreatedAccessCode(result.accessCode)
      navigate({ to: '/dashboard/accounts' })
    },
  })

  const handleClose = () => {
    setOpen(false)
    setCreatedAccessCode(null)
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
          Add Account
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="space-y-3 pb-6 border-b">
          <SheetTitle>Add Account</SheetTitle>
          <SheetDescription>
            Create a new account for portal access
          </SheetDescription>
        </SheetHeader>

        {createdAccessCode ? (
          <div className="space-y-6 py-6">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                Account Created Successfully!
              </h3>
              <p className="text-sm text-green-800 dark:text-green-200 mb-4">
                Share this access code with the account holder:
              </p>
              <div className="bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 rounded p-3">
                <code className="text-2xl font-mono font-bold text-center block">
                  {createdAccessCode}
                </code>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-6 border-t">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        ) : (
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
                    Organisation *
                  </label>
                  <select
                    id={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="">Select organisation</option>
                    {organisations.map((org: any) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
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

            <form.Field name="name">
              {(field) => (
                <div className="space-y-2">
                  <label htmlFor={field.name} className="text-sm font-medium">
                    Account Name *
                  </label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g., Larry Page"
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

            <form.Field name="email">
              {(field) => (
                <div className="space-y-2">
                  <label htmlFor={field.name} className="text-sm font-medium">
                    Email *
                  </label>
                  <Input
                    id={field.name}
                    type="email"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g., larry@google.com"
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

            <form.Field name="role">
              {(field) => (
                <div className="space-y-2">
                  <label htmlFor={field.name} className="text-sm font-medium">
                    Role *
                  </label>
                  <select
                    id={field.name}
                    value={field.state.value}
                    onChange={(e) =>
                      field.handleChange(
                        e.target.value as
                          | 'contact'
                          | 'project_manager'
                          | 'finance'
                      )
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="contact">Contact</option>
                    <option value="project_manager">Project Manager</option>
                    <option value="finance">Finance/Controller</option>
                  </select>
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

            <div className="flex gap-3 justify-end pt-6 border-t">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit">Create Account</Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
