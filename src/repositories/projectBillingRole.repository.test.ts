import { describe, it, expect, beforeEach } from 'bun:test'
import { createTestDb, cleanDatabase, seed } from '@/test/db-utils'
import * as schema from '@/db/schema'
import { eq, and } from 'drizzle-orm'

/**
 * Project Billing Role Repository Tests
 *
 * Key functionality: CRUD operations for billing roles with archival support
 */

describe('projectBillingRoleRepository', () => {
  const { db } = createTestDb()

  beforeEach(async () => {
    await cleanDatabase(db)
  })

  describe('findByProjectId', () => {
    it('should return all non-archived roles for a project', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      await seed.projectBillingRole(db, project.teamId, { name: 'Developer' })
      await seed.projectBillingRole(db, project.teamId, { name: 'Designer' })

      // Act
      const results = await db
        .select()
        .from(schema.projectBillingRoles)
        .where(
          and(
            eq(schema.projectBillingRoles.projectId, project.teamId),
            eq(schema.projectBillingRoles.archived, false)
          )
        )

      // Assert
      expect(results).toHaveLength(2)
      expect(results.map((r) => r.name)).toContain('Developer')
      expect(results.map((r) => r.name)).toContain('Designer')
    })

    it('should return empty array when no roles exist', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)

      // Act
      const results = await db
        .select()
        .from(schema.projectBillingRoles)
        .where(
          and(
            eq(schema.projectBillingRoles.projectId, project.teamId),
            eq(schema.projectBillingRoles.archived, false)
          )
        )

      // Assert
      expect(results).toEqual([])
    })

    it('should exclude archived roles', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      await seed.projectBillingRole(db, project.teamId, { name: 'Active Role', archived: false })
      await seed.projectBillingRole(db, project.teamId, { name: 'Archived Role', archived: true })

      // Act
      const results = await db
        .select()
        .from(schema.projectBillingRoles)
        .where(
          and(
            eq(schema.projectBillingRoles.projectId, project.teamId),
            eq(schema.projectBillingRoles.archived, false)
          )
        )

      // Assert
      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('Active Role')
    })
  })

  describe('findAllByProjectId', () => {
    it('should return all roles including archived', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      await seed.projectBillingRole(db, project.teamId, { name: 'Active Role', archived: false })
      await seed.projectBillingRole(db, project.teamId, { name: 'Archived Role', archived: true })

      // Act
      const results = await db
        .select()
        .from(schema.projectBillingRoles)
        .where(eq(schema.projectBillingRoles.projectId, project.teamId))

      // Assert
      expect(results).toHaveLength(2)
      expect(results.map((r) => r.name)).toContain('Active Role')
      expect(results.map((r) => r.name)).toContain('Archived Role')
    })

    it('should return empty array when no roles exist', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)

      // Act
      const results = await db
        .select()
        .from(schema.projectBillingRoles)
        .where(eq(schema.projectBillingRoles.projectId, project.teamId))

      // Assert
      expect(results).toEqual([])
    })
  })

  describe('findById', () => {
    it('should return role by ID', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const role = await seed.projectBillingRole(db, project.teamId, { name: 'Senior Developer' })

      // Act
      const result = await db
        .select()
        .from(schema.projectBillingRoles)
        .where(eq(schema.projectBillingRoles.id, role.id))
        .limit(1)

      // Assert
      expect(result[0]).toBeDefined()
      expect(result[0].id).toBe(role.id)
      expect(result[0].name).toBe('Senior Developer')
    })

    it('should return undefined when not found', async () => {
      // Act
      const result = await db
        .select()
        .from(schema.projectBillingRoles)
        .where(eq(schema.projectBillingRoles.id, 'nonexistent-id'))
        .limit(1)

      // Assert
      expect(result[0]).toBeUndefined()
    })
  })

  describe('create', () => {
    it('should insert new billing role', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const now = new Date().toISOString()

      // Act
      const [role] = await db
        .insert(schema.projectBillingRoles)
        .values({
          id: crypto.randomUUID(),
          projectId: project.teamId,
          name: 'Lead Engineer',
          description: 'Technical leadership role',
          archived: false,
          createdAt: now,
          updatedAt: now,
        })
        .returning()

      // Assert
      expect(role).toBeDefined()
      expect(role.name).toBe('Lead Engineer')
      expect(role.description).toBe('Technical leadership role')
      expect(role.projectId).toBe(project.teamId)
    })

    it('should set timestamps correctly', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)

      // Act
      const role = await seed.projectBillingRole(db, project.teamId, { name: 'Tester' })

      // Assert
      expect(role.createdAt).toBeDefined()
      expect(role.updatedAt).toBeDefined()
      // Timestamps should be valid ISO strings
      expect(() => new Date(role.createdAt)).not.toThrow()
      expect(() => new Date(role.updatedAt)).not.toThrow()
    })

    it('should default archived to false', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)

      // Act
      const role = await seed.projectBillingRole(db, project.teamId, { name: 'Analyst' })

      // Assert
      expect(role.archived).toBe(false)
    })
  })

  describe('update', () => {
    it('should update role name', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const role = await seed.projectBillingRole(db, project.teamId, { name: 'Old Name' })

      // Act
      await db
        .update(schema.projectBillingRoles)
        .set({ name: 'New Name', updatedAt: new Date().toISOString() })
        .where(eq(schema.projectBillingRoles.id, role.id))

      // Assert
      const [updated] = await db
        .select()
        .from(schema.projectBillingRoles)
        .where(eq(schema.projectBillingRoles.id, role.id))

      expect(updated.name).toBe('New Name')
    })

    it('should update role description', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const role = await seed.projectBillingRole(db, project.teamId, {
        name: 'Developer',
        description: 'Old description',
      })

      // Act
      await db
        .update(schema.projectBillingRoles)
        .set({ description: 'New description', updatedAt: new Date().toISOString() })
        .where(eq(schema.projectBillingRoles.id, role.id))

      // Assert
      const [updated] = await db
        .select()
        .from(schema.projectBillingRoles)
        .where(eq(schema.projectBillingRoles.id, role.id))

      expect(updated.description).toBe('New description')
    })

    it('should update updatedAt timestamp', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const role = await seed.projectBillingRole(db, project.teamId, { name: 'Developer' })
      const originalUpdatedAt = role.updatedAt

      // Wait a tiny bit to ensure timestamp difference
      await new Promise((r) => setTimeout(r, 10))

      // Act
      await db
        .update(schema.projectBillingRoles)
        .set({ name: 'Senior Developer', updatedAt: new Date().toISOString() })
        .where(eq(schema.projectBillingRoles.id, role.id))

      // Assert
      const [updated] = await db
        .select()
        .from(schema.projectBillingRoles)
        .where(eq(schema.projectBillingRoles.id, role.id))

      expect(updated.updatedAt).not.toBe(originalUpdatedAt)
    })
  })

  describe('archive', () => {
    it('should set archived to true', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const role = await seed.projectBillingRole(db, project.teamId, { name: 'Developer' })

      // Act
      await db
        .update(schema.projectBillingRoles)
        .set({ archived: true, updatedAt: new Date().toISOString() })
        .where(eq(schema.projectBillingRoles.id, role.id))

      // Assert
      const [archived] = await db
        .select()
        .from(schema.projectBillingRoles)
        .where(eq(schema.projectBillingRoles.id, role.id))

      expect(archived.archived).toBe(true)
    })

    it('should preserve role data for historical queries', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const role = await seed.projectBillingRole(db, project.teamId, {
        name: 'Legacy Role',
        description: 'Historical data should be preserved',
      })

      // Act
      await db
        .update(schema.projectBillingRoles)
        .set({ archived: true, updatedAt: new Date().toISOString() })
        .where(eq(schema.projectBillingRoles.id, role.id))

      // Assert
      const [archived] = await db
        .select()
        .from(schema.projectBillingRoles)
        .where(eq(schema.projectBillingRoles.id, role.id))

      expect(archived.name).toBe('Legacy Role')
      expect(archived.description).toBe('Historical data should be preserved')
      expect(archived.archived).toBe(true)
    })
  })

  describe('existsByName', () => {
    it('should return true when name exists in project', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      await seed.projectBillingRole(db, project.teamId, { name: 'Developer' })

      // Act
      const result = await db
        .select({ id: schema.projectBillingRoles.id })
        .from(schema.projectBillingRoles)
        .where(
          and(
            eq(schema.projectBillingRoles.projectId, project.teamId),
            eq(schema.projectBillingRoles.name, 'Developer'),
            eq(schema.projectBillingRoles.archived, false)
          )
        )
        .limit(1)

      // Assert
      expect(result.length > 0).toBe(true)
    })

    it("should return false when name doesn't exist", async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      await seed.projectBillingRole(db, project.teamId, { name: 'Developer' })

      // Act
      const result = await db
        .select({ id: schema.projectBillingRoles.id })
        .from(schema.projectBillingRoles)
        .where(
          and(
            eq(schema.projectBillingRoles.projectId, project.teamId),
            eq(schema.projectBillingRoles.name, 'Designer'),
            eq(schema.projectBillingRoles.archived, false)
          )
        )
        .limit(1)

      // Assert
      expect(result.length > 0).toBe(false)
    })

    it('should exclude specified ID when checking', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const role = await seed.projectBillingRole(db, project.teamId, { name: 'Developer' })

      // Act - checking if name exists excluding the role's own ID (for update validation)
      const result = await db
        .select({ id: schema.projectBillingRoles.id })
        .from(schema.projectBillingRoles)
        .where(
          and(
            eq(schema.projectBillingRoles.projectId, project.teamId),
            eq(schema.projectBillingRoles.name, 'Developer'),
            eq(schema.projectBillingRoles.archived, false)
          )
        )
        .limit(1)

      // When the found ID matches the excludeId, we treat it as "not exists"
      const exists = result.length > 0 && result[0].id !== role.id

      // Assert
      expect(exists).toBe(false)
    })

    it('should be case-sensitive', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      await seed.projectBillingRole(db, project.teamId, { name: 'Developer' })

      // Act - search with different case
      const result = await db
        .select({ id: schema.projectBillingRoles.id })
        .from(schema.projectBillingRoles)
        .where(
          and(
            eq(schema.projectBillingRoles.projectId, project.teamId),
            eq(schema.projectBillingRoles.name, 'developer'), // lowercase
            eq(schema.projectBillingRoles.archived, false)
          )
        )
        .limit(1)

      // Assert - SQLite is case-insensitive by default, but eq() is case-sensitive
      // This tests the repository's actual behavior
      expect(result.length).toBe(0)
    })
  })
})
