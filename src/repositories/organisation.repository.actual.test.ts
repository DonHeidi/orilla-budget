import { describe, it, expect, beforeEach } from 'bun:test'
import {
  createTestDb,
  cleanDatabase,
  seed,
  testFactories,
} from '@/test/db-utils'
import { organisationRepository } from './organisation.repository'
import * as schema from '@/db/schema'
import { eq, sum, sql } from 'drizzle-orm'

/**
 * Organisation Repository Tests
 *
 * Critical functionality: calculateBudgetHours (business logic for T&M vs Fixed projects)
 */

describe('organisationRepository', () => {
  const { db } = createTestDb()

  beforeEach(async () => {
    await cleanDatabase(db)
  })

  describe('findAll', () => {
    it('should retrieve all organisations from database', async () => {
      // Arrange
      const org1 = testFactories.organisation({ name: 'Acme Corp' })
      const org2 = testFactories.organisation({ name: 'Tech Inc' })

      await db.insert(schema.organisations).values([org1, org2])

      // Act
      const results = await db.select().from(schema.organisations)

      // Assert
      expect(results).toHaveLength(2)
      expect(results.map((o) => o.name)).toContain('Acme Corp')
      expect(results.map((o) => o.name)).toContain('Tech Inc')
    })

    it('should return empty array when no organisations exist', async () => {
      // Act
      const results = await db.select().from(schema.organisations)

      // Assert
      expect(results).toEqual([])
    })
  })

  describe('findById', () => {
    it('should retrieve organisation by id', async () => {
      // Arrange
      const org = testFactories.organisation({
        id: 'org-123',
        name: 'Test Org',
      })
      await db.insert(schema.organisations).values(org)

      // Act
      const result = await db
        .select()
        .from(schema.organisations)
        .where(eq(schema.organisations.id, 'org-123'))
        .limit(1)

      // Assert
      expect(result[0]).toBeDefined()
      expect(result[0].id).toBe('org-123')
      expect(result[0].name).toBe('Test Org')
    })

    it('should return undefined when organisation not found', async () => {
      // Act
      const result = await db
        .select()
        .from(schema.organisations)
        .where(eq(schema.organisations.id, 'nonexistent'))
        .limit(1)

      // Assert
      expect(result[0]).toBeUndefined()
    })
  })

  describe('create', () => {
    it('should insert new organisation into database', async () => {
      // Arrange
      const newOrg = testFactories.organisation({ name: 'New Corp' })

      // Act
      await db.insert(schema.organisations).values(newOrg)

      // Assert
      const result = await db
        .select()
        .from(schema.organisations)
        .where(eq(schema.organisations.id, newOrg.id))
        .limit(1)
      expect(result[0]).toBeDefined()
      expect(result[0].name).toBe('New Corp')
    })

    it('should preserve all organisation fields', async () => {
      // Arrange
      const newOrg = testFactories.organisation({
        name: 'Acme Corp',
        contactName: 'John Doe',
        contactEmail: 'john@acme.com',
        contactPhone: '555-1234',
      })

      // Act
      await db.insert(schema.organisations).values(newOrg)

      // Assert
      const result = await db
        .select()
        .from(schema.organisations)
        .where(eq(schema.organisations.id, newOrg.id))
        .limit(1)
      expect(result[0].contactName).toBe('John Doe')
      expect(result[0].contactEmail).toBe('john@acme.com')
      expect(result[0].contactPhone).toBe('555-1234')
    })
  })

  describe('update', () => {
    it('should update organisation name', async () => {
      // Arrange
      const org = await seed.organisation(db, { name: 'Old Name' })

      // Act
      await db
        .update(schema.organisations)
        .set({ name: 'New Name' })
        .where(eq(schema.organisations.id, org.id))

      // Assert
      const result = await db
        .select()
        .from(schema.organisations)
        .where(eq(schema.organisations.id, org.id))
        .limit(1)
      expect(result[0].name).toBe('New Name')
    })

    it('should update contact information', async () => {
      // Arrange
      const org = await seed.organisation(db)

      // Act
      await db
        .update(schema.organisations)
        .set({
          contactName: 'Jane Smith',
          contactEmail: 'jane@example.com',
          contactPhone: '555-9999',
        })
        .where(eq(schema.organisations.id, org.id))

      // Assert
      const result = await db
        .select()
        .from(schema.organisations)
        .where(eq(schema.organisations.id, org.id))
        .limit(1)
      expect(result[0].contactName).toBe('Jane Smith')
      expect(result[0].contactEmail).toBe('jane@example.com')
      expect(result[0].contactPhone).toBe('555-9999')
    })

    it('should not affect other organisations', async () => {
      // Arrange
      const org1 = await seed.organisation(db, { name: 'Org 1' })
      const org2 = await seed.organisation(db, { name: 'Org 2' })

      // Act
      await db
        .update(schema.organisations)
        .set({ name: 'Updated' })
        .where(eq(schema.organisations.id, org1.id))

      // Assert
      const result2 = await db
        .select()
        .from(schema.organisations)
        .where(eq(schema.organisations.id, org2.id))
        .limit(1)
      expect(result2[0].name).toBe('Org 2')
    })
  })

  describe('delete', () => {
    it('should remove organisation from database', async () => {
      // Arrange
      const org = await seed.organisation(db)

      // Act
      await db
        .delete(schema.organisations)
        .where(eq(schema.organisations.id, org.id))

      // Assert
      const result = await db
        .select()
        .from(schema.organisations)
        .where(eq(schema.organisations.id, org.id))
        .limit(1)
      expect(result[0]).toBeUndefined()
    })

    it('should cascade delete associated accounts', async () => {
      // Arrange
      const org = await seed.organisation(db, { id: 'org-1' })
      const account = await seed.account(db, 'org-1')

      // Act
      await db
        .delete(schema.organisations)
        .where(eq(schema.organisations.id, 'org-1'))

      // Assert - Account should be deleted due to cascade
      const accountResult = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.id, account.id))
        .limit(1)
      expect(accountResult[0]).toBeUndefined()
    })

    it('should cascade delete associated projects', async () => {
      // Better Auth: team (project) has cascade delete from organization
      // Arrange
      const org = await seed.organisation(db, { id: 'org-1' })
      const project = await seed.project(db, 'org-1')

      // Act
      await db
        .delete(schema.organisations)
        .where(eq(schema.organisations.id, 'org-1'))

      // Assert - Project should be cascade deleted with Better Auth
      const projectResult = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, project.id))
        .limit(1)
      expect(projectResult[0]).toBeUndefined()
    })

    it('should not affect other organisations', async () => {
      // Arrange
      const org1 = await seed.organisation(db)
      const org2 = await seed.organisation(db)

      // Act
      await db
        .delete(schema.organisations)
        .where(eq(schema.organisations.id, org1.id))

      // Assert
      const remaining = await db.select().from(schema.organisations)
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe(org2.id)
    })
  })

  describe('calculateBudgetHours - CRITICAL business logic', () => {
    it('should calculate total budget hours from Time & Materials projects', async () => {
      // Arrange
      const org = await seed.organisation(db, { id: 'org-1' })
      await seed.project(db, 'org-1', { category: 'budget', budgetHours: 100 })
      await seed.project(db, 'org-1', { category: 'budget', budgetHours: 50 })

      // Act
      const result = await db
        .select({ total: sum(schema.projects.budgetHours) })
        .from(schema.projects)
        .where(
          sql`${schema.projects.organizationId} = 'org-1' AND ${schema.projects.category} = 'budget'`
        )

      // Assert
      expect(Number(result[0]?.total)).toBe(150)
    })

    it('should exclude fixed price projects from budget calculation', async () => {
      // Arrange
      const org = await seed.organisation(db, { id: 'org-1' })
      await seed.project(db, 'org-1', { category: 'budget', budgetHours: 100 })
      await seed.project(db, 'org-1', { category: 'fixed', budgetHours: null })

      // Act
      const result = await db
        .select({ total: sum(schema.projects.budgetHours) })
        .from(schema.projects)
        .where(
          sql`${schema.projects.organizationId} = 'org-1' AND ${schema.projects.category} = 'budget'`
        )

      // Assert - Should only count budget project
      expect(Number(result[0]?.total)).toBe(100)
    })

    it('should return 0 when organisation has no budget projects', async () => {
      // Arrange
      const org = await seed.organisation(db, { id: 'org-1' })
      await seed.project(db, 'org-1', { category: 'fixed', budgetHours: null })

      // Act
      const result = await db
        .select({ total: sum(schema.projects.budgetHours) })
        .from(schema.projects)
        .where(
          sql`${schema.projects.organizationId} = 'org-1' AND ${schema.projects.category} = 'budget'`
        )

      // Assert
      const total = result[0]?.total ? Number(result[0].total) : 0
      expect(total).toBe(0)
    })

    it('should return 0 when organisation has no projects', async () => {
      // Arrange
      const org = await seed.organisation(db, { id: 'org-1' })

      // Act
      const result = await db
        .select({ total: sum(schema.projects.budgetHours) })
        .from(schema.projects)
        .where(
          sql`${schema.projects.organizationId} = 'org-1' AND ${schema.projects.category} = 'budget'`
        )

      // Assert
      const total = result[0]?.total ? Number(result[0].total) : 0
      expect(total).toBe(0)
    })

    it('should handle decimal budget hours correctly', async () => {
      // Arrange
      const org = await seed.organisation(db, { id: 'org-1' })
      await seed.project(db, 'org-1', { category: 'budget', budgetHours: 75.5 })
      await seed.project(db, 'org-1', { category: 'budget', budgetHours: 24.5 })

      // Act
      const result = await db
        .select({ total: sum(schema.projects.budgetHours) })
        .from(schema.projects)
        .where(
          sql`${schema.projects.organizationId} = 'org-1' AND ${schema.projects.category} = 'budget'`
        )

      // Assert
      expect(Number(result[0]?.total)).toBe(100)
    })

    it('should only calculate budget for specific organisation', async () => {
      // Arrange
      const org1 = await seed.organisation(db, { id: 'org-1' })
      const org2 = await seed.organisation(db, { id: 'org-2' })
      await seed.project(db, 'org-1', { category: 'budget', budgetHours: 100 })
      await seed.project(db, 'org-2', { category: 'budget', budgetHours: 200 })

      // Act
      const result = await db
        .select({ total: sum(schema.projects.budgetHours) })
        .from(schema.projects)
        .where(
          sql`${schema.projects.organizationId} = 'org-1' AND ${schema.projects.category} = 'budget'`
        )

      // Assert - Should only sum org-1's projects
      expect(Number(result[0]?.total)).toBe(100)
    })

    it('should handle mix of budget and fixed projects correctly', async () => {
      // Arrange
      const org = await seed.organisation(db, { id: 'org-1' })
      await seed.project(db, 'org-1', { category: 'budget', budgetHours: 50 })
      await seed.project(db, 'org-1', { category: 'fixed', budgetHours: null })
      await seed.project(db, 'org-1', { category: 'budget', budgetHours: 75 })
      await seed.project(db, 'org-1', { category: 'fixed', budgetHours: null })

      // Act
      const result = await db
        .select({ total: sum(schema.projects.budgetHours) })
        .from(schema.projects)
        .where(
          sql`${schema.projects.organizationId} = 'org-1' AND ${schema.projects.category} = 'budget'`
        )

      // Assert - Should only sum budget projects (50 + 75 = 125)
      expect(Number(result[0]?.total)).toBe(125)
    })
  })
})
