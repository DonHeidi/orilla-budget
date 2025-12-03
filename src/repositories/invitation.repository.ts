import { db, betterAuth, invitations, contacts, pii } from '@/db'
import { eq, and, lt } from 'drizzle-orm'
import type {
  Invitation,
  CreateInvitation,
  InvitationStatus,
  ProjectRole,
} from '@/schemas'
import { generateId, now, generateToken } from '@/lib/auth'

export interface InvitationWithDetails extends Invitation {
  contact: {
    id: string
    email: string
    pii?: {
      name: string | null
    } | null
  }
  invitedBy: {
    id: string
    handle: string
    email: string
  }
  project?: {
    id: string
    name: string
  } | null
}

// Invitation codes are 12 characters for uniqueness while being URL-friendly
const INVITATION_CODE_LENGTH = 12
// Invitations expire after 7 days
const INVITATION_EXPIRY_DAYS = 7

export const invitationRepository = {
  /**
   * Find an invitation by its unique code
   */
  async findByCode(code: string): Promise<InvitationWithDetails | undefined> {
    const result = await db
      .select({
        invitation: invitations,
        contact: {
          id: contacts.id,
          email: contacts.email,
        },
        contactPii: {
          name: pii.name,
        },
        invitedBy: {
          id: betterAuth.user.id,
          handle: betterAuth.user.handle,
          email: betterAuth.user.email,
        },
        project: {
          id: betterAuth.team.id,
          name: betterAuth.team.name,
        },
      })
      .from(invitations)
      .innerJoin(contacts, eq(invitations.contactId, contacts.id))
      .leftJoin(pii, eq(contacts.piiId, pii.id))
      .innerJoin(betterAuth.user, eq(invitations.invitedByUserId, betterAuth.user.id))
      .leftJoin(betterAuth.team, eq(invitations.projectId, betterAuth.team.id))
      .where(eq(invitations.code, code))
      .limit(1)

    if (!result[0]) return undefined

    return {
      ...result[0].invitation,
      contact: {
        ...result[0].contact,
        pii: result[0].contactPii?.name ? result[0].contactPii : null,
      },
      invitedBy: result[0].invitedBy,
      project: result[0].project?.id ? result[0].project : null,
    }
  },

  /**
   * Find a valid (pending, not expired) invitation by code
   */
  async findValidByCode(
    code: string
  ): Promise<InvitationWithDetails | undefined> {
    const invitation = await this.findByCode(code)
    if (!invitation) return undefined

    // Check if expired
    if (new Date(invitation.expiresAt) < new Date()) {
      // Auto-expire the invitation
      await this.updateStatus(invitation.id, 'expired')
      return undefined
    }

    // Check if pending
    if (invitation.status !== 'pending') {
      return undefined
    }

    return invitation
  },

  /**
   * Find all invitations sent by a user
   */
  async findByInviter(userId: string): Promise<InvitationWithDetails[]> {
    const result = await db
      .select({
        invitation: invitations,
        contact: {
          id: contacts.id,
          email: contacts.email,
        },
        contactPii: {
          name: pii.name,
        },
        invitedBy: {
          id: betterAuth.user.id,
          handle: betterAuth.user.handle,
          email: betterAuth.user.email,
        },
        project: {
          id: betterAuth.team.id,
          name: betterAuth.team.name,
        },
      })
      .from(invitations)
      .innerJoin(contacts, eq(invitations.contactId, contacts.id))
      .leftJoin(pii, eq(contacts.piiId, pii.id))
      .innerJoin(betterAuth.user, eq(invitations.invitedByUserId, betterAuth.user.id))
      .leftJoin(betterAuth.team, eq(invitations.projectId, betterAuth.team.id))
      .where(eq(invitations.invitedByUserId, userId))

    return result.map((row) => ({
      ...row.invitation,
      contact: {
        ...row.contact,
        pii: row.contactPii?.name ? row.contactPii : null,
      },
      invitedBy: row.invitedBy,
      project: row.project?.id ? row.project : null,
    }))
  },

  /**
   * Find pending invitations for a contact
   */
  async findPendingForContact(contactId: string): Promise<Invitation[]> {
    return await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.contactId, contactId),
          eq(invitations.status, 'pending')
        )
      )
  },

  /**
   * Create a new invitation
   */
  async create(
    data: CreateInvitation,
    invitedByUserId: string
  ): Promise<Invitation> {
    const timestamp = now()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS)

    const invitation: Invitation = {
      id: generateId(),
      contactId: data.contactId,
      invitedByUserId,
      projectId: data.projectId ?? null,
      role: (data.role as ProjectRole) ?? null,
      code: generateToken(INVITATION_CODE_LENGTH),
      expiresAt: expiresAt.toISOString(),
      status: 'pending',
      createdAt: timestamp,
    }

    await db.insert(invitations).values(invitation)
    return invitation
  },

  /**
   * Update invitation status
   */
  async updateStatus(id: string, status: InvitationStatus): Promise<void> {
    await db
      .update(invitations)
      .set({ status })
      .where(eq(invitations.id, id))
  },

  /**
   * Accept an invitation (mark as accepted)
   */
  async accept(id: string): Promise<void> {
    await this.updateStatus(id, 'accepted')
  },

  /**
   * Expire all pending invitations older than their expiry date
   */
  async expireOldInvitations(): Promise<number> {
    const result = await db
      .update(invitations)
      .set({ status: 'expired' })
      .where(
        and(
          eq(invitations.status, 'pending'),
          lt(invitations.expiresAt, now())
        )
      )

    return result.changes
  },

  /**
   * Delete an invitation
   */
  async delete(id: string): Promise<void> {
    await db.delete(invitations).where(eq(invitations.id, id))
  },

  /**
   * Check if a pending invitation already exists for this contact and project
   */
  async findExistingPending(
    contactId: string,
    projectId?: string
  ): Promise<Invitation | undefined> {
    const conditions = [
      eq(invitations.contactId, contactId),
      eq(invitations.status, 'pending'),
    ]

    if (projectId) {
      conditions.push(eq(invitations.projectId, projectId))
    }

    const result = await db
      .select()
      .from(invitations)
      .where(and(...conditions))
      .limit(1)

    return result[0]
  },
}
