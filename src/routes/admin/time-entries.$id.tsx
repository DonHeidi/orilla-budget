import { createFileRoute, useNavigate, useRouter, getRouteApi } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import type { TimeEntry } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

const parentRouteApi = getRouteApi('/admin/time-entries')

// Helper functions
function hoursToTime(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}:${m.toString().padStart(2, '0')}`
}

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
const updateTimeEntryFn = createServerFn({ method: 'POST' }).handler(
  async ({ data }: { data: TimeEntry }) => {
    const { timeEntryRepository } = await import('@/server/repositories/timeEntry.repository')
    const { id, createdAt, ...updateData } = data

    // Filter out undefined values
    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    )

    if (Object.keys(cleanUpdateData).length === 0) {
      throw new Error('No fields to update')
    }

    return await timeEntryRepository.update(id, cleanUpdateData)
  }
)

// Route definition - no loader needed, uses parent data
export const Route = createFileRoute('/admin/time-entries/$id')({
  component: TimeEntryDetailPage,
})

function TimeEntryDetailPage() {
  const { id } = Route.useParams()
  const parentData = parentRouteApi.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editedValues, setEditedValues] = useState<Partial<TimeEntry>>({})

  // Get data from parent route
  const timeEntries = parentData?.timeEntries || []
  const organisations = parentData?.organisations || []
  const projects = parentData?.projects || []

  const timeEntry = timeEntries.find((e: any) => e.id === id)

  if (!timeEntry) {
    return (
      <Sheet open={true} onOpenChange={(open) => {
        if (!open) {
          navigate({ to: '/admin/time-entries' })
        }
      }}>
        <SheetContent className="w-full sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle>Error</SheetTitle>
            <SheetDescription>Time entry not found</SheetDescription>
          </SheetHeader>
          <div className="py-6">
            <p className="text-gray-500">The requested time entry could not be found.</p>
          </div>
          <div className="flex gap-3 justify-end pt-6 border-t">
            <Button variant="outline" onClick={() => navigate({ to: '/admin/time-entries' })}>
              Back to List
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  const organisation = organisations.find((o: any) => o.id === timeEntry.organisationId)
  const project = projects.find((p: any) => p.id === timeEntry.projectId)

  const currentValues = { ...timeEntry, ...editedValues }

  const handleFieldClick = (fieldName: string) => {
    setEditingField(fieldName)
  }

  const handleFieldBlur = async () => {
    if (Object.keys(editedValues).length > 0) {
      const updatePayload = {
        id: timeEntry.id,
        createdAt: timeEntry.createdAt,
        ...editedValues,
      }
      await updateTimeEntryFn({ data: updatePayload as TimeEntry })
      setEditedValues({})
      // Invalidate router cache to refetch data without full page reload
      router.invalidate()
    }
    setEditingField(null)
  }

  const handleFieldChange = (fieldName: string, value: any) => {
    setEditedValues(prev => ({ ...prev, [fieldName]: value }))
  }

  return (
    <Sheet open={true} onOpenChange={(open) => {
      if (!open) {
        navigate({ to: '/admin/time-entries' })
      }
    }}>
      <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="space-y-3 pb-6 border-b">
          <SheetTitle>Time Entry Details</SheetTitle>
          <SheetDescription>
            View and edit detailed information about this time entry
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Title</label>
              {editingField === 'title' ? (
                <Input
                  autoFocus
                  value={currentValues.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  onBlur={handleFieldBlur}
                  className="mt-1"
                />
              ) : (
                <p
                  className="text-base mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2"
                  onClick={() => handleFieldClick('title')}
                >
                  {currentValues.title}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Description</label>
              {editingField === 'description' ? (
                <textarea
                  autoFocus
                  value={currentValues.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Date</label>
                {editingField === 'date' ? (
                  <Input
                    autoFocus
                    type="date"
                    value={currentValues.date}
                    onChange={(e) => handleFieldChange('date', e.target.value)}
                    onBlur={handleFieldBlur}
                    className="mt-1"
                  />
                ) : (
                  <p
                    className="text-base mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2"
                    onClick={() => handleFieldClick('date')}
                  >
                    {currentValues.date}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Hours</label>
                {editingField === 'hours' ? (
                  <div className="flex gap-2 items-center mt-1">
                    <Input
                      autoFocus
                      type="number"
                      min="0"
                      max="99"
                      value={Math.floor(currentValues.hours)}
                      onChange={(e) => {
                        const hours = parseInt(e.target.value) || 0
                        const minutes = Math.round((currentValues.hours % 1) * 60)
                        handleFieldChange('hours', hours + minutes / 60)
                      }}
                      onBlur={handleFieldBlur}
                      className="w-20"
                    />
                    <span className="text-sm">h</span>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      step="15"
                      value={Math.round((currentValues.hours % 1) * 60)}
                      onChange={(e) => {
                        const hours = Math.floor(currentValues.hours)
                        const minutes = parseInt(e.target.value) || 0
                        handleFieldChange('hours', hours + minutes / 60)
                      }}
                      onBlur={handleFieldBlur}
                      className="w-20"
                    />
                    <span className="text-sm">min</span>
                  </div>
                ) : (
                  <p
                    className="text-base mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2"
                    onClick={() => handleFieldClick('hours')}
                  >
                    {hoursToTime(currentValues.hours)}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Organisation</label>
              {editingField === 'organisationId' ? (
                <select
                  autoFocus
                  value={currentValues.organisationId || ''}
                  onChange={(e) => {
                    handleFieldChange('organisationId', e.target.value || undefined)
                    handleFieldChange('projectId', undefined)
                  }}
                  onBlur={handleFieldBlur}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background mt-1"
                >
                  <option value="">None</option>
                  {organisations.map((org: any) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p
                  className="text-base mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2"
                  onClick={() => handleFieldClick('organisationId')}
                >
                  {organisation?.name || 'Click to select organisation...'}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Project</label>
              {editingField === 'projectId' ? (
                <select
                  autoFocus
                  value={currentValues.projectId || ''}
                  onChange={(e) => handleFieldChange('projectId', e.target.value || undefined)}
                  onBlur={handleFieldBlur}
                  disabled={!currentValues.organisationId}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background mt-1 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">None</option>
                  {projects
                    .filter((p: any) => p.organisationId === currentValues.organisationId)
                    .map((proj: any) => (
                      <option key={proj.id} value={proj.id}>
                        {proj.name}
                      </option>
                    ))}
                </select>
              ) : (
                <p
                  className="text-base mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2"
                  onClick={() => handleFieldClick('projectId')}
                >
                  {project?.name || 'Click to select project...'}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Approved</label>
                <div className="flex items-center mt-1">
                  {timeEntry.approvedDate ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      <span className="text-base">Yes</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-base">No</span>
                    </>
                  )}
                </div>
              </div>

              {timeEntry.approvedDate && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Approved Date</label>
                  <p className="text-base mt-1">{formatDateTime(timeEntry.approvedDate)}</p>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Created</label>
              <p className="text-base mt-1">{formatDateTime(timeEntry.createdAt)}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-6 border-t">
          <Button variant="outline" onClick={() => navigate({ to: '/admin/time-entries' })}>
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
