import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/dashboard/')({
  component: AdminIndexPage,
})

function AdminIndexPage() {
  const [activeView, setActiveView] = useState<'organisations' | 'projects'>('organisations')
  const data = Route.useRouteContext()

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveView('organisations')}
          className={`px-4 py-2 rounded-md ${activeView === 'organisations' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
        >
          Organisations & Accounts
        </button>
        <button
          onClick={() => setActiveView('projects')}
          className={`px-4 py-2 rounded-md ${activeView === 'projects' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
        >
          Projects
        </button>
      </div>

      <p className="text-muted-foreground">
        This is the admin home page. Select a section from the sidebar to get started.
      </p>
      <p className="text-sm text-muted-foreground">
        Click "Time Entries" in the sidebar to view and manage time entries.
      </p>
    </div>
  )
}
