import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/')({
  component: AgentIndexPage,
})

function AgentIndexPage() {
  const data = Route.useRouteContext()

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <h2 className="text-2xl font-semibold">Welcome to Agent Dashboard</h2>
      <p className="text-muted-foreground">
        Select a section from the sidebar to get started:
      </p>
      <ul className="list-disc list-inside space-y-2 text-muted-foreground">
        <li>
          <strong>Time Entries</strong> - View and manage all time entries
        </li>
        <li>
          <strong>Organisations & Accounts</strong> - Manage organisations and
          their accounts
        </li>
        <li>
          <strong>Projects</strong> - Create and manage projects
        </li>
      </ul>
    </div>
  )
}
