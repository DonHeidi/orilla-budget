import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Mail, Building2, User, UserCheck } from 'lucide-react'
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { contactRepository } from '@/repositories/contact.repository'
import { organisationRepository } from '@/repositories/organisation.repository'
import { createContactSchema, type Contact } from '@/schemas'
import { getCurrentUser } from '@/lib/auth/helpers.server'
import { DataTable } from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import type { ContactWithDetails } from '@/repositories/contact.repository'

interface ContactsData {
  contacts: ContactWithDetails[]
  organisations: { id: string; name: string }[]
}

const getContactsDataFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ContactsData> => {
    const user = await getCurrentUser()
    if (!user) {
      return { contacts: [], organisations: [] }
    }

    const [contacts, organisations] = await Promise.all([
      contactRepository.findByOwner(user.id),
      organisationRepository.findAll(),
    ])

    return { contacts, organisations }
  }
)

const createContactFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string; organisationId?: string; name?: string }) => data)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Not authenticated')
    }

    // Check if contact already exists
    const existing = await contactRepository.findByOwnerAndEmail(
      user.id,
      data.email
    )
    if (existing) {
      throw new Error('Contact with this email already exists')
    }

    return await contactRepository.createWithPii({
      ownerId: user.id,
      email: data.email,
      organisationId: data.organisationId,
      name: data.name,
    })
  })

export const Route = createFileRoute('/dashboard/contacts')({
  component: ContactsPage,
  loader: () => getContactsDataFn(),
})

function ContactsPage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate({ from: Route.fullPath })

  const columns: ColumnDef<ContactWithDetails>[] = [
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-gray-500" />
          <span>{row.original.email}</span>
        </div>
      ),
    },
    {
      id: 'name',
      header: 'Name',
      cell: ({ row }) => {
        const name = row.original.user?.handle
          ? `@${row.original.user.handle}`
          : row.original.pii?.name || '-'
        return (
          <div className="flex items-center gap-2">
            {row.original.userId ? (
              <UserCheck className="h-4 w-4 text-green-500" />
            ) : (
              <User className="h-4 w-4 text-gray-400" />
            )}
            <span>{name}</span>
          </div>
        )
      },
    },
    {
      id: 'organisation',
      header: 'Organisation',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.organisation ? (
            <>
              <Building2 className="h-4 w-4 text-gray-500" />
              <span>{row.original.organisation.name}</span>
            </>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded-full text-xs ${
            row.original.userId
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
          }`}
        >
          {row.original.userId ? 'Has Account' : 'Invited'}
        </span>
      ),
    },
  ]

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Contacts</h1>
      </div>

      <div className="flex justify-end mb-4">
        <AddContactSheet organisations={data.organisations} />
      </div>

      <DataTable
        columns={columns}
        data={data.contacts}
        getRowId={(row) => row.id}
        onRowClick={(row) => {
          navigate({
            to: '/dashboard/contacts/$id',
            params: { id: row.original.id },
          })
        }}
      />

      <Outlet />
    </div>
  )
}

function AddContactSheet({
  organisations,
}: {
  organisations: { id: string; name: string }[]
}) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const form = useForm({
    defaultValues: {
      email: '',
      name: '',
      organisationId: '',
    },
    validatorAdapter: zodValidator(),
    validators: {
      onSubmitAsync: createContactSchema,
    },
    onSubmit: async ({ value }) => {
      await createContactFn({
        data: {
          email: value.email,
          name: value.name || undefined,
          organisationId: value.organisationId || undefined,
        },
      })
      setOpen(false)
      form.reset()
      navigate({ to: '/dashboard/contacts' })
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
          Add Contact
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="space-y-3 pb-6 border-b">
          <SheetTitle>Add Contact</SheetTitle>
          <SheetDescription>
            Add a new contact to your address book. You can invite them to
            projects later.
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
          <form.Field
            name="email"
            validators={{
              onChange: createContactSchema.shape.email,
            }}
          >
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
                  placeholder="e.g., contact@example.com"
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

          <form.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <label htmlFor={field.name} className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g., John Doe"
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
                <Select
                  value={field.state.value}
                  onValueChange={field.handleChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select organisation (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {organisations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>

          <div className="flex gap-3 justify-end pt-6 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Contact'}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
