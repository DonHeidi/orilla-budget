import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { createTestDb, cleanDatabase, testFactories, seed } from '@/test/db-utils'
import * as schema from '@/db/schema'
import { eq, and } from 'drizzle-orm'

/**
 * Invitation Repository Tests
 *
 * Tests the invitation repository operations using direct database queries
 * to verify the expected behavior.
 */

describe('invitationRepository', () => {
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

  // Helper to create invitation test data
  async function createInvitationSetup(db: ReturnType<typeof createTestDb>['db']) {
    const inviter = await seed.user(db, { email: 'inviter@example.com', handle: 'inviter' })
    const contact = await seed.contact(db, inviter.id, { email: 'invitee@example.com' })
    return { inviter, contact }
  }

  describe('create', () => {
    it('should create a new invitation', async () => {
      const db = getDb()
      const { inviter, contact } = await createInvitationSetup(db)

      const invitation = testFactories.invitation(contact.id, inviter.id, {
        id: 'inv-123',
        code: 'testcode12345',
      })

      await db.insert(schema.invitations).values(invitation)

      const result = await db
        .select()
        .from(schema.invitations)
        .where(eq(schema.invitations.id, 'inv-123'))
        .limit(1)

      expect(result[0]).toBeDefined()
      expect(result[0].code).toBe('testcode12345')
      expect(result[0].contactId).toBe(contact.id)
      expect(result[0].invitedByUserId).toBe(inviter.id)
      expect(result[0].status).toBe('pending')
    })

    it('should create invitation with project and role', async () => {
      const db = getDb()
      const { inviter, contact } = await createInvitationSetup(db)
      const org = await seed.organisation(db, { name: 'Test Org' })
      const project = await seed.project(db, org.id, { name: 'Test Project' })

      const invitation = testFactories.invitation(contact.id, inviter.id, {
        projectId: project.id,
        role: 'viewer',
      })

      await db.insert(schema.invitations).values(invitation)

      const result = await db
        .select()
        .from(schema.invitations)
        .where(eq(schema.invitations.contactId, contact.id))
        .limit(1)

      expect(result[0].projectId).toBe(project.id)
      expect(result[0].role).toBe('viewer')
    })

    it('should set expiry date 7 days in the future by default', async () => {
      const db = getDb()
      const { inviter, contact } = await createInvitationSetup(db)

      const invitation = testFactories.invitation(contact.id, inviter.id)
      await db.insert(schema.invitations).values(invitation)

      const result = await db
        .select()
        .from(schema.invitations)
        .where(eq(schema.invitations.contactId, contact.id))
        .limit(1)

      const expiryDate = new Date(result[0].expiresAt)
      const now = new Date()
      const daysDiff = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

      // Should be approximately 7 days (allow some margin for test execution time)
      expect(daysDiff).toBeGreaterThan(6.9)
      expect(daysDiff).toBeLessThan(7.1)
    })
  })

  describe('findValidByCode', () => {
    it('should find a valid pending invitation by code', async () => {
      const db = getDb()
      const { inviter, contact } = await createInvitationSetup(db)

      const invitation = testFactories.invitation(contact.id, inviter.id, {
        code: 'validcode123',
        status: 'pending',
      })

      await db.insert(schema.invitations).values(invitation)

      const result = await db
        .select()
        .from(schema.invitations)
        .where(
          and(
            eq(schema.invitations.code, 'validcode123'),
            eq(schema.invitations.status, 'pending')
          )
        )
        .limit(1)

      expect(result[0]).toBeDefined()
      expect(result[0].code).toBe('validcode123')
    })

    it('should return undefined for non-existent code', async () => {
      const db = getDb()

      const result = await db
        .select()
        .from(schema.invitations)
        .where(eq(schema.invitations.code, 'nonexistent'))
        .limit(1)

      expect(result[0]).toBeUndefined()
    })

    it('should not return accepted invitation', async () => {
      const db = getDb()
      const { inviter, contact } = await createInvitationSetup(db)

      const invitation = testFactories.invitation(contact.id, inviter.id, {
        code: 'acceptedcode',
        status: 'accepted',
      })

      await db.insert(schema.invitations).values(invitation)

      const result = await db
        .select()
        .from(schema.invitations)
        .where(
          and(
            eq(schema.invitations.code, 'acceptedcode'),
            eq(schema.invitations.status, 'pending')
          )
        )
        .limit(1)

      expect(result[0]).toBeUndefined()
    })

    it('should not return expired invitation', async () => {
      const db = getDb()
      const { inviter, contact } = await createInvitationSetup(db)

      const invitation = testFactories.invitation(contact.id, inviter.id, {
        code: 'expiredcode',
        status: 'expired',
      })

      await db.insert(schema.invitations).values(invitation)

      const result = await db
        .select()
        .from(schema.invitations)
        .where(
          and(
            eq(schema.invitations.code, 'expiredcode'),
            eq(schema.invitations.status, 'pending')
          )
        )
        .limit(1)

      expect(result[0]).toBeUndefined()
    })
  })

  describe('findByInviter', () => {
    it('should return all invitations sent by a user', async () => {
      const db = getDb()
      const inviter = await seed.user(db, { email: 'inviter@example.com', handle: 'inviter' })

      const contact1 = await seed.contact(db, inviter.id, { email: 'contact1@example.com' })
      const contact2 = await seed.contact(db, inviter.id, { email: 'contact2@example.com' })

      const inv1 = testFactories.invitation(contact1.id, inviter.id, { code: 'code1' })
      const inv2 = testFactories.invitation(contact2.id, inviter.id, { code: 'code2' })

      await db.insert(schema.invitations).values([inv1, inv2])

      const results = await db
        .select()
        .from(schema.invitations)
        .where(eq(schema.invitations.invitedByUserId, inviter.id))

      expect(results).toHaveLength(2)
      expect(results.map((i) => i.code)).toContain('code1')
      expect(results.map((i) => i.code)).toContain('code2')
    })

    it('should return empty array when no invitations sent', async () => {
      const db = getDb()
      const inviter = await seed.user(db, { email: 'inviter@example.com' })

      const results = await db
        .select()
        .from(schema.invitations)
        .where(eq(schema.invitations.invitedByUserId, inviter.id))

      expect(results).toEqual([])
    })

    it('should not return invitations sent by other users', async () => {
      const db = getDb()

      const inviter1 = await seed.user(db, {
        email: 'inviter1@example.com',
        handle: 'inviter1',
      })
      const inviter2 = await seed.user(db, {
        email: 'inviter2@example.com',
        handle: 'inviter2',
      })

      const contact1 = await seed.contact(db, inviter1.id, { email: 'c1@example.com' })
      const contact2 = await seed.contact(db, inviter2.id, { email: 'c2@example.com' })

      const inv1 = testFactories.invitation(contact1.id, inviter1.id, { code: 'inv1code' })
      const inv2 = testFactories.invitation(contact2.id, inviter2.id, { code: 'inv2code' })

      await db.insert(schema.invitations).values([inv1, inv2])

      const results = await db
        .select()
        .from(schema.invitations)
        .where(eq(schema.invitations.invitedByUserId, inviter1.id))

      expect(results).toHaveLength(1)
      expect(results[0].code).toBe('inv1code')
    })
  })

  describe('findExistingPending', () => {
    it('should find existing pending invitation for contact', async () => {
      const db = getDb()
      const { inviter, contact } = await createInvitationSetup(db)

      const invitation = testFactories.invitation(contact.id, inviter.id, {
        status: 'pending',
        projectId: null,
      })

      await db.insert(schema.invitations).values(invitation)

      const result = await db
        .select()
        .from(schema.invitations)
        .where(
          and(
            eq(schema.invitations.contactId, contact.id),
            eq(schema.invitations.status, 'pending')
          )
        )
        .limit(1)

      expect(result[0]).toBeDefined()
    })

    it('should find existing pending invitation for contact and specific project', async () => {
      const db = getDb()
      const { inviter, contact } = await createInvitationSetup(db)
      const org = await seed.organisation(db, { name: 'Test Org' })
      const project = await seed.project(db, org.id, { name: 'Test Project' })

      const invitation = testFactories.invitation(contact.id, inviter.id, {
        status: 'pending',
        projectId: project.id,
      })

      await db.insert(schema.invitations).values(invitation)

      const result = await db
        .select()
        .from(schema.invitations)
        .where(
          and(
            eq(schema.invitations.contactId, contact.id),
            eq(schema.invitations.projectId, project.id),
            eq(schema.invitations.status, 'pending')
          )
        )
        .limit(1)

      expect(result[0]).toBeDefined()
      expect(result[0].projectId).toBe(project.id)
    })

    it('should not find pending invitation for different project', async () => {
      const db = getDb()
      const { inviter, contact } = await createInvitationSetup(db)
      const org = await seed.organisation(db, { name: 'Test Org' })
      const project1 = await seed.project(db, org.id, { name: 'Project 1' })
      const project2 = await seed.project(db, org.id, { name: 'Project 2' })

      const invitation = testFactories.invitation(contact.id, inviter.id, {
        status: 'pending',
        projectId: project1.id,
      })

      await db.insert(schema.invitations).values(invitation)

      const result = await db
        .select()
        .from(schema.invitations)
        .where(
          and(
            eq(schema.invitations.contactId, contact.id),
            eq(schema.invitations.projectId, project2.id),
            eq(schema.invitations.status, 'pending')
          )
        )
        .limit(1)

      expect(result[0]).toBeUndefined()
    })

    it('should not find accepted or expired invitations', async () => {
      const db = getDb()
      const { inviter, contact } = await createInvitationSetup(db)

      const acceptedInv = testFactories.invitation(contact.id, inviter.id, {
        code: 'accepted',
        status: 'accepted',
      })

      await db.insert(schema.invitations).values(acceptedInv)

      const result = await db
        .select()
        .from(schema.invitations)
        .where(
          and(
            eq(schema.invitations.contactId, contact.id),
            eq(schema.invitations.status, 'pending')
          )
        )
        .limit(1)

      expect(result[0]).toBeUndefined()
    })
  })

  describe('accept', () => {
    it('should mark invitation as accepted', async () => {
      const db = getDb()
      const { inviter, contact } = await createInvitationSetup(db)

      const invitation = testFactories.invitation(contact.id, inviter.id, {
        id: 'accept-inv',
        status: 'pending',
      })

      await db.insert(schema.invitations).values(invitation)

      // Update status to accepted
      await db
        .update(schema.invitations)
        .set({ status: 'accepted' })
        .where(eq(schema.invitations.id, 'accept-inv'))

      const result = await db
        .select()
        .from(schema.invitations)
        .where(eq(schema.invitations.id, 'accept-inv'))
        .limit(1)

      expect(result[0].status).toBe('accepted')
    })
  })

  describe('expire', () => {
    it('should mark invitation as expired', async () => {
      const db = getDb()
      const { inviter, contact } = await createInvitationSetup(db)

      const invitation = testFactories.invitation(contact.id, inviter.id, {
        id: 'expire-inv',
        status: 'pending',
      })

      await db.insert(schema.invitations).values(invitation)

      // Update status to expired
      await db
        .update(schema.invitations)
        .set({ status: 'expired' })
        .where(eq(schema.invitations.id, 'expire-inv'))

      const result = await db
        .select()
        .from(schema.invitations)
        .where(eq(schema.invitations.id, 'expire-inv'))
        .limit(1)

      expect(result[0].status).toBe('expired')
    })
  })

  describe('delete', () => {
    it('should delete an invitation', async () => {
      const db = getDb()
      const { inviter, contact } = await createInvitationSetup(db)

      const invitation = testFactories.invitation(contact.id, inviter.id, {
        id: 'delete-inv',
      })

      await db.insert(schema.invitations).values(invitation)

      // Delete
      await db.delete(schema.invitations).where(eq(schema.invitations.id, 'delete-inv'))

      const result = await db
        .select()
        .from(schema.invitations)
        .where(eq(schema.invitations.id, 'delete-inv'))
        .limit(1)

      expect(result[0]).toBeUndefined()
    })
  })

  describe('cascade behavior', () => {
    it('should delete invitations when contact is deleted', async () => {
      const db = getDb()
      const { inviter, contact } = await createInvitationSetup(db)

      const invitation = testFactories.invitation(contact.id, inviter.id)
      await db.insert(schema.invitations).values(invitation)

      // Verify invitation exists
      const beforeDelete = await db.select().from(schema.invitations)
      expect(beforeDelete).toHaveLength(1)

      // Delete contact
      await db.delete(schema.contacts).where(eq(schema.contacts.id, contact.id))

      // Verify invitation was cascade deleted
      const afterDelete = await db.select().from(schema.invitations)
      expect(afterDelete).toHaveLength(0)
    })

    it('should delete invitations when inviter is deleted', async () => {
      const db = getDb()
      const { inviter, contact } = await createInvitationSetup(db)

      const invitation = testFactories.invitation(contact.id, inviter.id)
      await db.insert(schema.invitations).values(invitation)

      // Delete inviter (this will cascade to contacts which cascades to invitations)
      await db.delete(schema.users).where(eq(schema.users.id, inviter.id))

      // Verify invitation was cascade deleted
      const afterDelete = await db.select().from(schema.invitations)
      expect(afterDelete).toHaveLength(0)
    })

    it('should delete invitations when project is deleted', async () => {
      const db = getDb()
      const { inviter, contact } = await createInvitationSetup(db)
      const org = await seed.organisation(db, { name: 'Test Org' })
      const project = await seed.project(db, org.id, { name: 'Test Project' })

      const invitation = testFactories.invitation(contact.id, inviter.id, {
        projectId: project.id,
      })

      await db.insert(schema.invitations).values(invitation)

      // Delete project
      await db.delete(schema.projects).where(eq(schema.projects.id, project.id))

      // Verify invitation was cascade deleted
      const afterDelete = await db.select().from(schema.invitations)
      expect(afterDelete).toHaveLength(0)
    })
  })

  describe('unique code constraint', () => {
    it('should enforce unique invitation codes', async () => {
      const db = getDb()
      const { inviter, contact } = await createInvitationSetup(db)

      const invitation1 = testFactories.invitation(contact.id, inviter.id, {
        id: 'inv-1',
        code: 'duplicatecode',
      })

      await db.insert(schema.invitations).values(invitation1)

      // Create second contact for second invitation
      const contact2 = await seed.contact(db, inviter.id, { email: 'contact2@example.com' })

      const invitation2 = testFactories.invitation(contact2.id, inviter.id, {
        id: 'inv-2',
        code: 'duplicatecode', // Same code
      })

      // This should throw due to unique constraint
      let threw = false
      try {
        await db.insert(schema.invitations).values(invitation2)
      } catch (_error) {
        threw = true
      }

      expect(threw).toBe(true)
    })
  })

  describe('invitation with joins', () => {
    it('should retrieve invitation with contact details', async () => {
      const db = getDb()
      const { inviter, contact } = await createInvitationSetup(db)

      const invitation = testFactories.invitation(contact.id, inviter.id, {
        code: 'jointest',
      })

      await db.insert(schema.invitations).values(invitation)

      const result = await db
        .select({
          invitation: schema.invitations,
          contact: schema.contacts,
        })
        .from(schema.invitations)
        .innerJoin(schema.contacts, eq(schema.invitations.contactId, schema.contacts.id))
        .where(eq(schema.invitations.code, 'jointest'))
        .limit(1)

      expect(result[0]).toBeDefined()
      expect(result[0].invitation.code).toBe('jointest')
      expect(result[0].contact.email).toBe('invitee@example.com')
    })

    it('should retrieve invitation with project details', async () => {
      const db = getDb()
      const { inviter, contact } = await createInvitationSetup(db)
      const org = await seed.organisation(db, { name: 'Test Org' })
      const project = await seed.project(db, org.id, { name: 'Invited Project' })

      const invitation = testFactories.invitation(contact.id, inviter.id, {
        code: 'projjoin',
        projectId: project.id,
        role: 'expert',
      })

      await db.insert(schema.invitations).values(invitation)

      const result = await db
        .select({
          invitation: schema.invitations,
          project: schema.projects,
        })
        .from(schema.invitations)
        .leftJoin(schema.projects, eq(schema.invitations.projectId, schema.projects.id))
        .where(eq(schema.invitations.code, 'projjoin'))
        .limit(1)

      expect(result[0]).toBeDefined()
      expect(result[0].invitation.role).toBe('expert')
      expect(result[0].project?.name).toBe('Invited Project')
    })
  })
})
