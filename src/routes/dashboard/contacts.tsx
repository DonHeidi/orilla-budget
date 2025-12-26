import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { TabNavigation } from '@/components/TabNavigation'

const contactTabs = [
  { label: 'Teams', href: '/dashboard/contacts/teams' },
  { label: 'Contacts', href: '/dashboard/contacts/list' },
]

export const Route = createFileRoute('/dashboard/contacts')({
  component: ContactsLayout,
  beforeLoad: ({ location }) => {
    // Redirect /dashboard/contacts to /dashboard/contacts/teams
    if (location.pathname === '/dashboard/contacts') {
      throw redirect({ to: '/dashboard/contacts/teams' })
    }
  },
})

function ContactsLayout() {
  return (
    <div className="flex flex-1 flex-col">
      <TabNavigation tabs={contactTabs} className="px-6 pt-4" />
      <div className="container mx-auto p-6">
        <Outlet />
      </div>
    </div>
  )
}
