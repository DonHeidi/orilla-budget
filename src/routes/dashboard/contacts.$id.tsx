import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { Mail, Building2, User, UserCheck, Send, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { contactRepository } from '@/repositories/contact.repository'
import { invitationRepository } from '@/repositories/invitation.repository'
import { projectRepository } from '@/repositories/project.repository'
import { getCurrentUser } from '@/repositories/auth.repository'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
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
        <SheetContent className="w-full sm:max-w-[540px] p-0">
          <SheetHeader className="px-6 py-5 border-b border-border/40">
            <SheetTitle>Error</SheetTitle>
            <SheetDescription>Contact not found</SheetDescription>
          </SheetHeader>
          <div className="px-6 py-6">
            <p className="text-muted-foreground">
              The requested contact could not be found.
            </p>
          </div>
          <div className="flex gap-3 justify-end px-6 py-4 border-t border-border/40 bg-muted/30">
            <Button
              variant="outline"
              size="sm"
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
    <>
      <Sheet
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            navigate({ to: '/dashboard/contacts' })
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-[540px] overflow-y-auto p-0">
          {/* Header */}
          <SheetHeader className="px-6 py-5 border-b border-border/40">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted">
                {contact.userId ? (
                  <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <User className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="font-display text-lg tracking-wide">
                  {displayName}
                </SheetTitle>
                <SheetDescription className="mt-1">
                  {contact.email}
                </SheetDescription>
              </div>
              <Badge variant={contact.userId ? 'default' : 'secondary'}>
                {contact.userId ? 'Has Account' : 'No Account'}
              </Badge>
            </div>
          </SheetHeader>

          <div className="px-6 py-6 space-y-6">
            {/* Details Section */}
            <div className="space-y-4">
              <h3 className="font-display text-sm tracking-wider uppercase text-muted-foreground">
                Details
              </h3>

              {/* Email */}
              <div className="flex items-start gap-3 px-3 py-3 -mx-3">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Email
                  </p>
                  <p className="text-sm mt-1">{contact.email}</p>
                </div>
              </div>

              {/* Organisation */}
              {contact.organisation && (
                <div className="flex items-start gap-3 px-3 py-3 -mx-3">
                  <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Organisation
                    </p>
                    <p className="text-sm mt-1">{contact.organisation.name}</p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Invitations Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-display text-sm tracking-wider uppercase text-muted-foreground">
                  Invitations
                </h3>
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
                <Card className="bg-muted/30 border-border/40">
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Project
                      </label>
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
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Role
                      </label>
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
                  </CardContent>
                </Card>
              )}

              {data.invitations.length > 0 ? (
                <div className="space-y-2">
                  {data.invitations.map((invitation) => (
                    <Card
                      key={invitation.id}
                      className="bg-muted/30 border-border/40"
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">
                              {invitation.project?.name || 'General Invitation'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Role: {invitation.role || 'Not specified'} •{' '}
                              <span
                                className={cn(
                                  invitation.status === 'pending' &&
                                    'text-amber-600 dark:text-amber-400',
                                  invitation.status === 'accepted' &&
                                    'text-emerald-600 dark:text-emerald-400',
                                  invitation.status === 'rejected' &&
                                    'text-red-600 dark:text-red-400'
                                )}
                              >
                                {invitation.status}
                              </span>
                            </p>
                          </div>
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                            {invitation.code}
                          </code>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No invitations sent to this contact yet.
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-between px-6 py-4 border-t border-border/40 bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/dashboard/contacts' })}
            >
              Close
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{displayName}"? This will also
              delete all pending invitations for this contact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
