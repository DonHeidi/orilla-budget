import { createFileRoute, Outlet, useNavigate, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Users, Copy, Check } from 'lucide-react'
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { z } from 'zod'
import { contactRepository } from '@/repositories/contact.repository'
import { invitationRepository } from '@/repositories/invitation.repository'
import { userRepository } from '@/repositories/user.repository'
import { getCurrentUser } from '@/repositories/auth.repository'
import type { User, Contact, Invitation } from '@/schemas'
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

const getUsersDataFn = createServerFn({ method: 'GET' }).handler(async () => {
  const users = await userRepository.findAll()

  return {
    users: users.map((u) => ({
      id: u.id,
      handle: u.handle || u.name,
      email: u.email,
      role: u.role as 'super_admin' | 'admin' | null,
      isActive: u.banned !== true,
      createdAt: u.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: u.updatedAt?.toISOString() ?? new Date().toISOString(),
    })),
  }
})

// Validation schema for invitation form
const inviteUserSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().optional(),
})

const createAndInviteUserFn = createServerFn({ method: 'POST' })
  .inputValidator(inviteUserSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    // Check if contact already exists for this owner
    const existingContact = await contactRepository.findByOwnerAndEmail(
      user.id,
      data.email
    )
    if (existingContact) {
      throw new Error('A contact with this email already exists')
    }

    // Create contact with optional PII
    const contact = await contactRepository.createWithPii({
      email: data.email,
      name: data.name,
      ownerId: user.id,
    })

    // Create invitation (no project - general invitation)
    const invitation = await invitationRepository.create(
      { contactId: contact.id },
      user.id
    )

    return { contact, invitation }
  })

export const Route = createFileRoute('/dashboard/users')({
  component: UsersPage,
  loader: () => getUsersDataFn(),
})

function UsersPage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate({ from: Route.fullPath })

  const users = data.users

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'handle',
      header: 'Handle',
      cell: ({ getValue }) => (
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-gray-500" />
          <span className="font-medium">@{getValue() as string}</span>
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
  ]

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Users</h1>
      </div>

      <div className="flex justify-end mb-4">
        <AddUserSheet />
      </div>

      <DataTable
        columns={columns}
        data={users}
        getRowId={(row) => row.id}
        onRowClick={(row) => {
          navigate({ to: '/dashboard/users/$id', params: { id: row.original.id } })
        }}
      />

      <Outlet />
    </div>
  )
}

interface InvitationResult {
  contact: Contact
  invitation: Invitation
}

function AddUserSheet() {
  const [open, setOpen] = useState(false)
  const [invitationResult, setInvitationResult] = useState<InvitationResult | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm({
    defaultValues: {
      email: '',
      name: '',
    },
    validatorAdapter: zodValidator(),
    validators: {
      onSubmitAsync: inviteUserSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null)
      try {
        const result = await createAndInviteUserFn({
          data: {
            email: value.email,
            name: value.name || undefined,
          },
        })
        setInvitationResult(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create invitation')
      }
    },
  })

  const handleClose = () => {
    setOpen(false)
    setInvitationResult(null)
    setCopied(false)
    setError(null)
    form.reset()
  }

  const handleDone = () => {
    handleClose()
    router.invalidate()
  }

  const handleCopyLink = () => {
    if (!invitationResult) return
    const link = `${window.location.origin}/invite/${invitationResult.invitation.code}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose()
        else setOpen(isOpen)
      }}
    >
      <SheetTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="space-y-3 pb-6 border-b">
          <SheetTitle>Invite User</SheetTitle>
          <SheetDescription>
            Send an invitation to a new user to join the platform
          </SheetDescription>
        </SheetHeader>

        {invitationResult ? (
          <div className="space-y-6 py-6">
            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                Invitation Created!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                Share this link with <strong>{invitationResult.contact.email}</strong> to
                let them create their account:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-white dark:bg-gray-800 rounded border text-sm break-all">
                  {window.location.origin}/invite/{invitationResult.invitation.code}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                This invitation expires in 7 days.
              </p>
            </div>

            <div className="flex justify-end pt-6 border-t">
              <Button onClick={handleDone}>Done</Button>
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
            {error && (
              <div className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 p-3 rounded-lg border border-red-200 dark:border-red-800 text-sm">
                {error}
              </div>
            )}

            <form.Field
              name="email"
              validators={{
                onChange: inviteUserSchema.shape.email,
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
                    placeholder="e.g., john@example.com"
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
                    Name <span className="text-gray-400">(optional)</span>
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

            <div className="flex gap-3 justify-end pt-6 border-t">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button type="submit" disabled={!canSubmit || isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Send Invitation'}
                  </Button>
                )}
              </form.Subscribe>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
