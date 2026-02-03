import {
  createFileRoute,
  getRouteApi,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState, useRef, useEffect } from 'react'
import { Users, Mail, Building2, Key, UserCog } from 'lucide-react'
import { accountRepository } from '@/repositories/account.repository'
import type { Account } from '@/schemas'
import { Badge } from '@/components/ui/badge'
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

// Server function for updates only
const updateAccountFn = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: Account }) => {
    const { id, createdAt, accessCode, organisationId, ...updateData } = data

    // Filter out undefined values
    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    )

    if (Object.keys(cleanUpdateData).length === 0) {
      throw new Error('No fields to update')
    }

    return await accountRepository.update(id, cleanUpdateData)
  }
)

const parentRouteApi = getRouteApi('/dashboard/_orgs')

// Route definition
export const Route = createFileRoute('/dashboard/_orgs/accounts/$id')({
  component: AccountDetailPage,
})

function AccountDetailPage() {
  const { id } = Route.useParams()
  const parentData = parentRouteApi.useLoaderData()

  const navigate = useNavigate()
  const router = useRouter()
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editedValues, setEditedValues] = useState<Partial<Account>>({})
  const roleSelectRef = useRef<HTMLSelectElement>(null)

  // Get data from parent route
  const accounts = parentData?.accounts || []
  const organisations = parentData?.organisations || []

  const account = accounts.find((a: any) => a.id === id)

  // Auto-open select when role field becomes editable
  // Note: This hook must be called before any conditional returns to follow React's Rules of Hooks
  useEffect(() => {
    if (account && editingField === 'role' && roleSelectRef.current) {
      roleSelectRef.current.showPicker?.()
    }
  }, [account, editingField])

  if (!account) {
    return (
      <Sheet
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            navigate({ to: '/dashboard/accounts' })
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-[540px] p-0">
          <SheetHeader className="px-6 py-5 border-b border-border/40">
            <SheetTitle>Error</SheetTitle>
            <SheetDescription>Account not found</SheetDescription>
          </SheetHeader>
          <div className="px-6 py-6">
            <p className="text-muted-foreground">
              The requested account could not be found.
            </p>
          </div>
          <div className="flex gap-3 justify-end px-6 py-4 border-t border-border/40 bg-muted/30">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/dashboard/accounts' })}
            >
              Back to List
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  const organisation = organisations.find(
    (o: any) => o.id === account.organisationId
  )

  const currentValues = { ...account, ...editedValues }

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
        ([key, value]) => account[key as keyof Account] !== value
      )

      if (hasChanges) {
        const updatePayload = {
          id: account.id,
          createdAt: account.createdAt,
          accessCode: account.accessCode,
          organisationId: account.organisationId,
          ...editedValues,
        }
        await updateAccountFn({ data: updatePayload as Account })
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

  const getRoleLabel = (role: string | null | undefined) => {
    switch (role) {
      case 'project_manager':
        return 'Project Manager'
      case 'finance':
        return 'Finance/Controller'
      default:
        return 'Contact'
    }
  }

  return (
    <Sheet
      open={true}
      onOpenChange={(open) => {
        if (!open) {
          navigate({ to: '/dashboard/accounts' })
        }
      }}
    >
      <SheetContent className="w-full sm:max-w-[540px] overflow-y-auto p-0">
        {/* Header */}
        <SheetHeader className="px-6 py-5 border-b border-border/40">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="font-display text-lg tracking-wide">
                {currentValues.name}
              </SheetTitle>
              <SheetDescription className="mt-1">
                {currentValues.email}
              </SheetDescription>
            </div>
            <Badge variant="secondary">
              {getRoleLabel(currentValues.role)}
            </Badge>
          </div>
        </SheetHeader>

        <div className="px-6 py-6 space-y-6">
          {/* Details Section */}
          <div className="space-y-4">
            <h3 className="font-display text-sm tracking-wider uppercase text-muted-foreground">
              Details
            </h3>

            {/* Name */}
            <button
              type="button"
              onClick={() => handleFieldClick('name')}
              className="w-full text-left rounded-lg px-3 py-3 -mx-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Account Name
                  </p>
                  {editingField === 'name' ? (
                    <Input
                      autoFocus
                      value={currentValues.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      onBlur={handleFieldBlur}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 h-9"
                    />
                  ) : (
                    <p className="text-sm font-medium mt-1">{currentValues.name}</p>
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

            {/* Role */}
            <button
              type="button"
              onClick={() => handleFieldClick('role')}
              className="w-full text-left rounded-lg px-3 py-3 -mx-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <UserCog className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Role
                  </p>
                  {editingField === 'role' ? (
                    <Select
                      value={currentValues.role || 'contact'}
                      onValueChange={(value) => {
                        handleFieldChange('role', value)
                        handleFieldBlur({} as React.FocusEvent)
                      }}
                    >
                      <SelectTrigger
                        className="mt-1 h-9"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contact">Contact</SelectItem>
                        <SelectItem value="project_manager">Project Manager</SelectItem>
                        <SelectItem value="finance">Finance/Controller</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm mt-1">{getRoleLabel(currentValues.role)}</p>
                  )}
                </div>
              </div>
            </button>

            {/* Organisation */}
            <div className="px-3 py-3 -mx-3">
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Organisation
                  </p>
                  <div className="mt-2 bg-muted/30 rounded-lg p-3">
                    <p className="font-medium text-sm">{organisation?.name || 'Unknown'}</p>
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      <p>Contact: {organisation?.contactName}</p>
                      <p>{organisation?.contactEmail}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Access Code */}
            <div className="px-3 py-3 -mx-3">
              <div className="flex items-start gap-3">
                <Key className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Access Code
                  </p>
                  <div className="mt-2 bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-2">
                      This code is used to access the client portal:
                    </p>
                    <code className="text-xl font-mono font-bold block bg-background border border-border rounded p-3 text-center">
                      {account.accessCode}
                    </code>
                  </div>
                </div>
              </div>
            </div>

            {/* Created */}
            <div className="px-3 py-3 -mx-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Created
              </p>
              <p className="text-sm mt-1">{formatDateTime(account.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end px-6 py-4 border-t border-border/40 bg-muted/30">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: '/dashboard/accounts' })}
          >
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
