import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { Mail, Building2, User, UserCheck, Send } from 'lucide-react'
import { contactRepository } from '@/repositories/contact.repository'
import { invitationRepository } from '@/repositories/invitation.repository'
import { projectRepository } from '@/repositories/project.repository'
import { getCurrentUser } from '@/repositories/auth.repository'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { ContactWithDetails } from '@/repositories/contact.repository'
import type { InvitationWithDetails } from '@/repositories/invitation.repository'
import type { ProjectRole } from '@/schemas'

interface ContactDetailData {
  contact: ContactWithDetails | null
  invitations: InvitationWithDetails[]
  projects: { id: string; name: string }[]
}

const getContactDetailFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<ContactDetailData> => {
    const user = await getCurrentUser()
    if (!user) {
      return { contact: null, invitations: [], projects: [] }
    }

    const contact = await contactRepository.findById(data.id)
    if (!contact || contact.ownerId !== user.id) {
      return { contact: null, invitations: [], projects: [] }
    }

    const [invitations, projects] = await Promise.all([
      invitationRepository.findByInviter(user.id),
      projectRepository.findAll(),
    ])

    // Filter invitations to this contact
    const contactInvitations = invitations.filter(
      (inv) => inv.contactId === contact.id
    )

    return {
      contact,
      invitations: contactInvitations,
      projects: projects.map((p) => ({ id: p.id, name: p.name })),
    }
  })

const deleteContactFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    const contact = await contactRepository.findById(data.id)
    if (!contact || contact.ownerId !== user.id) {
      throw new Error('Contact not found or access denied')
    }

    await contactRepository.delete(data.id)
    return { success: true }
  })

const createInvitationFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { contactId: string; projectId?: string; role?: ProjectRole }) => data
  )
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    // Verify contact ownership
    const contact = await contactRepository.findById(data.contactId)
    if (!contact || contact.ownerId !== user.id) {
      throw new Error('Contact not found or access denied')
    }

    // Check for existing pending invitation
    const existing = await invitationRepository.findExistingPending(
      data.contactId,
      data.projectId
    )
    if (existing) {
      throw new Error('A pending invitation already exists for this contact')
    }

    return await invitationRepository.create(
      {
        contactId: data.contactId,
        projectId: data.projectId,
        role: data.role,
      },
      user.id
    )
  })

export const Route = createFileRoute('/dashboard/contacts/$id')({
  component: ContactDetailPage,
  loader: ({ params }) => getContactDetailFn({ data: { id: params.id } }),
})

function ContactDetailPage() {
  const { id } = Route.useParams()
  const data = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteProject, setInviteProject] = useState<string>('')
  const [inviteRole, setInviteRole] = useState<ProjectRole>('viewer')
  const [isInviting, setIsInviting] = useState(false)

  const contact = data.contact

  if (!contact) {
    return (
      <Sheet
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            navigate({ to: '/dashboard/contacts' })
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle>Error</SheetTitle>
            <SheetDescription>Contact not found</SheetDescription>
          </SheetHeader>
          <div className="py-6">
            <p className="text-gray-500">
              The requested contact could not be found.
            </p>
          </div>
          <div className="flex gap-3 justify-end pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => navigate({ to: '/dashboard/contacts' })}
            >
              Back to Contacts
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  const handleDelete = async () => {
    try {
      await deleteContactFn({ data: { id: contact.id } })
      await router.invalidate()
      setShowDeleteConfirm(false)
      navigate({ to: '/dashboard/contacts' })
    } catch (error) {
      console.error('Failed to delete contact:', error)
    }
  }

  const handleInvite = async () => {
    setIsInviting(true)
    try {
      await createInvitationFn({
        data: {
          contactId: contact.id,
          projectId: inviteProject || undefined,
          role: inviteRole,
        },
      })
      await router.invalidate()
      setShowInviteForm(false)
      setInviteProject('')
      setInviteRole('viewer')
    } catch (error) {
      console.error('Failed to create invitation:', error)
    } finally {
      setIsInviting(false)
    }
  }

  const displayName =
    contact.user?.handle
      ? `@${contact.user.handle}`
      : contact.pii?.name || contact.email

  return (
    <Sheet
      open={true}
      onOpenChange={(open) => {
        if (!open) {
          navigate({ to: '/dashboard/contacts' })
        }
      }}
    >
      <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="space-y-3 pb-6 border-b">
          <SheetTitle>Contact Details</SheetTitle>
          <SheetDescription>
            View and manage contact information
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Contact Info */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-base mt-1 flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                {contact.email}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <p className="text-base mt-1 flex items-center gap-2">
                {contact.userId ? (
                  <UserCheck className="h-4 w-4 text-green-500" />
                ) : (
                  <User className="h-4 w-4 text-gray-400" />
                )}
                {displayName}
              </p>
            </div>

            {contact.organisation && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Organisation
                </label>
                <p className="text-base mt-1 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  {contact.organisation.name}
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <p className="text-base mt-1">
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    contact.userId
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  }`}
                >
                  {contact.userId ? 'Has Account' : 'No Account'}
                </span>
              </p>
            </div>
          </div>

          {/* Invitations Section */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Invitations</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowInviteForm(!showInviteForm)}
              >
                <Send className="mr-2 h-4 w-4" />
                Send Invitation
              </Button>
            </div>

            {showInviteForm && (
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4 space-y-4">
                <div>
                  <label className="text-sm font-medium">Project</label>
                  <Select value={inviteProject} onValueChange={setInviteProject}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select project (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Role</label>
                  <Select
                    value={inviteRole}
                    onValueChange={(v) => setInviteRole(v as ProjectRole)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                      <SelectItem value="reviewer">Reviewer</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowInviteForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleInvite} disabled={isInviting}>
                    {isInviting ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </div>
            )}

            {data.invitations.length > 0 ? (
              <div className="space-y-2">
                {data.invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {invitation.project?.name || 'General Invitation'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Role: {invitation.role || 'Not specified'} •{' '}
                        <span
                          className={`${
                            invitation.status === 'pending'
                              ? 'text-yellow-600'
                              : invitation.status === 'accepted'
                                ? 'text-green-600'
                                : 'text-red-600'
                          }`}
                        >
                          {invitation.status}
                        </span>
                      </p>
                    </div>
                    <code className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                      {invitation.code}
                    </code>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                No invitations sent to this contact yet.
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 justify-between pt-6 border-t">
          <Button
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete Contact
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate({ to: '/dashboard/contacts' })}
          >
            Close
          </Button>
        </div>

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md">
              <h3 className="text-lg font-semibold mb-2">Delete Contact</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to delete "{displayName}"? This will also
                delete all pending invitations for this contact.
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
