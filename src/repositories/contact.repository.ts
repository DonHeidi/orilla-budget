import { db, betterAuth, contacts, pii } from '@/db'
import { eq, and } from 'drizzle-orm'
import type { Contact, CreateContact, Pii } from '@/schemas'
import { generateId, now } from '@/lib/auth'

export interface ContactWithDetails extends Contact {
  user?: {
    id: string
    handle: string
    email: string
  } | null
  pii?: Pii | null
  organisation?: {
    id: string
    name: string
  } | null
}

export const contactRepository = {
  /**
   * Find all contacts owned by a user
   */
  async findByOwner(ownerId: string): Promise<ContactWithDetails[]> {
    const result = await db
      .select({
        contact: contacts,
        user: {
          id: betterAuth.user.id,
          handle: betterAuth.user.handle,
          email: betterAuth.user.email,
        },
        pii: pii,
        organisation: {
          id: betterAuth.organization.id,
          name: betterAuth.organization.name,
        },
      })
      .from(contacts)
      .leftJoin(betterAuth.user, eq(contacts.userId, betterAuth.user.id))
      .leftJoin(pii, eq(contacts.piiId, pii.id))
      .leftJoin(betterAuth.organization, eq(contacts.organisationId, betterAuth.organization.id))
      .where(eq(contacts.ownerId, ownerId))

    return result.map((row) => ({
      ...row.contact,
      user: row.user?.id ? row.user : null,
      pii: row.pii,
      organisation: row.organisation?.id ? row.organisation : null,
    }))
  },

  /**
   * Find a contact by ID
   */
  async findById(id: string): Promise<ContactWithDetails | undefined> {
    const result = await db
      .select({
        contact: contacts,
        user: {
          id: betterAuth.user.id,
          handle: betterAuth.user.handle,
          email: betterAuth.user.email,
        },
        pii: pii,
        organisation: {
          id: betterAuth.organization.id,
          name: betterAuth.organization.name,
        },
      })
      .from(contacts)
      .leftJoin(betterAuth.user, eq(contacts.userId, betterAuth.user.id))
      .leftJoin(pii, eq(contacts.piiId, pii.id))
      .leftJoin(betterAuth.organization, eq(contacts.organisationId, betterAuth.organization.id))
      .where(eq(contacts.id, id))
      .limit(1)

    if (!result[0]) return undefined

    return {
      ...result[0].contact,
      user: result[0].user?.id ? result[0].user : null,
      pii: result[0].pii,
      organisation: result[0].organisation?.id ? result[0].organisation : null,
    }
  },

  /**
   * Find a contact by owner and email (to prevent duplicates)
   */
  async findByOwnerAndEmail(
    ownerId: string,
    email: string
  ): Promise<Contact | undefined> {
    const result = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.ownerId, ownerId), eq(contacts.email, email)))
      .limit(1)
    return result[0]
  },

  /**
   * Create a new contact
   */
  async create(data: CreateContact): Promise<Contact> {
    const contact: Contact = {
      id: generateId(),
      ownerId: data.ownerId,
      userId: null,
      piiId: null,
      email: data.email,
      organisationId: data.organisationId ?? null,
      createdAt: now(),
    }

    await db.insert(contacts).values(contact)
    return contact
  },

  /**
   * Create a contact with PII (name, phone, etc.)
   */
  async createWithPii(
    data: CreateContact & { name?: string; phone?: string; notes?: string }
  ): Promise<Contact> {
    const timestamp = now()

    // Create PII record if any personal info provided
    let piiId: string | null = null
    if (data.name || data.phone || data.notes) {
      const piiRecord = {
        id: generateId(),
        name: data.name ?? null,
        phone: data.phone ?? null,
        address: null,
        notes: data.notes ?? null,
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      await db.insert(pii).values(piiRecord)
      piiId = piiRecord.id
    }

    const contact: Contact = {
      id: generateId(),
      ownerId: data.ownerId,
      userId: null,
      piiId,
      email: data.email,
      organisationId: data.organisationId ?? null,
      createdAt: timestamp,
    }

    await db.insert(contacts).values(contact)
    return contact
  },

  /**
   * Link a contact to an existing user (when they create an account)
   */
  async linkToUser(contactId: string, userId: string): Promise<void> {
    await db
      .update(contacts)
      .set({ userId })
      .where(eq(contacts.id, contactId))
  },

  /**
   * Update contact's organisation
   */
  async updateOrganisation(
    contactId: string,
    organisationId: string | null
  ): Promise<void> {
    await db
      .update(contacts)
      .set({ organisationId })
      .where(eq(contacts.id, contactId))
  },

  /**
   * Delete a contact
   */
  async delete(id: string): Promise<void> {
    // Note: Related PII should be cleaned up separately if needed
    await db.delete(contacts).where(eq(contacts.id, id))
  },

  /**
   * Find all contacts that have a linked user account
   */
  async findLinkedContacts(ownerId: string): Promise<ContactWithDetails[]> {
    const result = await db
      .select({
        contact: contacts,
        user: {
          id: betterAuth.user.id,
          handle: betterAuth.user.handle,
          email: betterAuth.user.email,
        },
        pii: pii,
        organisation: {
          id: betterAuth.organization.id,
          name: betterAuth.organization.name,
        },
      })
      .from(contacts)
      .innerJoin(betterAuth.user, eq(contacts.userId, betterAuth.user.id))
      .leftJoin(pii, eq(contacts.piiId, pii.id))
      .leftJoin(betterAuth.organization, eq(contacts.organisationId, betterAuth.organization.id))
      .where(eq(contacts.ownerId, ownerId))

    return result.map((row) => ({
      ...row.contact,
      user: row.user,
      pii: row.pii,
      organisation: row.organisation?.id ? row.organisation : null,
    }))
  },
}
