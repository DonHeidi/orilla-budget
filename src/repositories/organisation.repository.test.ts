import { describe, it, expect, beforeEach } from 'bun:test'
import { createTestDb, cleanDatabase, seed } from '@/test/db-utils'
import { eq, sum, sql } from 'drizzle-orm'
import { organisations, projects } from '@/db/schema'
import type { Organisation } from '@/schemas'

/**
 * Example repository tests demonstrating testing patterns
 *
 * Note: These tests use a direct database approach since repositories
 * import the db instance directly. For production use, consider:
 * 1. Modifying repositories to accept db as a parameter (dependency injection)
 * 2. Using environment-based database configuration for tests
 * 3. Creating a test database and running tests against it
 */

describe('organisationRepository patterns', () => {
  const { db } = createTestDb()

  beforeEach(async () => {
    await cleanDatabase(db)
  })

  describe('findAll pattern', () => {
    it('should retrieve all organisations from database', async () => {
      // Arrange - Seed test data
      await seed.organisation(db, { name: 'Acme Corp' })
      await seed.organisation(db, { name: 'Tech Inc' })

      // Act - Query using the same pattern as repository
      const results = await db.select().from(organisations)

      // Assert
      expect(results).toHaveLength(2)
      expect(results.map((o) => o.name)).toContain('Acme Corp')
      expect(results.map((o) => o.name)).toContain('Tech Inc')
    })

    it('should return empty array when no organisations exist', async () => {
      // Act
      const results = await db.select().from(organisations)

      // Assert
      expect(results).toEqual([])
    })
  })

  describe('findById pattern', () => {
    it('should retrieve organisation by id', async () => {
      // Arrange
      const org = await seed.organisation(db, { name: 'Test Org' })

      // Act
      const result = await db
        .select()
        .from(organisations)
        .where(eq(organisations.id, org.id))
        .limit(1)

      // Assert
      expect(result[0]).toBeDefined()
      expect(result[0].name).toBe('Test Org')
      expect(result[0].id).toBe(org.id)
    })

    it('should return empty array when organisation not found', async () => {
      // Act
      const result = await db
        .select()
        .from(organisations)
        .where(eq(organisations.id, 'non-existent'))
        .limit(1)

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('create pattern', () => {
    it('should insert new organisation into database', async () => {
      // Arrange - Better Auth tables use Date objects for timestamps
      const newOrg = {
        id: '123',
        name: 'New Company',
        slug: 'new-company',
        contactName: 'Jane Doe',
        contactEmail: 'jane@example.com',
        contactPhone: '555-0100',
        createdAt: new Date(),
      }

      // Act
      await db.insert(organisations).values(newOrg)

      // Assert - Verify it was saved
      const saved = await db
        .select()
        .from(organisations)
        .where(eq(organisations.id, '123'))
        .limit(1)

      expect(saved[0]).toBeDefined()
      expect(saved[0].name).toBe('New Company')
    })
  })

  describe('update pattern', () => {
    it('should update existing organisation', async () => {
      // Arrange
      const org = await seed.organisation(db, { name: 'Original Name' })

      // Act
      await db
        .update(organisations)
        .set({ name: 'Updated Name' })
        .where(eq(organisations.id, org.id))

      // Assert
      const updated = await db
        .select()
        .from(organisations)
        .where(eq(organisations.id, org.id))
        .limit(1)

      expect(updated[0].name).toBe('Updated Name')
      expect(updated[0].contactName).toBe(org.contactName)
    })

    it('should handle partial updates', async () => {
      // Arrange
      const org = await seed.organisation(db, {
        name: 'Company',
        contactEmail: 'old@example.com',
      })

      // Act
      await db
        .update(organisations)
        .set({ contactEmail: 'new@example.com' })
        .where(eq(organisations.id, org.id))

      // Assert
      const updated = await db
        .select()
        .from(organisations)
        .where(eq(organisations.id, org.id))
        .limit(1)

      expect(updated[0].name).toBe('Company')
      expect(updated[0].contactEmail).toBe('new@example.com')
    })
  })

  describe('delete pattern', () => {
    it('should remove organisation from database', async () => {
      // Arrange
      const org = await seed.organisation(db, { name: 'To Delete' })

      // Act
      await db.delete(organisations).where(eq(organisations.id, org.id))

      // Assert
      const deleted = await db
        .select()
        .from(organisations)
        .where(eq(organisations.id, org.id))
        .limit(1)

      expect(deleted).toEqual([])
    })

    it('should cascade delete related projects when organisation deleted', async () => {
      // Arrange
      const org = await seed.organisation(db)
      await seed.project(db, org.id, { name: 'Project 1' })
      await seed.project(db, org.id, { name: 'Project 2' })

      // Act
      await db.delete(organisations).where(eq(organisations.id, org.id))

      // Assert - Projects should be deleted due to cascade in Better Auth schema
      const remainingProjects = await db.select().from(projects)
      expect(remainingProjects).toHaveLength(0)
    })
  })

  describe('calculateBudgetHours pattern', () => {
    it('should sum budget hours from budget category projects only', async () => {
      // Arrange
      const org = await seed.organisation(db)
      await seed.project(db, org.id, {
        name: 'Budget Project 1',
        category: 'budget',
        budgetHours: 100,
      })
      await seed.project(db, org.id, {
        name: 'Budget Project 2',
        category: 'budget',
        budgetHours: 50,
      })
      await seed.project(db, org.id, {
        name: 'Fixed Project',
        category: 'fixed',
        budgetHours: 200, // Should not be counted
      })

      // Act - Note: project table uses organisationId (British spelling)
      const result = await db
        .select({ total: sum(projects.budgetHours) })
        .from(projects)
        .where(
          sql`${projects.organisationId} = ${org.id} AND ${projects.category} = 'budget'`
        )

      // Assert
      const total = result[0]?.total ? Number(result[0].total) : 0
      expect(total).toBe(150) // Only 100 + 50 from budget projects
    })

    it('should return 0 when organisation has no budget projects', async () => {
      // Arrange
      const org = await seed.organisation(db)
      await seed.project(db, org.id, {
        name: 'Fixed Project',
        category: 'fixed',
        budgetHours: 100,
      })

      // Act
      const result = await db
        .select({ total: sum(projects.budgetHours) })
        .from(projects)
        .where(
          sql`${projects.organisationId} = ${org.id} AND ${projects.category} = 'budget'`
        )

      // Assert
      const total = result[0]?.total ? Number(result[0].total) : 0
      expect(total).toBe(0)
    })

    it('should return 0 when organisation has no projects', async () => {
      // Arrange
      const org = await seed.organisation(db)

      // Act
      const result = await db
        .select({ total: sum(projects.budgetHours) })
        .from(projects)
        .where(
          sql`${projects.organisationId} = ${org.id} AND ${projects.category} = 'budget'`
        )

      // Assert
      const total = result[0]?.total ? Number(result[0].total) : 0
      expect(total).toBe(0)
    })
  })

  describe('data integrity', () => {
    it('should enforce unique id constraint', async () => {
      // Arrange
      await seed.organisation(db, { id: '123', name: 'First' })

      // Act & Assert
      await expect(
        seed.organisation(db, { id: '123', name: 'Duplicate' })
      ).rejects.toThrow()
    })

    it('should preserve timestamps on update', async () => {
      // Arrange
      const org = await seed.organisation(db, { name: 'Test' })
      const originalCreatedAt = org.createdAt

      // Wait a bit to ensure timestamp would change if updated
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Act
      await db
        .update(organisations)
        .set({ name: 'Updated' })
        .where(eq(organisations.id, org.id))

      // Assert
      const updated = await db
        .select()
        .from(organisations)
        .where(eq(organisations.id, org.id))
        .limit(1)

      // Better Auth uses Date objects for timestamps - compare time values
      expect(updated[0].createdAt.getTime()).toBe(originalCreatedAt.getTime())
    })
  })
})
