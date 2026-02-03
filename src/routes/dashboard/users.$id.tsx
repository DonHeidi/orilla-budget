import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { useState } from 'react'
import { Mail, AtSign, User, Trash2 } from 'lucide-react'
import { userRepository } from '@/repositories/user.repository'
import type { User as UserType } from '@/schemas'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
    hour12: true,
  }
  return date.toLocaleString('en-US', options)
}

// Server functions
const updateUserFn = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: UserType }) => {
    const request = getRequest()
    const { id, createdAt, ...updateData } = data

    // Filter out undefined values
    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    ) as Record<string, unknown>

    if (Object.keys(cleanUpdateData).length === 0) {
      throw new Error('No fields to update')
    }

    // Update handle via repository helper (app-specific field)
    if (cleanUpdateData.handle) {
      await userRepository.updateHandle(id, cleanUpdateData.handle as string)
    }

    // For email updates, use Better Auth admin API
    // Note: Better Auth doesn't have a direct updateUser API, so email changes would need
    // to be handled via the user themselves or admin-specific endpoints

    return { success: true }
  }
)

const deleteUserFn = createServerFn({ method: 'POST' }).handler(
  async (ctx: { data: { id: string } }) => {
    const request = getRequest()

    // Delete user via userRepository
    await userRepository.remove(ctx.data.id)

    return { success: true }
  }
)

const getUserDetailDataFn = createServerFn({ method: 'GET' }).handler(
  async () => {
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
  }
)

// Route definition
export const Route = createFileRoute('/dashboard/users/$id')({
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
  const [editedValues, setEditedValues] = useState<Partial<UserType>>({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const users = data.users

  const user = users.find((u: any) => u.id === id)

  if (!user) {
    return (
      <Sheet
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            navigate({ to: '/dashboard/users' })
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-[540px] p-0">
          <SheetHeader className="px-6 py-5 border-b border-border/40">
            <SheetTitle>Error</SheetTitle>
            <SheetDescription>User not found</SheetDescription>
          </SheetHeader>
          <div className="px-6 py-6">
            <p className="text-muted-foreground">
              The requested user could not be found.
            </p>
          </div>
          <div className="flex gap-3 justify-end px-6 py-4 border-t border-border/40 bg-muted/30">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/dashboard/users' })}
            >
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
        ([key, value]) => user[key as keyof UserType] !== value
      )

      if (hasChanges) {
        const updatePayload = {
          id: user.id,
          createdAt: user.createdAt,
          ...editedValues,
        }
        await updateUserFn({ data: updatePayload as UserType })
        // Invalidate router cache to refetch data without full page reload
        router.invalidate()
      }
      setEditedValues({})
    }
    setEditingField(null)
  }

  const handleFieldChange = (fieldName: string, value: any) => {
    setEditedValues((prev) => ({ ...prev, [fieldName]: value }))
  }

  const handleDelete = async () => {
    try {
      await deleteUserFn({ data: { id: user.id } })
      await router.invalidate()
      setShowDeleteConfirm(false)
      navigate({ to: '/dashboard/users' })
    } catch (error) {
      console.error('Failed to delete user:', error)
    }
  }

  return (
    <>
      <Sheet
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            navigate({ to: '/dashboard/users' })
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-[540px] overflow-y-auto p-0">
          {/* Header */}
          <SheetHeader className="px-6 py-5 border-b border-border/40">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="font-display text-lg tracking-wide">
                  @{currentValues.handle}
                </SheetTitle>
                <SheetDescription className="mt-1">
                  {currentValues.email}
                </SheetDescription>
              </div>
              {user.role && (
                <Badge variant="default">
                  {user.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                </Badge>
              )}
            </div>
          </SheetHeader>

          <div className="px-6 py-6 space-y-6">
            {/* Details Section */}
            <div className="space-y-4">
              <h3 className="font-display text-sm tracking-wider uppercase text-muted-foreground">
                Details
              </h3>

              {/* Handle */}
              <button
                type="button"
                onClick={() => handleFieldClick('handle')}
                className="w-full text-left rounded-lg px-3 py-3 -mx-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start gap-3">
                  <AtSign className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Handle
                    </p>
                    {editingField === 'handle' ? (
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          @
                        </span>
                        <Input
                          autoFocus
                          value={currentValues.handle}
                          onChange={(e) =>
                            handleFieldChange('handle', e.target.value)
                          }
                          onBlur={handleFieldBlur}
                          onClick={(e) => e.stopPropagation()}
                          className="pl-7 h-9"
                        />
                      </div>
                    ) : (
                      <p className="text-sm font-medium mt-1">@{currentValues.handle}</p>
                    )}
                  </div>
                </div>
              </button>

              {/* Email */}
              <button
                type="button"
                onClick={() => handleFieldClick('email')}
                className="w-full text-left rounded-lg px-3 py-3 -mx-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Email
                    </p>
                    {editingField === 'email' ? (
                      <Input
                        autoFocus
                        type="email"
                        value={currentValues.email}
                        onChange={(e) => handleFieldChange('email', e.target.value)}
                        onBlur={handleFieldBlur}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 h-9"
                      />
                    ) : (
                      <p className="text-sm mt-1">{currentValues.email}</p>
                    )}
                  </div>
                </div>
              </button>

              {/* Created */}
              <div className="px-3 py-3 -mx-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Created
                </p>
                <p className="text-sm mt-1">{formatDateTime(user.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-between px-6 py-4 border-t border-border/40 bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/dashboard/users' })}
            >
              Close
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "@{user.handle}"? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
