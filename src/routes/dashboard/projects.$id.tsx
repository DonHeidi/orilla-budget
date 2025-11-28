import {
  createFileRoute,
  getRouteApi,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { FolderKanban, Building2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { projectRepository } from '@/repositories/project.repository'
import type { Project } from '@/schemas'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

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
  async ({ data }: { data: Project }) => {
    const { id, createdAt, ...updateData } = data

    // Filter out undefined values
    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    )

    if (Object.keys(cleanUpdateData).length === 0) {
      throw new Error('No fields to update')
    }

    return await projectRepository.update(id, cleanUpdateData)
  }
)

const deleteProjectFn = createServerFn({ method: 'POST' }).handler(
  async (ctx: { data: { id: string } }) => {
    console.log('Deleting project with id:', ctx.data.id)
    await projectRepository.delete(ctx.data.id)
    console.log('Project deleted successfully')
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
  const projectTimeEntries = timeEntries.filter(
    (t: any) => t.projectId === project.id
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

  return (
    <Sheet
      open={true}
      onOpenChange={(open) => {
        if (!open) {
          navigate({ to: '/dashboard/projects' })
        }
      }}
    >
      <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="space-y-3 pb-6 border-b">
          <SheetTitle>Project Details</SheetTitle>
          <SheetDescription>
            View and edit detailed information about this project
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">
                Organisation
              </label>
              {editingField === 'organisationId' ? (
                <select
                  autoFocus
                  value={currentValues.organisationId || ''}
                  onChange={(e) =>
                    handleFieldChange('organisationId', e.target.value)
                  }
                  onBlur={handleFieldBlur}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background mt-1"
                >
                  {organisations.map((org: any) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p
                  className="text-base mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2 flex items-center gap-1"
                  onClick={() => handleFieldClick('organisationId')}
                >
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <span>{organisation?.name || 'Unknown'}</span>
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">
                Project Name
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
                  className="text-base mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2 flex items-center gap-1"
                  onClick={() => handleFieldClick('name')}
                >
                  <FolderKanban className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{currentValues.name}</span>
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">
                Description
              </label>
              {editingField === 'description' ? (
                <textarea
                  autoFocus
                  value={currentValues.description}
                  onChange={(e) =>
                    handleFieldChange('description', e.target.value)
                  }
                  onBlur={handleFieldBlur}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm mt-1"
                  rows={3}
                />
              ) : (
                <p
                  className="text-base mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2 min-h-[1.5rem]"
                  onClick={() => handleFieldClick('description')}
                >
                  {currentValues.description || 'Click to add description...'}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">
                Category
              </label>
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background mt-1"
                >
                  <option value="budget">Budget (Time & Materials)</option>
                  <option value="fixed">Fixed Price</option>
                </select>
              ) : (
                <p
                  className="text-base mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2"
                  onClick={() => handleFieldClick('category')}
                >
                  <span
                    className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      currentValues.category === 'budget'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                    )}
                  >
                    {currentValues.category === 'budget'
                      ? 'Budget'
                      : 'Fixed Price'}
                  </span>
                </p>
              )}
            </div>

            {currentValues.category === 'budget' && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Budget (hours)
                </label>
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
                    className="mt-1"
                  />
                ) : (
                  <p
                    className="text-base mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2"
                    onClick={() => handleFieldClick('budgetHours')}
                  >
                    <Clock className="inline h-4 w-4 text-gray-500 mr-1" />
                    {currentValues.budgetHours ?? 0}h
                  </p>
                )}
              </div>
            )}

            {currentValues.category === 'budget' &&
              currentValues.budgetHours !== null && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Budget Summary
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        Total Budget:
                      </span>
                      <span className="text-sm font-medium">
                        {currentValues.budgetHours}h
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Used:</span>
                      <span className="text-sm font-medium">
                        {totalHours.toFixed(2)}h
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Remaining:</span>
                      <span
                        className={cn(
                          'text-sm font-semibold',
                          remainingHours < 0 ? 'text-red-600' : 'text-green-600'
                        )}
                      >
                        {remainingHours.toFixed(2)}h
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-sm text-gray-600">
                        Time Entries:
                      </span>
                      <span className="text-sm font-medium">
                        {projectTimeEntries.length} entries
                      </span>
                    </div>
                  </div>
                </div>
              )}

            <div>
              <label className="text-sm font-medium text-gray-500">
                Created
              </label>
              <p className="text-base mt-1">
                {formatDateTime(project.createdAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-between pt-6 border-t">
          <Button
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete Project
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate({ to: '/dashboard/projects' })}
          >
            Close
          </Button>
        </div>

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md">
              <h3 className="text-lg font-semibold mb-2">Delete Project</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to delete "{project.name}"? This action
                cannot be undone and will also delete all associated time
                entries ({projectTimeEntries.length} entries).
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                >
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
