import { createFileRoute, getRouteApi, useNavigate, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState, useRef, useEffect } from 'react'
import { Users, Mail, Building2, Key, UserCog } from 'lucide-react'
import { accountRepository } from '@/repositories/account.repository'
import type { Account } from '@/schemas'
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

  if (!account) {
    return (
      <Sheet open={true} onOpenChange={(open) => {
        if (!open) {
          navigate({ to: '/dashboard/accounts' })
        }
      }}>
        <SheetContent className="w-full sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle>Error</SheetTitle>
            <SheetDescription>Account not found</SheetDescription>
          </SheetHeader>
          <div className="py-6">
            <p className="text-gray-500">The requested account could not be found.</p>
          </div>
          <div className="flex gap-3 justify-end pt-6 border-t">
            <Button variant="outline" onClick={() => navigate({ to: '/dashboard/accounts' })}>
              Back to List
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  const organisation = organisations.find((o: any) => o.id === account.organisationId)

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
    setEditedValues(prev => ({ ...prev, [fieldName]: value }))
  }

  // Auto-open select when role field becomes editable
  useEffect(() => {
    if (editingField === 'role' && roleSelectRef.current) {
      roleSelectRef.current.showPicker?.()
    }
  }, [editingField])

  return (
    <Sheet open={true} onOpenChange={(open) => {
      if (!open) {
        navigate({ to: '/dashboard/accounts' })
      }
    }}>
      <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="space-y-3 pb-6 border-b">
          <SheetTitle>Account Details</SheetTitle>
          <SheetDescription>
            View and edit detailed information about this account
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">
                <Users className="inline-block h-4 w-4 mr-1" />
                Account Name
              </label>
              {editingField === 'name' ? (
                <Input
                  autoFocus
                  value={currentValues.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  onBlur={handleFieldBlur}
                  className="mt-1"
                />
              ) : (
                <p
                  className="text-base mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2"
                  onClick={() => handleFieldClick('name')}
                >
                  {currentValues.name}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">
                <Mail className="inline-block h-4 w-4 mr-1" />
                Email
              </label>
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
                  className="text-base mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2"
                  onClick={() => handleFieldClick('email')}
                >
                  {currentValues.email}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">
                <UserCog className="inline-block h-4 w-4 mr-1" />
                Role
              </label>
              {editingField === 'role' ? (
                <select
                  ref={roleSelectRef}
                  autoFocus
                  value={currentValues.role || 'contact'}
                  onChange={(e) => handleFieldChange('role', e.target.value)}
                  onBlur={handleFieldBlur}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background mt-1"
                >
                  <option value="contact">Contact</option>
                  <option value="project_manager">Project Manager</option>
                  <option value="finance">Finance/Controller</option>
                </select>
              ) : (
                <p
                  className="text-base mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2"
                  onClick={() => handleFieldClick('role')}
                >
                  {currentValues.role === 'contact' && 'Contact'}
                  {currentValues.role === 'project_manager' && 'Project Manager'}
                  {currentValues.role === 'finance' && 'Finance/Controller'}
                </p>
              )}
            </div>

            <div className="pt-4 border-t">
              <label className="text-sm font-medium text-gray-500 mb-3 block">
                <Building2 className="inline-block h-4 w-4 mr-1" />
                Organisation
              </label>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <p className="font-medium">{organisation?.name || 'Unknown'}</p>
                <div className="text-sm text-gray-500 mt-1 space-y-1">
                  <p>Contact: {organisation?.contactName}</p>
                  <p>{organisation?.contactEmail}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <label className="text-sm font-medium text-gray-500 mb-3 block">
                <Key className="inline-block h-4 w-4 mr-1" />
                Access Code
              </label>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                  This code is used to access the client portal:
                </p>
                <code className="text-2xl font-mono font-bold block bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded p-3 text-center">
                  {account.accessCode}
                </code>
              </div>
            </div>

            <div className="pt-4 border-t">
              <label className="text-sm font-medium text-gray-500">Created</label>
              <p className="text-base mt-1">{formatDateTime(account.createdAt)}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-6 border-t">
          <Button variant="outline" onClick={() => navigate({ to: '/dashboard/accounts' })}>
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
