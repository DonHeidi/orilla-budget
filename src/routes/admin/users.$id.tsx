import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { Mail, AtSign } from 'lucide-react'
import type { User } from '@/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

// Helper functions
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
const updateUserFn = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: User }) => {
    const { userRepository } = await import('@/server/repositories/user.repository')
    const { id, createdAt, ...updateData } = data

    // Filter out undefined values
    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    )

    if (Object.keys(cleanUpdateData).length === 0) {
      throw new Error('No fields to update')
    }

    return await userRepository.update(id, cleanUpdateData)
  }
)

const deleteUserFn = createServerFn({ method: 'POST' }).handler(
  async (ctx: { data: { id: string } }) => {
    const { userRepository } = await import('@/server/repositories/user.repository')
    await userRepository.delete(ctx.data.id)
    return { success: true }
  }
)

const getUserDetailDataFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { userRepository } = await import('@/server/repositories/user.repository')

  const users = await userRepository.findAll()

  return {
    users: JSON.parse(JSON.stringify(users)),
  }
})

// Route definition
export const Route = createFileRoute('/admin/users/$id')({
  component: UserDetailPage,
  loader: async () => {
    return await getUserDetailDataFn()
  },
})

function UserDetailPage() {
  const { id } = Route.useParams()
  const data = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editedValues, setEditedValues] = useState<Partial<User>>({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const users = data.users

  const user = users.find((u: any) => u.id === id)

  if (!user) {
    return (
      <Sheet open={true} onOpenChange={(open) => {
        if (!open) {
          navigate({ to: '/admin/users' })
        }
      }}>
        <SheetContent className="w-full sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle>Error</SheetTitle>
            <SheetDescription>User not found</SheetDescription>
          </SheetHeader>
          <div className="py-6">
            <p className="text-gray-500">The requested user could not be found.</p>
          </div>
          <div className="flex gap-3 justify-end pt-6 border-t">
            <Button variant="outline" onClick={() => navigate({ to: '/admin/users' })}>
              Back to List
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  const currentValues = { ...user, ...editedValues }

  const handleFieldClick = (fieldName: string) => {
    setEditingField(fieldName)
  }

  const handleFieldBlur = async (e: React.FocusEvent) => {
    // Use setTimeout to ensure blur completes before clearing selection
    setTimeout(() => {
      window.getSelection()?.removeAllRanges()
    }, 0)

    if (Object.keys(editedValues).length > 0) {
      // Check if any values actually changed
      const hasChanges = Object.entries(editedValues).some(
        ([key, value]) => user[key as keyof User] !== value
      )

      if (hasChanges) {
        const updatePayload = {
          id: user.id,
          createdAt: user.createdAt,
          ...editedValues,
        }
        await updateUserFn({ data: updatePayload as User })
        // Invalidate router cache to refetch data without full page reload
        router.invalidate()
      }
      setEditedValues({})
    }
    setEditingField(null)
  }

  const handleFieldChange = (fieldName: string, value: any) => {
    setEditedValues(prev => ({ ...prev, [fieldName]: value }))
  }

  const handleDelete = async () => {
    try {
      await deleteUserFn({ data: { id: user.id } })
      await router.invalidate()
      setShowDeleteConfirm(false)
      navigate({ to: '/admin/users' })
    } catch (error) {
      console.error('Failed to delete user:', error)
    }
  }

  return (
    <Sheet open={true} onOpenChange={(open) => {
      if (!open) {
        navigate({ to: '/admin/users' })
      }
    }}>
      <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="space-y-3 pb-6 border-b">
          <SheetTitle>User Details</SheetTitle>
          <SheetDescription>
            View and edit detailed information about this user
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Handle</label>
              {editingField === 'handle' ? (
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                  <Input
                    autoFocus
                    value={currentValues.handle}
                    onChange={(e) => handleFieldChange('handle', e.target.value)}
                    onBlur={handleFieldBlur}
                    className="pl-7"
                  />
                </div>
              ) : (
                <p
                  className="text-base mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2 flex items-center gap-1"
                  onClick={() => handleFieldClick('handle')}
                >
                  <AtSign className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">@{currentValues.handle}</span>
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              {editingField === 'email' ? (
                <Input
                  autoFocus
                  type="email"
                  value={currentValues.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  onBlur={handleFieldBlur}
                  className="mt-1"
                />
              ) : (
                <p
                  className="text-base mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2 flex items-center gap-1"
                  onClick={() => handleFieldClick('email')}
                >
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>{currentValues.email}</span>
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Created</label>
              <p className="text-base mt-1">{formatDateTime(user.createdAt)}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-between pt-6 border-t">
          <Button
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete User
          </Button>
          <Button variant="outline" onClick={() => navigate({ to: '/admin/users' })}>
            Close
          </Button>
        </div>

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md">
              <h3 className="text-lg font-semibold mb-2">Delete User</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to delete "{user.name}"? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
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
