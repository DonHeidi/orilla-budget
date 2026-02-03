import {
  createFileRoute,
  getRouteApi,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { FolderKanban, Building2, Clock, Settings2, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { authRepository } from '@/repositories/auth.repository'
import { projectRepository } from '@/repositories/project.repository'
import { projectApprovalSettingsRepository } from '@/repositories/projectApprovalSettings.repository'
import type { Project, ProjectApprovalSettings, UpdateProjectApprovalSettings } from '@/schemas'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ApprovalSettingsForm } from '@/components/ApprovalSettingsForm'

// Use parent route for data (follows pattern from time-entries.$id.tsx)
const parentRouteApi = getRouteApi('/dashboard/projects')

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
const updateProjectFn = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: Partial<Project> & { id: string } }) => {
    const { id, createdAt, teamId, createdBy, organisationId, updatedAt, ...updateData } = data

    // Filter out undefined values
    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    ) as Record<string, unknown>

    if (Object.keys(cleanUpdateData).length === 0) {
      throw new Error('No fields to update')
    }

    // Get the project to find its team ID for Better Auth updates
    const project = await projectRepository.findById(id)
    if (!project) {
      throw new Error('Project not found')
    }

    // Use Better Auth API for name updates (syncs the team name)
    if (cleanUpdateData.name) {
      await authRepository.updateTeam(project.teamId, {
        name: cleanUpdateData.name as string,
      })
    }

    // Update project business data via repository
    await projectRepository.update(id, cleanUpdateData as {
      name?: string
      description?: string
      category?: 'budget' | 'fixed'
      budgetHours?: number | null
    })

    return await projectRepository.findById(id)
  }
)

const deleteProjectFn = createServerFn({ method: 'POST' }).handler(
  async (ctx: { data: { id: string } }) => {
    console.log('Deleting project with id:', ctx.data.id)

    // Get the project to find its team ID
    const project = await projectRepository.findById(ctx.data.id)
    if (!project) {
      throw new Error('Project not found')
    }

    // Delete via Better Auth API (using team ID)
    // This will cascade delete the project record due to FK constraint
    await authRepository.removeTeam(project.teamId)

    console.log('Project deleted successfully')
    return { success: true }
  }
)

// Server functions for approval settings
const getApprovalSettingsFn = createServerFn({ method: 'GET' }).handler(
  async ({ data }: { data: { projectId: string } }) => {
    const settings =
      await projectApprovalSettingsRepository.getOrCreateForProject(
        data.projectId
      )
    return settings
  }
)

const updateApprovalSettingsFn = createServerFn({ method: 'POST' }).handler(
  async ({
    data,
  }: {
    data: { projectId: string; settings: UpdateProjectApprovalSettings }
  }) => {
    await projectApprovalSettingsRepository.update(data.projectId, data.settings)
    return { success: true }
  }
)

// Route definition - no loader, uses parent route data
export const Route = createFileRoute('/dashboard/projects/$id')({
  component: ProjectDetailPage,
})

