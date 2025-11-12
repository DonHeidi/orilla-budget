import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { accountRepository } from '@/repositories/account.repository'
import { organisationRepository } from '@/repositories/organisation.repository'
import { projectRepository } from '@/repositories/project.repository'
import { timeEntryRepository } from '@/repositories/timeEntry.repository'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { DataTable } from '@/components/DataTable'
import type { ColumnDef } from '@tanstack/react-table'

const authenticateClientFn = createServerFn(
  'POST',
  async (accessCode: string) => {
    const account = await accountRepository.findByAccessCode(
      accessCode.toUpperCase()
    )
    if (!account) {
      throw new Error('Invalid access code')
    }

    const organisation = await organisationRepository.findById(
      account.organisationId
    )
    if (!organisation) {
      throw new Error('Organisation not found')
    }

    const projects = await projectRepository.findByOrganisationId(
      account.organisationId
    )
    const timeEntries = await timeEntryRepository.findByOrganisationId(
      account.organisationId
    )

    return { account, organisation, projects, timeEntries }
  }
)

export const Route = createFileRoute('/portal')({
  component: ClientPortal,
})

function ClientPortal() {
  const [accessCode, setAccessCode] = useState('')
  const [account, setAccount] = useState<any>(null)
  const [clientData, setClientData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const data = await authenticateClientFn(accessCode)
      setAccount(data.account)
      setClientData({
        organisation: data.organisation,
        projects: data.projects,
        timeEntries: data.timeEntries,
      })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred. Please try again.'
      )
      console.error(err)
    }

    setLoading(false)
  }

  const handleLogout = () => {
    setAccount(null)
    setClientData(null)
    setAccessCode('')
  }

  if (!account || !clientData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Client Portal
            </h1>

            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Code
                </label>
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="Enter your access code"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                  maxLength={8}
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <p className="mt-4 text-sm text-gray-600 text-center">
              Enter the access code provided by your administrator
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ClientDashboard
      account={account}
      clientData={clientData}
      onLogout={handleLogout}
    />
  )
}

