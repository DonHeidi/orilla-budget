import { createFileRoute, useNavigate, useRouter, getRouteApi } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { Users, Mail, Building2, Clock } from 'lucide-react'
import type { Organisation } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

const parentRouteApi = getRouteApi('/admin/organisations')

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
const updateOrganisationFn = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: Organisation }) => {
    const { organisationRepository } = await import('@/server/repositories/organisation.repository')
    const { id, createdAt, ...updateData } = data

    // Filter out undefined values
    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    )

    if (Object.keys(cleanUpdateData).length === 0) {
      throw new Error('No fields to update')
    }

    return await organisationRepository.update(id, cleanUpdateData)
  }
)

// Route definition - no loader needed, uses parent data
export const Route = createFileRoute('/admin/organisations/$id')({
  component: OrganisationDetailPage,
})

function OrganisationDetailPage() {
  const { id } = Route.useParams()
  const parentData = parentRouteApi.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editedValues, setEditedValues] = useState<Partial<Organisation>>({})

  // Get data from parent route
  const organisations = parentData?.organisations || []
  const accounts = parentData?.accounts || []

  const organisation = organisations.find((o: any) => o.id === id)

  if (!organisation) {
    return (
      <Sheet open={true} onOpenChange={(open) => {
        if (!open) {
          navigate({ to: '/admin/organisations' })
        }
      }}>
        <SheetContent className="w-full sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle>Error</SheetTitle>
            <SheetDescription>Organisation not found</SheetDescription>
          </SheetHeader>
          <div className="py-6">
            <p className="text-gray-500">The requested organisation could not be found.</p>
          </div>
          <div className="flex gap-3 justify-end pt-6 border-t">
            <Button variant="outline" onClick={() => navigate({ to: '/admin/organisations' })}>
              Back to List
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  const organisationAccounts = accounts.filter((a: any) => a.organisationId === organisation.id)

  const currentValues = { ...organisation, ...editedValues }

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
        ([key, value]) => organisation[key as keyof Organisation] !== value
      )

      if (hasChanges) {
        const updatePayload = {
          id: organisation.id,
          createdAt: organisation.createdAt,
          ...editedValues,
        }
        await updateOrganisationFn({ data: updatePayload as Organisation })
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

  return (
    <Sheet open={true} onOpenChange={(open) => {
      if (!open) {
        navigate({ to: '/admin/organisations' })
      }
    }}>
      <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="space-y-3 pb-6 border-b">
          <SheetTitle>Organisation Details</SheetTitle>
          <SheetDescription>
            View and edit detailed information about this organisation
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">
                <Building2 className="inline-block h-4 w-4 mr-1" />
                Organisation Name
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
                <Users className="inline-block h-4 w-4 mr-1" />
                Contact Name
              </label>
              {editingField === 'contactName' ? (
                <Input
                  autoFocus
                  value={currentValues.contactName}
                  onChange={(e) => handleFieldChange('contactName', e.target.value)}
                  onBlur={handleFieldBlur}
                  className="mt-1"
                />
              ) : (
                <p
                  className="text-base mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2"
                  onClick={() => handleFieldClick('contactName')}
                >
                  {currentValues.contactName}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">
                <Mail className="inline-block h-4 w-4 mr-1" />
                Contact Email
              </label>
              {editingField === 'contactEmail' ? (
                <Input
                  autoFocus
                  type="email"
                  value={currentValues.contactEmail}
                  onChange={(e) => handleFieldChange('contactEmail', e.target.value)}
                  onBlur={handleFieldBlur}
                  className="mt-1"
                />
              ) : (
                <p
                  className="text-base mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2"
                  onClick={() => handleFieldClick('contactEmail')}
                >
                  {currentValues.contactEmail}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">
                <Clock className="inline-block h-4 w-4 mr-1" />
                Total Budget (hours)
              </label>
              {editingField === 'totalBudgetHours' ? (
                <Input
                  autoFocus
                  type="number"
                  step="0.5"
                  min="0"
                  value={currentValues.totalBudgetHours}
                  onChange={(e) => handleFieldChange('totalBudgetHours', parseFloat(e.target.value) || 0)}
                  onBlur={handleFieldBlur}
                  className="mt-1"
                />
              ) : (
                <p
                  className="text-base mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2"
                  onClick={() => handleFieldClick('totalBudgetHours')}
                >
                  {currentValues.totalBudgetHours} hours
                </p>
              )}
            </div>

            <div className="pt-4 border-t">
              <label className="text-sm font-medium text-gray-500 mb-3 block">
                <Users className="inline-block h-4 w-4 mr-1" />
                Accounts ({organisationAccounts.length})
              </label>
              {organisationAccounts.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No accounts yet</p>
              ) : (
                <div className="space-y-3">
                  {organisationAccounts.map((account: any) => (
                    <div key={account.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{account.name}</p>
                          <p className="text-sm text-gray-500">{account.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Access Code:</span>
                        <code className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded font-mono">
                          {account.accessCode}
                        </code>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <label className="text-sm font-medium text-gray-500">Created</label>
              <p className="text-base mt-1">{formatDateTime(organisation.createdAt)}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-6 border-t">
          <Button variant="outline" onClick={() => navigate({ to: '/admin/organisations' })}>
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