function ProjectDetailPage() {
  const { id } = Route.useParams()
  const data = parentRouteApi.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editedValues, setEditedValues] = useState<Partial<Project>>({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showApprovalSettings, setShowApprovalSettings] = useState(false)
  const [approvalSettings, setApprovalSettings] =
    useState<ProjectApprovalSettings | null>(null)
  const [loadingSettings, setLoadingSettings] = useState(false)

  // Get data from route loader
  const projects = data.projects
  const organisations = data.organisations
  const timeEntries = data.timeEntries

  const project = projects.find((p: any) => p.id === id)

  if (!project) {
    return (
      <Sheet
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            navigate({ to: '/dashboard/projects' })
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle>Error</SheetTitle>
            <SheetDescription>Project not found</SheetDescription>
          </SheetHeader>
          <div className="py-6">
            <p className="text-gray-500">
              The requested project could not be found.
            </p>
          </div>
          <div className="flex gap-3 justify-end pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => navigate({ to: '/dashboard/projects' })}
            >
              Back to List
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  const organisation = organisations.find(
    (o: any) => o.id === project.organisationId
  )
  // Time entries reference team IDs (project.teamId), not project IDs
  const projectTimeEntries = timeEntries.filter(
    (t: any) => t.projectId === project.teamId
  )
  const totalHours = projectTimeEntries.reduce(
    (sum: number, t: any) => sum + t.hours,
    0
  )
  const remainingHours = project.budgetHours - totalHours

  const currentValues = { ...project, ...editedValues }

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
        ([key, value]) => project[key as keyof Project] !== value
      )

      if (hasChanges) {
        const updatePayload = {
          id: project.id,
          createdAt: project.createdAt,
          ...editedValues,
        }
        await updateProjectFn({ data: updatePayload as Project })
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
      console.log('Starting delete for project:', project.id)
      await deleteProjectFn({ data: { id: project.id } })
      console.log('Delete completed, invalidating router')
      await router.invalidate()
      setShowDeleteConfirm(false)
      navigate({ to: '/dashboard/projects' })
    } catch (error) {
      console.error('Failed to delete project:', error)
    }
  }

  const handleToggleApprovalSettings = async () => {
    if (!showApprovalSettings && !approvalSettings) {
      setLoadingSettings(true)
      try {
        // Approval settings use team ID as project ID
        const settings = await getApprovalSettingsFn({
          data: { projectId: project.teamId },
        })
        setApprovalSettings(settings)
      } catch (error) {
        console.error('Failed to load approval settings:', error)
      } finally {
        setLoadingSettings(false)
      }
    }
    setShowApprovalSettings(!showApprovalSettings)
  }

  const handleSaveApprovalSettings = async (
    updates: UpdateProjectApprovalSettings
  ) => {
    // Approval settings use team ID as project ID
    await updateApprovalSettingsFn({
      data: { projectId: project.teamId, settings: updates },
    })
    // Update local state
    if (approvalSettings) {
      setApprovalSettings({
        ...approvalSettings,
        ...updates,
        updatedAt: new Date().toISOString(),
      })
    }
  }

  return (
    <>
      <Sheet
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            navigate({ to: '/dashboard/projects' })
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-[540px] overflow-y-auto p-0">
          {/* Header */}
          <SheetHeader className="px-6 py-5 border-b border-border/40">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <FolderKanban className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="font-display text-lg tracking-wide">
                  {currentValues.name}
                </SheetTitle>
                <SheetDescription className="mt-1">
                  {organisation?.name || 'Unknown Organisation'}
                </SheetDescription>
              </div>
              <Badge
                variant={currentValues.category === 'budget' ? 'default' : 'secondary'}
                className="shrink-0"
              >
                {currentValues.category === 'budget' ? 'Budget' : 'Fixed'}
              </Badge>
            </div>
          </SheetHeader>

          <div className="px-6 py-6 space-y-6">
            {/* Budget Summary Card */}
            {currentValues.category === 'budget' && currentValues.budgetHours !== null && (
              <Card className="bg-muted/30 border-border/40">
                <CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Budget
                      </p>
                      <p className="text-xl font-semibold tabular-nums mt-1">
                        {currentValues.budgetHours}h
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Used
                      </p>
                      <p className="text-xl font-semibold tabular-nums mt-1">
                        {totalHours.toFixed(1)}h
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Remaining
                      </p>
                      <p
                        className={cn(
                          'text-xl font-semibold tabular-nums mt-1',
                          remainingHours < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        )}
                      >
                        {remainingHours.toFixed(1)}h
                      </p>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <p className="text-sm text-muted-foreground text-center">
                    {projectTimeEntries.length} time entries logged
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Details Section */}
            <div className="space-y-4">
              <h3 className="font-display text-sm tracking-wider uppercase text-muted-foreground">
                Details
              </h3>

              {/* Organisation */}
              <button
                type="button"
                onClick={() => handleFieldClick('organisationId')}
                className="w-full text-left rounded-lg px-3 py-3 -mx-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Organisation
                    </p>
                    {editingField === 'organisationId' ? (
                      <select
                        autoFocus
                        value={currentValues.organisationId || ''}
                        onChange={(e) =>
                          handleFieldChange('organisationId', e.target.value)
                        }
                        onBlur={handleFieldBlur}
                        onClick={(e) => e.stopPropagation()}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                      >
                        {organisations.map((org: any) => (
                          <option key={org.id} value={org.id}>
                            {org.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm mt-1">{organisation?.name || 'Unknown'}</p>
                    )}
                  </div>
                </div>
              </button>

              {/* Project Name */}
              <button
                type="button"
                onClick={() => handleFieldClick('name')}
                className="w-full text-left rounded-lg px-3 py-3 -mx-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start gap-3">
                  <FolderKanban className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Project Name
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

              {/* Description */}
              <button
                type="button"
                onClick={() => handleFieldClick('description')}
                className="w-full text-left rounded-lg px-3 py-3 -mx-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Description
                  </p>
                  {editingField === 'description' ? (
                    <textarea
                      autoFocus
                      value={currentValues.description}
                      onChange={(e) =>
                        handleFieldChange('description', e.target.value)
                      }
                      onBlur={handleFieldBlur}
                      onClick={(e) => e.stopPropagation()}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm mt-1 text-muted-foreground">
                      {currentValues.description || 'No description'}
                    </p>
                  )}
                </div>
              </button>

              {/* Category */}
              <button
                type="button"
                onClick={() => handleFieldClick('category')}
                className="w-full text-left rounded-lg px-3 py-3 -mx-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Category
                  </p>
                  {editingField === 'category' ? (
                    <select
                      autoFocus
                      value={currentValues.category}
                      onChange={(e) =>
                        handleFieldChange(
                          'category',
                          e.target.value as 'budget' | 'fixed'
                        )
                      }
                      onBlur={handleFieldBlur}
                      onClick={(e) => e.stopPropagation()}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                    >
                      <option value="budget">Budget (Time & Materials)</option>
                      <option value="fixed">Fixed Price</option>
                    </select>
                  ) : (
                    <p className="text-sm mt-1">
                      {currentValues.category === 'budget'
                        ? 'Budget (Time & Materials)'
                        : 'Fixed Price'}
                    </p>
                  )}
                </div>
              </button>

              {/* Budget Hours */}
              {currentValues.category === 'budget' && (
                <button
                  type="button"
                  onClick={() => handleFieldClick('budgetHours')}
                  className="w-full text-left rounded-lg px-3 py-3 -mx-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Budget Hours
                      </p>
                      {editingField === 'budgetHours' ? (
                        <Input
                          autoFocus
                          type="number"
                          step="0.5"
                          value={currentValues.budgetHours || 0}
                          onChange={(e) =>
                            handleFieldChange(
                              'budgetHours',
                              parseFloat(e.target.value)
                            )
                          }
                          onBlur={handleFieldBlur}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 h-9"
                        />
                      ) : (
                        <p className="text-sm font-medium tabular-nums mt-1">
                          {currentValues.budgetHours ?? 0} hours
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              )}

              {/* Created */}
              <div className="px-3 py-3 -mx-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Created
                </p>
                <p className="text-sm mt-1">{formatDateTime(project.createdAt)}</p>
              </div>
            </div>

            <Separator />

            {/* Approval Settings Section */}
            <div>
              <button
                type="button"
                onClick={handleToggleApprovalSettings}
                className="flex items-center justify-between w-full text-left py-2"
              >
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-display text-sm tracking-wider uppercase text-muted-foreground">
                    Approval Settings
                  </span>
                </div>
                {showApprovalSettings ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {showApprovalSettings && (
                <div className="mt-4 pl-6">
                  {loadingSettings ? (
                    <p className="text-sm text-muted-foreground">
                      Loading settings...
                    </p>
                  ) : approvalSettings ? (
                    <ApprovalSettingsForm
                      settings={approvalSettings}
                      onSave={handleSaveApprovalSettings}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Failed to load settings
                    </p>
                  )}
                </div>
              )}
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
              onClick={() => navigate({ to: '/dashboard/projects' })}
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
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{project.name}"? This action
              cannot be undone and will also delete all associated time entries
              ({projectTimeEntries.length} entries).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
