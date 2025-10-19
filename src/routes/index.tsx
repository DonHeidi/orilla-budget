import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Orilla Budget</h1>
          <p className="text-lg text-gray-600">Time tracking and budget management</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Link
            to="/admin"
            className="block p-8 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-500"
          >
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Admin Dashboard</h2>
            <p className="text-gray-600">
              Track time, manage clients, projects, and view analytics
            </p>
          </Link>

          <Link
            to="/portal"
            className="block p-8 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-500"
          >
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Client Portal</h2>
            <p className="text-gray-600">View your budget usage and time entries</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
