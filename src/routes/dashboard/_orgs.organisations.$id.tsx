import {
  createFileRoute,
  getRouteApi,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { useState } from 'react'
import { Users, Mail, Building2, Key } from 'lucide-react'
import { authRepository } from '@/repositories/auth.repository'
import { organisationRepository } from '@/repositories/organisation.repository'
import type { Organisation } from '@/schemas'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
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

/**
 * Generate a slug from text
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Server function for updates only
const updateOrganisationFn = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: Organisation }) => {
    const request = getRequest()
    const { id, createdAt, ...updateData } = data

    // Filter out undefined values
    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    ) as Record<string, unknown>

    if (Object.keys(cleanUpdateData).length === 0) {
      throw new Error('No fields to update')
    }

    // Use Better Auth API for name updates
    if (cleanUpdateData.name) {
      await authRepository.updateOrganization(id, {
        name: cleanUpdateData.name as string,
        slug: slugify(cleanUpdateData.name as string),
      })
    }

    // Update custom contact fields via repository helper
    const customFields: Record<string, unknown> = {}
    if ('contactName' in cleanUpdateData) customFields.contactName = cleanUpdateData.contactName
    if ('contactEmail' in cleanUpdateData) customFields.contactEmail = cleanUpdateData.contactEmail
    if ('contactPhone' in cleanUpdateData) customFields.contactPhone = cleanUpdateData.contactPhone

    if (Object.keys(customFields).length > 0) {
      await organisationRepository.updateContactFields(id, customFields as { contactName?: string | null; contactEmail?: string | null; contactPhone?: string | null })
    }

    return await organisationRepository.findById(id)
  }
)

const parentRouteApi = getRouteApi('/dashboard/_orgs')

// Route definition
export const Route = createFileRoute('/dashboard/_orgs/organisations/$id')({
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
      <Sheet
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            navigate({ to: '/dashboard/organisations' })
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-[540px] p-0">
          <SheetHeader className="px-6 py-5 border-b border-border/40">
            <SheetTitle>Error</SheetTitle>
            <SheetDescription>Organisation not found</SheetDescription>
          </SheetHeader>
          <div className="px-6 py-6">
            <p className="text-muted-foreground">
              The requested organisation could not be found.
            </p>
          </div>
          <div className="flex gap-3 justify-end px-6 py-4 border-t border-border/40 bg-muted/30">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/dashboard/organisations' })}
            >
              Back to List
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  const organisationAccounts = accounts.filter(
    (a: any) => a.organisationId === organisation.id
  )

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
    setEditedValues((prev) => ({ ...prev, [fieldName]: value }))
  }

  return (
    <Sheet
      open={true}
      onOpenChange={(open) => {
        if (!open) {
          navigate({ to: '/dashboard/organisations' })
        }
      }}
    >
      <SheetContent className="w-full sm:max-w-[540px] overflow-y-auto p-0">
        {/* Header */}
        <SheetHeader className="px-6 py-5 border-b border-border/40">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="font-display text-lg tracking-wide">
                {currentValues.name}
              </SheetTitle>
              <SheetDescription className="mt-1">
                {organisationAccounts.length} account{organisationAccounts.length !== 1 ? 's' : ''}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="px-6 py-6 space-y-6">
          {/* Details Section */}
          <div className="space-y-4">
            <h3 className="font-display text-sm tracking-wider uppercase text-muted-foreground">
              Details
            </h3>

            {/* Organisation Name */}
            <button
              type="button"
              onClick={() => handleFieldClick('name')}
              className="w-full text-left rounded-lg px-3 py-3 -mx-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Organisation Name
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

            {/* Contact Name */}
            <button
              type="button"
              onClick={() => handleFieldClick('contactName')}
              className="w-full text-left rounded-lg px-3 py-3 -mx-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Contact Name
                  </p>
                  {editingField === 'contactName' ? (
                    <Input
                      autoFocus
                      value={currentValues.contactName}
                      onChange={(e) => handleFieldChange('contactName', e.target.value)}
                      onBlur={handleFieldBlur}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 h-9"
                    />
                  ) : (
                    <p className="text-sm mt-1">{currentValues.contactName}</p>
                  )}
                </div>
              </div>
            </button>

            {/* Contact Email */}
            <button
              type="button"
              onClick={() => handleFieldClick('contactEmail')}
              className="w-full text-left rounded-lg px-3 py-3 -mx-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Contact Email
                  </p>
                  {editingField === 'contactEmail' ? (
                    <Input
                      autoFocus
                      type="email"
                      value={currentValues.contactEmail}
                      onChange={(e) => handleFieldChange('contactEmail', e.target.value)}
                      onBlur={handleFieldBlur}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 h-9"
                    />
                  ) : (
                    <p className="text-sm mt-1">{currentValues.contactEmail}</p>
                  )}
                </div>
              </div>
            </button>

            {/* Created */}
            <div className="px-3 py-3 -mx-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Created
              </p>
              <p className="text-sm mt-1">{formatDateTime(organisation.createdAt)}</p>
            </div>
          </div>

          <Separator />

          {/* Accounts Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-display text-sm tracking-wider uppercase text-muted-foreground">
                Accounts ({organisationAccounts.length})
              </h3>
            </div>

            {organisationAccounts.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No accounts yet.
              </p>
            ) : (
              <div className="space-y-2">
                {organisationAccounts.map((account: any) => (
                  <Card
                    key={account.id}
                    className="bg-muted/30 border-border/40"
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{account.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {account.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs mt-3">
                        <Key className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Access Code:</span>
                        <code className="px-2 py-1 bg-background border border-border rounded font-mono">
                          {account.accessCode}
                        </code>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end px-6 py-4 border-t border-border/40 bg-muted/30">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: '/dashboard/organisations' })}
          >
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
