import { createFileRoute } from '@tanstack/react-router'
import { UserCog } from 'lucide-react'

export const Route = createFileRoute('/admin/')({
  component: AdminIndexPage,
})

function AdminIndexPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <UserCog className="h-16 w-16 text-gray-400" />
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-md">
            Welcome to the admin dashboard. Use the sidebar to manage users and system settings.
          </p>
        </div>
      </div>
    </div>
  )
}