function ClientDashboard({
  account,
  clientData,
  onLogout,
}: {
  account: any
  clientData: any
  onLogout: () => void
}) {
  const { organisation, projects, timeEntries } = clientData

  // Calculate total budget from Time & Materials (budget) projects only, not fixed price projects
  const totalBudgetHours = projects
    .filter((project: any) => project.category === 'budget')
    .reduce((sum: number, project: any) => sum + (project.budgetHours || 0), 0)

  const totalHours = timeEntries.reduce(
    (sum: number, entry: any) => sum + entry.hours,
    0
  )
  const remainingHours = totalBudgetHours - totalHours
  const percentageUsed =
    totalBudgetHours > 0 ? (totalHours / totalBudgetHours) * 100 : 0

  const projectsWithHours = projects.map((project: any) => {
    const projectEntries = timeEntries.filter(
      (entry: any) => entry.projectId === project.id
    )
    const hours = projectEntries.reduce(
      (sum: number, entry: any) => sum + entry.hours,
      0
    )
    return {
      ...project,
      usedHours: hours,
      remainingHours: project.budgetHours - hours,
      entries: projectEntries,
    }
  })

  const [selectedEntry, setSelectedEntry] = useState<any | null>(null)
  const [entrySheetOpen, setEntrySheetOpen] = useState(false)

  const handleEntryOpen = (entry: any) => {
    // Debug: verify click flow triggers
    try {
      console.log('[Portal] Open entry sheet for', entry?.id)
    } catch {}
    setSelectedEntry(entry)
    setEntrySheetOpen(true)
  }

  const handleSheetChange = (open: boolean) => {
    try {
      console.log('[Portal] sheet onOpenChange', open)
    } catch {}
    setEntrySheetOpen(open)
    if (!open) {
      setSelectedEntry(null)
    }
  }

  type ClientTimeEntryRow = {
    id: string
    date: string
    projectName: string
    title: string
    description: string
    hours: number
    entry: any
  }

  const timeEntriesWithDetails: ClientTimeEntryRow[] = timeEntries.map(
    (entry: any) => {
      const project = projects.find((p: any) => p.id === entry.projectId)
      return {
        id: entry.id,
        date: entry.date,
        projectName: project?.name || '',
        title: entry.title,
        description: entry.description,
        hours: entry.hours,
        entry,
      }
    }
  )

  const columns: ColumnDef<ClientTimeEntryRow>[] = [
    { accessorKey: 'date', header: 'Date' },
    { accessorKey: 'projectName', header: 'Project' },
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'description', header: 'Description' },
    {
      accessorKey: 'hours',
      header: 'Hours',
      cell: ({ getValue }) => `${getValue<number>()}h`,
    },
  ]

  const selectedProject = selectedEntry
    ? projects.find((project: any) => project.id === selectedEntry.projectId)
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {organisation.name}
            </h1>
            <p className="text-sm text-gray-600">Welcome, {account.name}</p>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Budget Overview */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Budget Overview
          </h2>

          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Budget</p>
              <p className="text-3xl font-bold text-gray-900">
                {totalBudgetHours}h
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Hours Used</p>
              <p className="text-3xl font-bold text-blue-600">
                {totalHours.toFixed(2)}h
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Hours Remaining</p>
              <p
                className={`text-3xl font-bold ${
                  remainingHours > 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {remainingHours.toFixed(2)}h
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Budget Usage</span>
              <span>{percentageUsed.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  percentageUsed > 90
                    ? 'bg-red-600'
                    : percentageUsed > 75
                      ? 'bg-yellow-500'
                      : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(percentageUsed, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Projects */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Projects</h2>

          {projectsWithHours.length === 0 ? (
            <p className="text-gray-500">No projects yet</p>
          ) : (
            <div className="space-y-4">
              {projectsWithHours.map((project: any) => (
                <div
                  key={project.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {project.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {project.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {project.usedHours.toFixed(2)}h / {project.budgetHours}h
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {project.remainingHours.toFixed(2)}h remaining
                      </p>
                    </div>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all"
                      style={{
                        width: `${Math.min((project.usedHours / project.budgetHours) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Time Entries */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Time Entries
          </h2>
          {timeEntriesWithDetails.length === 0 ? (
            <p className="text-gray-500">No time entries yet</p>
          ) : (
            <DataTable
              columns={columns}
              data={timeEntriesWithDetails}
              onRowClick={(row) =>
                handleEntryOpen((row.original as ClientTimeEntryRow).entry)
              }
            />
          )}

          {entrySheetOpen && selectedEntry ? (
            <div className="mt-4 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              <strong>Details preview:</strong> {selectedEntry.title} ·{' '}
              {selectedEntry.hours}h · {selectedEntry.date}
            </div>
          ) : null}
        </div>
      </div>

      <Sheet open={entrySheetOpen} onOpenChange={handleSheetChange}>
        <SheetContent className="z-[9999] w-full sm:max-w-[480px]">
          <SheetHeader className="space-y-2 pb-4 border-b">
            <SheetTitle>
              {selectedEntry?.title ?? 'Time Entry Details'}
            </SheetTitle>
            <SheetDescription>
              View the full context of this logged time entry.
            </SheetDescription>
          </SheetHeader>

          {selectedEntry ? (
            <div className="py-6 space-y-6 text-sm text-gray-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="font-medium text-gray-900">Date</p>
                  <p>{selectedEntry.date}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Hours</p>
                  <p>{selectedEntry.hours}h</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Project</p>
                  <p>{selectedProject?.name ?? 'Not assigned'}</p>
                </div>
              </div>

              {selectedEntry.description && (
                <div>
                  <p className="font-medium text-gray-900 mb-1">Description</p>
                  <p className="text-gray-700 whitespace-pre-line">
                    {selectedEntry.description}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="py-6 text-sm text-gray-600">
              Select an entry to view its details.
            </p>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
