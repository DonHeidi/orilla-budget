import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { createTestDb, cleanDatabase, testFactories, seed } from '@/test/db-utils'
import * as schema from '@/db/schema'
import { eq, and } from 'drizzle-orm'

/**
 * Contact Repository Tests
 *
 * Tests the contact repository operations using direct database queries
 * to verify the expected behavior.
 */

describe('contactRepository', () => {
  let testDb: ReturnType<typeof createTestDb>

  beforeEach(() => {
    testDb = createTestDb()
  })

  afterEach(async () => {
    if (testDb) {
      await cleanDatabase(testDb.db)
      testDb.sqlite.close()
    }
  })

  const getDb = () => testDb.db

  describe('findByOwner', () => {
    it('should return all contacts owned by a user', async () => {
      const db = getDb()

      // Create owner and contacts
      const owner = await seed.user(db, { email: 'owner@example.com' })
      const contact1 = testFactories.contact(owner.id, { email: 'contact1@example.com' })
      const contact2 = testFactories.contact(owner.id, { email: 'contact2@example.com' })

      await db.insert(schema.contacts).values([contact1, contact2])

      // Query
      const results = await db
        .select()
        .from(schema.contacts)
        .where(eq(schema.contacts.ownerId, owner.id))

      expect(results).toHaveLength(2)
      expect(results.map((c) => c.email)).toContain('contact1@example.com')
      expect(results.map((c) => c.email)).toContain('contact2@example.com')
    })

    it('should return empty array when no contacts exist', async () => {
      const db = getDb()
      const owner = await seed.user(db, { email: 'owner@example.com' })

      const results = await db
        .select()
        .from(schema.contacts)
        .where(eq(schema.contacts.ownerId, owner.id))

      expect(results).toEqual([])
    })

    it('should not return contacts owned by other users', async () => {
      const db = getDb()

      const owner1 = await seed.user(db, { email: 'owner1@example.com', handle: 'owner1' })
      const owner2 = await seed.user(db, { email: 'owner2@example.com', handle: 'owner2' })

      const contact1 = testFactories.contact(owner1.id, { email: 'contact1@example.com' })
      const contact2 = testFactories.contact(owner2.id, { email: 'contact2@example.com' })

      await db.insert(schema.contacts).values([contact1, contact2])

      // Query for owner1's contacts
      const results = await db
        .select()
        .from(schema.contacts)
        .where(eq(schema.contacts.ownerId, owner1.id))

      expect(results).toHaveLength(1)
      expect(results[0].email).toBe('contact1@example.com')
    })
  })

  describe('findById', () => {
    it('should find a contact by id', async () => {
      const db = getDb()
      const owner = await seed.user(db, { email: 'owner@example.com' })
      const contact = testFactories.contact(owner.id, {
        id: 'contact-123',
        email: 'found@example.com',
      })

      await db.insert(schema.contacts).values(contact)

      const result = await db
        .select()
        .from(schema.contacts)
        .where(eq(schema.contacts.id, 'contact-123'))
        .limit(1)

      expect(result[0]).toBeDefined()
      expect(result[0].id).toBe('contact-123')
      expect(result[0].email).toBe('found@example.com')
    })

    it('should return undefined for non-existent contact', async () => {
      const db = getDb()

      const result = await db
        .select()
        .from(schema.contacts)
        .where(eq(schema.contacts.id, 'nonexistent'))
        .limit(1)

      expect(result[0]).toBeUndefined()
    })
  })

  describe('findByOwnerAndEmail', () => {
    it('should find contact by owner and email', async () => {
      const db = getDb()
      const owner = await seed.user(db, { email: 'owner@example.com' })
      const contact = testFactories.contact(owner.id, { email: 'unique@example.com' })

      await db.insert(schema.contacts).values(contact)

      const result = await db
        .select()
        .from(schema.contacts)
        .where(
          and(
            eq(schema.contacts.ownerId, owner.id),
            eq(schema.contacts.email, 'unique@example.com')
          )
        )
        .limit(1)

      expect(result[0]).toBeDefined()
      expect(result[0].email).toBe('unique@example.com')
    })

    it('should return undefined when email not found for owner', async () => {
      const db = getDb()
      const owner = await seed.user(db, { email: 'owner@example.com' })

      const result = await db
        .select()
        .from(schema.contacts)
        .where(
          and(
            eq(schema.contacts.ownerId, owner.id),
            eq(schema.contacts.email, 'notfound@example.com')
          )
        )
        .limit(1)

      expect(result[0]).toBeUndefined()
    })

    it('should not find contact with same email owned by different user', async () => {
      const db = getDb()

      const owner1 = await seed.user(db, { email: 'owner1@example.com', handle: 'owner1' })
      const owner2 = await seed.user(db, { email: 'owner2@example.com', handle: 'owner2' })

      // Create contact with same email but different owner
      const contact = testFactories.contact(owner1.id, { email: 'shared@example.com' })
      await db.insert(schema.contacts).values(contact)

      // Search for owner2's contacts with this email
      const result = await db
        .select()
        .from(schema.contacts)
        .where(
          and(
            eq(schema.contacts.ownerId, owner2.id),
            eq(schema.contacts.email, 'shared@example.com')
          )
        )
        .limit(1)

      expect(result[0]).toBeUndefined()
    })
  })

  describe('create', () => {
    it('should create a new contact', async () => {
      const db = getDb()
      const owner = await seed.user(db, { email: 'owner@example.com' })

      const contact = testFactories.contact(owner.id, {
        id: 'new-contact',
        email: 'newcontact@example.com',
      })

      await db.insert(schema.contacts).values(contact)

      const result = await db
        .select()
        .from(schema.contacts)
        .where(eq(schema.contacts.id, 'new-contact'))
        .limit(1)

      expect(result[0]).toBeDefined()
      expect(result[0].email).toBe('newcontact@example.com')
      expect(result[0].ownerId).toBe(owner.id)
    })

    it('should preserve all contact fields', async () => {
      const db = getDb()
      const owner = await seed.user(db, { email: 'owner@example.com' })
      const org = await seed.organisation(db, { name: 'Test Org' })
      const piiRecord = await seed.piiRecord(db, { name: 'John Contact' })

      const contact = testFactories.contact(owner.id, {
        id: 'full-contact',
        email: 'full@example.com',
        organisationId: org.id,
        piiId: piiRecord.id,
        userId: null,
      })

      await db.insert(schema.contacts).values(contact)

      const result = await db
        .select()
        .from(schema.contacts)
        .where(eq(schema.contacts.id, 'full-contact'))
        .limit(1)

      expect(result[0].email).toBe('full@example.com')
      expect(result[0].organisationId).toBe(org.id)
      expect(result[0].piiId).toBe(piiRecord.id)
      expect(result[0].userId).toBeNull()
    })
  })

  describe('createWithPii', () => {
    it('should create contact with linked PII record', async () => {
      const db = getDb()
      const owner = await seed.user(db, { email: 'owner@example.com' })

      // First create PII record
      const piiRecord = testFactories.pii({ name: 'Contact Name', phone: '123-456-7890' })
      await db.insert(schema.pii).values(piiRecord)

      // Then create contact with PII reference
      const contact = testFactories.contact(owner.id, {
        email: 'withpii@example.com',
        piiId: piiRecord.id,
      })

      await db.insert(schema.contacts).values(contact)

      // Verify contact was created with PII link
      const result = await db
        .select({
          contact: schema.contacts,
          pii: schema.pii,
        })
        .from(schema.contacts)
        .leftJoin(schema.pii, eq(schema.contacts.piiId, schema.pii.id))
        .where(eq(schema.contacts.email, 'withpii@example.com'))
        .limit(1)

      expect(result[0]).toBeDefined()
      expect(result[0].contact.piiId).toBe(piiRecord.id)
      expect(result[0].pii?.name).toBe('Contact Name')
      expect(result[0].pii?.phone).toBe('123-456-7890')
    })
  })

  describe('linkToUser', () => {
    it('should link contact to user account', async () => {
      const db = getDb()
      const owner = await seed.user(db, { email: 'owner@example.com', handle: 'owner' })
      const linkedUser = await seed.user(db, {
        email: 'linked@example.com',
        handle: 'linkeduser',
      })

      const contact = testFactories.contact(owner.id, {
        id: 'link-contact',
        email: 'linked@example.com',
        userId: null,
      })

      await db.insert(schema.contacts).values(contact)

      // Update contact to link to user
      await db
        .update(schema.contacts)
        .set({ userId: linkedUser.id })
        .where(eq(schema.contacts.id, 'link-contact'))

      const result = await db
        .select()
        .from(schema.contacts)
        .where(eq(schema.contacts.id, 'link-contact'))
        .limit(1)

      expect(result[0].userId).toBe(linkedUser.id)
    })
  })

  describe('updateOrganisation', () => {
    it('should update contact organisation', async () => {
      const db = getDb()
      const owner = await seed.user(db, { email: 'owner@example.com' })
      const org = await seed.organisation(db, { name: 'New Org' })

      const contact = testFactories.contact(owner.id, {
        id: 'org-contact',
        email: 'org@example.com',
        organisationId: null,
      })

      await db.insert(schema.contacts).values(contact)

      // Update organisation
      await db
        .update(schema.contacts)
        .set({ organisationId: org.id })
        .where(eq(schema.contacts.id, 'org-contact'))

      const result = await db
        .select()
        .from(schema.contacts)
        .where(eq(schema.contacts.id, 'org-contact'))
        .limit(1)

      expect(result[0].organisationId).toBe(org.id)
    })

    it('should clear organisation when set to null', async () => {
      const db = getDb()
      const owner = await seed.user(db, { email: 'owner@example.com' })
      const org = await seed.organisation(db, { name: 'Old Org' })

      const contact = testFactories.contact(owner.id, {
        id: 'clear-org-contact',
        email: 'clear@example.com',
        organisationId: org.id,
      })

      await db.insert(schema.contacts).values(contact)

      // Clear organisation
      await db
        .update(schema.contacts)
        .set({ organisationId: null })
        .where(eq(schema.contacts.id, 'clear-org-contact'))

      const result = await db
        .select()
        .from(schema.contacts)
        .where(eq(schema.contacts.id, 'clear-org-contact'))
        .limit(1)

      expect(result[0].organisationId).toBeNull()
    })
  })

  describe('delete', () => {
    it('should delete a contact', async () => {
      const db = getDb()
      const owner = await seed.user(db, { email: 'owner@example.com' })
      const contact = testFactories.contact(owner.id, {
        id: 'delete-contact',
        email: 'delete@example.com',
      })

      await db.insert(schema.contacts).values(contact)

      // Verify exists
      const beforeDelete = await db
        .select()
        .from(schema.contacts)
        .where(eq(schema.contacts.id, 'delete-contact'))
        .limit(1)
      expect(beforeDelete[0]).toBeDefined()

      // Delete
      await db.delete(schema.contacts).where(eq(schema.contacts.id, 'delete-contact'))

      // Verify deleted
      const afterDelete = await db
        .select()
        .from(schema.contacts)
        .where(eq(schema.contacts.id, 'delete-contact'))
        .limit(1)
      expect(afterDelete[0]).toBeUndefined()
    })

    it('should not affect other contacts', async () => {
      const db = getDb()
      const owner = await seed.user(db, { email: 'owner@example.com' })

      const contact1 = testFactories.contact(owner.id, {
        id: 'contact-1',
        email: 'contact1@example.com',
      })
      const contact2 = testFactories.contact(owner.id, {
        id: 'contact-2',
        email: 'contact2@example.com',
      })

      await db.insert(schema.contacts).values([contact1, contact2])

      // Delete only contact1
      await db.delete(schema.contacts).where(eq(schema.contacts.id, 'contact-1'))

      // Verify contact2 still exists
      const remaining = await db
        .select()
        .from(schema.contacts)
        .where(eq(schema.contacts.ownerId, owner.id))

      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe('contact-2')
    })

    it('should handle deleting non-existent contact gracefully', async () => {
      const db = getDb()

      // Should not throw
      await db.delete(schema.contacts).where(eq(schema.contacts.id, 'nonexistent'))

      const results = await db.select().from(schema.contacts)
      expect(results).toEqual([])
    })
  })

  describe('cascade behavior', () => {
    it('should delete contacts when owner is deleted', async () => {
      const db = getDb()
      const owner = await seed.user(db, { email: 'owner@example.com' })
      const contact = testFactories.contact(owner.id, { email: 'cascade@example.com' })

      await db.insert(schema.contacts).values(contact)

      // Verify contact exists
      const beforeDelete = await db.select().from(schema.contacts)
      expect(beforeDelete).toHaveLength(1)

      // Delete owner
      await db.delete(schema.users).where(eq(schema.users.id, owner.id))

      // Verify contact was cascade deleted
      const afterDelete = await db.select().from(schema.contacts)
      expect(afterDelete).toHaveLength(0)
    })
  })

  describe('findLinkedContacts', () => {
    it('should only return contacts that have a linked user account', async () => {
      const db = getDb()
      const owner = await seed.user(db, { email: 'owner@example.com', handle: 'owner' })
      const linkedUser = await seed.user(db, {
        email: 'linked@example.com',
        handle: 'linked',
      })

      // Contact with linked user
      const linkedContact = testFactories.contact(owner.id, {
        id: 'linked-contact',
        email: 'linked@example.com',
        userId: linkedUser.id,
      })

      // Contact without linked user
      const unlinkedContact = testFactories.contact(owner.id, {
        id: 'unlinked-contact',
        email: 'unlinked@example.com',
        userId: null,
      })

      await db.insert(schema.contacts).values([linkedContact, unlinkedContact])

      // Query using INNER JOIN to only get linked contacts
      const results = await db
        .select({
          contact: schema.contacts,
          user: schema.users,
        })
        .from(schema.contacts)
        .innerJoin(schema.users, eq(schema.contacts.userId, schema.users.id))
        .where(eq(schema.contacts.ownerId, owner.id))

      expect(results).toHaveLength(1)
      expect(results[0].contact.id).toBe('linked-contact')
      expect(results[0].user.email).toBe('linked@example.com')
    })
  })
})
