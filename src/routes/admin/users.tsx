import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useMemo, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Users } from 'lucide-react'
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { userRepository } from '@/server/repositories/user.repository'
import { createUserSchema, type User } from '@/schemas'
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
    users: JSON.parse(JSON.stringify(users)),
  }
})

const createUserFn = createServerFn({ method: 'POST' })
  .inputValidator(createUserSchema)
  .handler(async ({ data }) => {
    const user: User = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      handle: data.handle,
      email: data.email,
      createdAt: new Date().toISOString(),
    }
    return await userRepository.create(user)
  })

export const Route = createFileRoute('/admin/users')({
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
          navigate({ to: '/admin/users/$id', params: { id: row.original.id } })
        }}
      />

      <Outlet />
    </div>
  )
}

function AddUserSheet() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const form = useForm({
    defaultValues: {
      handle: '',
      email: '',
    },
    validatorAdapter: zodValidator(),
    validators: {
      onSubmitAsync: createUserSchema,
    },
    onSubmit: async ({ value }) => {
      await createUserFn({
        data: {
          handle: value.handle,
          email: value.email,
        }
      })
      setOpen(false)
      form.reset()
      navigate({ to: '/admin/users' })
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
          Add User
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="space-y-3 pb-6 border-b">
          <SheetTitle>Add User</SheetTitle>
          <SheetDescription>
            Create a new user account
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
            name="handle"
            validators={{
              onChange: createUserSchema.shape.handle,
            }}
          >
            {(field) => (
              <div className="space-y-2">
                <label htmlFor={field.name} className="text-sm font-medium">
                  Handle *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g., johndoe"
                    className="pl-7"
                  />
                </div>
                {field.state.meta.isTouched && field.state.meta.errors && field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-red-500">
                    {field.state.meta.errors.map((err) =>
                      typeof err === 'string' ? err : err.message || JSON.stringify(err)
                    ).join(', ')}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field
            name="email"
            validators={{
              onChange: createUserSchema.shape.email,
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
                {field.state.meta.isTouched && field.state.meta.errors && field.state.meta.errors.length > 0 && (
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
            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create User'}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
