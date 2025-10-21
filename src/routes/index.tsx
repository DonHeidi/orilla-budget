import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Orilla Budget</h1>
          <p className="text-lg text-muted-foreground">Time tracking and budget management</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Link
            to="/dashboard"
            className="block p-8 bg-card text-card-foreground rounded-lg shadow-md hover:shadow-lg transition-shadow border-2 border-border hover:border-primary"
          >
            <h2 className="text-2xl font-semibold mb-2">Agent Dashboard</h2>
            <p className="text-muted-foreground">
              Track time, manage clients, projects, and view analytics
            </p>
          </Link>

          <Link
            to="/portal"
            className="block p-8 bg-card text-card-foreground rounded-lg shadow-md hover:shadow-lg transition-shadow border-2 border-border hover:border-primary"
          >
            <h2 className="text-2xl font-semibold mb-2">Client Portal</h2>
            <p className="text-muted-foreground">View your budget usage and time entries</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
