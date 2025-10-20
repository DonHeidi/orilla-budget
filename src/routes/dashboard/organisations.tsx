import { createFileRoute, useNavigate, useRouter, Outlet } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useMemo, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Users, Mail, Building2 } from 'lucide-react'
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { organisationRepository } from '@/server/repositories/organisation.repository'
import { accountRepository } from '@/server/repositories/account.repository'
import type { Organisation, Account } from '@/types'
import { createOrganisationSchema, createAccountSchema } from '@/schemas'
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

// Server functions
const getAllDataFn = createServerFn({ method: 'GET' }).handler(async () => {
  const organisations = await organisationRepository.findAll()
  const accounts = await accountRepository.findAll()

  return {
    organisations: JSON.parse(JSON.stringify(organisations)),
    accounts: JSON.parse(JSON.stringify(accounts)),
  }
})

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

const createAccountFn = createServerFn({ method: 'POST' })
  .inputValidator(createAccountSchema)
  .handler(async ({ data }) => {
    const accessCode = Math.random().toString(36).substring(2, 10).toUpperCase()
    const account: Account = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      organisationId: data.organisationId,
      name: data.name,
      email: data.email,
      accessCode: accessCode,
      createdAt: new Date().toISOString(),
    }
    return await accountRepository.create(account)
  })

// Route definition
export const Route = createFileRoute('/dashboard/organisations')({
  component: OrganisationsPage,
  loader: () => getAllDataFn(),
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

type AccountWithDetails = {
  id: string
  organisationName: string
  name: string
  email: string
  accessCode: string
  createdAt: string
}

function OrganisationsPage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate({ from: Route.fullPath })
  const [activeTab, setActiveTab] = useState<'organisations' | 'accounts'>('organisations')

  const organisationsWithDetails = useMemo(() => {
    return data.organisations.map((org: any) => {
      const accountCount = data.accounts.filter((a: any) => a.organisationId === org.id).length
      return {
        id: org.id,
        name: org.name,
        contactName: org.contactName,
        contactEmail: org.contactEmail,
        totalBudgetHours: org.totalBudgetHours,
        accountCount: accountCount,
        createdAt: org.createdAt,
      }
    })
  }, [data])

  const accountsWithDetails = useMemo(() => {
    return data.accounts.map((account: any) => {
      const organisation = data.organisations.find((o: any) => o.id === account.organisationId)
      return {
        id: account.id,
        organisationName: organisation?.name || '',
        name: account.name,
        email: account.email,
        accessCode: account.accessCode,
        createdAt: account.createdAt,
      }
    })
  }, [data])

  const organisationColumns: ColumnDef<OrganisationWithDetails>[] = [
    {
      accessorKey: 'name',
      header: 'Organisation Name',
    },
    {
      accessorKey: 'contactName',
      header: 'Contact Name',
    },
    {
      accessorKey: 'contactEmail',
      header: 'Contact Email',
    },
    {
      accessorKey: 'totalBudgetHours',
      header: 'Total Budget',
      cell: ({ getValue }) => `${getValue()} hours`,
    },
    {
      accessorKey: 'accountCount',
      header: 'Accounts',
      cell: ({ getValue }) => {
        const count = getValue() as number
        return (
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-gray-500" />
            <span>{count}</span>
          </div>
        )
      },
    },
  ]

  const accountColumns: ColumnDef<AccountWithDetails>[] = [
    {
      accessorKey: 'organisationName',
      header: 'Organisation',
    },
    {
      accessorKey: 'name',
      header: 'Account Name',
    },
    {
      accessorKey: 'email',
      header: 'Email',
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
        <div className="flex gap-2">
          {activeTab === 'organisations' && (
            <AddOrganisationSheet />
          )}
          {activeTab === 'accounts' && (
            <AddAccountSheet organisations={data.organisations} />
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('organisations')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'organisations'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Building2 className="inline-block mr-2 h-4 w-4" />
          Organisations ({data.organisations.length})
        </button>
        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'accounts'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="inline-block mr-2 h-4 w-4" />
          Accounts ({data.accounts.length})
        </button>
      </div>

      {activeTab === 'organisations' ? (
        <DataTable
          columns={organisationColumns}
          data={organisationsWithDetails}
          getRowId={(row) => row.id}
          onRowClick={(row) => {
            navigate({ to: '/dashboard/organisations/$id', params: { id: row.original.id } })
          }}
        />
      ) : (
        <DataTable
          columns={accountColumns}
          data={accountsWithDetails}
          getRowId={(row) => row.id}
        />
      )}

      <Outlet />
    </div>
  )
}

function AddOrganisationSheet() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

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
      router.invalidate()
    },
  })

  return (
    <Sheet open={open} onOpenChange={setOpen}>
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
            Create a new organisation with contact details and budget
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
                  placeholder="e.g., Google"
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
                  placeholder="e.g., John Doe"
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
                  placeholder="e.g., john@example.com"
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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

function AddAccountSheet({ organisations }: { organisations: any[] }) {
  const [open, setOpen] = useState(false)
  const [createdAccessCode, setCreatedAccessCode] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm({
    defaultValues: {
      organisationId: '',
      name: '',
      email: '',
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
        }
      })
      setCreatedAccessCode(result.accessCode)
      router.invalidate()
      // Don't close the sheet immediately so user can see the access code
    },
  })

  const handleClose = () => {
    setOpen(false)
    setCreatedAccessCode(null)
    form.reset()
  }

  return (
    <Sheet open={open} onOpenChange={(open) => {
      if (!open) handleClose()
      else setOpen(open)
    }}>
      <SheetTrigger asChild>
        <Button variant="outline">
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
              <Button onClick={handleClose}>
                Done
              </Button>
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
                Create Account
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
