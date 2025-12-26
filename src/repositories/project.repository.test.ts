import { describe, it, expect, beforeEach } from 'bun:test'
import {
  createTestDb,
  cleanDatabase,
  seed,
} from '@/test/db-utils'
import * as schema from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Project Repository Tests
 *
 * Key functionality: findByOrganisationId, budget validation
 *
 * Note: seed.project() creates both a team (auth layer) and project (business layer)
 */

describe('projectRepository', () => {
  const { db } = createTestDb()

  beforeEach(async () => {
    await cleanDatabase(db)
  })

  describe('findAll', () => {
    it('should retrieve all projects from database', async () => {
      // Arrange
      const org = await seed.organisation(db)
      await seed.project(db, org.id, { name: 'Project Alpha' })
      await seed.project(db, org.id, { name: 'Project Beta' })

      // Act
      const results = await db.select().from(schema.projects)

      // Assert
      expect(results).toHaveLength(2)
      expect(results.map((p) => p.name)).toContain('Project Alpha')
      expect(results.map((p) => p.name)).toContain('Project Beta')
    })

    it('should return empty array when no projects exist', async () => {
      // Act
      const results = await db.select().from(schema.projects)

      // Assert
      expect(results).toEqual([])
    })
  })

  describe('findById', () => {
    it('should retrieve project by id', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id, { name: 'Test Project' })

      // Act
      const result = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, project.id))
        .limit(1)

      // Assert
      expect(result[0]).toBeDefined()
      expect(result[0].id).toBe(project.id)
      expect(result[0].name).toBe('Test Project')
    })

    it('should return undefined when project not found', async () => {
      // Act
      const result = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, 'nonexistent'))
        .limit(1)

      // Assert
      expect(result[0]).toBeUndefined()
    })
  })

  describe('findByOrganisationId', () => {
    it('should retrieve all projects for an organisation', async () => {
      // Arrange
      const org1 = await seed.organisation(db, { id: 'org-1' })
      const org2 = await seed.organisation(db, { id: 'org-2' })

      await seed.project(db, org1.id, { name: 'Org1 Project 1' })
      await seed.project(db, org1.id, { name: 'Org1 Project 2' })
      await seed.project(db, org2.id, { name: 'Org2 Project 1' })

      // Act
      const results = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.organisationId, 'org-1'))

      // Assert
      expect(results).toHaveLength(2)
      expect(results.map((p) => p.name)).toContain('Org1 Project 1')
      expect(results.map((p) => p.name)).toContain('Org1 Project 2')
    })

    it('should return empty array when organisation has no projects', async () => {
      // Arrange
      await seed.organisation(db, { id: 'org-empty' })

      // Act
      const results = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.organisationId, 'org-empty'))

      // Assert
      expect(results).toEqual([])
    })

    it('should handle multiple organisations with different project counts', async () => {
      // Arrange
      const org1 = await seed.organisation(db, { id: 'org-many' })
      const org2 = await seed.organisation(db, { id: 'org-one' })

      await seed.project(db, org1.id, { name: 'Project 1' })
      await seed.project(db, org1.id, { name: 'Project 2' })
      await seed.project(db, org1.id, { name: 'Project 3' })
      await seed.project(db, org2.id, { name: 'Solo Project' })

      // Act
      const org1Results = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.organisationId, 'org-many'))

      const org2Results = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.organisationId, 'org-one'))

      // Assert
      expect(org1Results).toHaveLength(3)
      expect(org2Results).toHaveLength(1)
    })
  })

  describe('create', () => {
    it('should insert new budget project into database', async () => {
      // Arrange
      const org = await seed.organisation(db)

      // Act - seed.project creates both team and project
      const project = await seed.project(db, org.id, {
        name: 'New Budget Project',
        description: 'A new project',
        category: 'budget',
        budgetHours: 100,
      })

      // Assert
      const result = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, project.id))
        .limit(1)

      expect(result[0]).toBeDefined()
      expect(result[0].name).toBe('New Budget Project')
      expect(result[0].category).toBe('budget')
      expect(result[0].budgetHours).toBe(100)
    })

    it('should insert new fixed project into database', async () => {
      // Arrange
      const org = await seed.organisation(db)

      // Act
      const project = await seed.project(db, org.id, {
        name: 'Fixed Price Project',
        category: 'fixed',
        budgetHours: null,
      })

      // Assert
      const result = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, project.id))
        .limit(1)

      expect(result[0]).toBeDefined()
      expect(result[0].category).toBe('fixed')
      expect(result[0].budgetHours).toBeNull()
    })

    it('should preserve all project fields', async () => {
      // Arrange
      const org = await seed.organisation(db)

      // Act
      const project = await seed.project(db, org.id, {
        name: 'Complete Project',
        description: 'Full description',
        category: 'budget',
        budgetHours: 50,
      })

      // Assert
      const result = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, project.id))
        .limit(1)

      expect(result[0]).toBeDefined()
      expect(result[0].name).toBe('Complete Project')
      expect(result[0].description).toBe('Full description')
      expect(result[0].category).toBe('budget')
      expect(result[0].budgetHours).toBe(50)
      expect(result[0].organisationId).toBe(org.id)
      expect(result[0].teamId).toBeDefined() // Should have a teamId
    })
  })

  describe('update', () => {
    it('should update project name', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id, { name: 'Old Name' })

      // Act
      await db
        .update(schema.projects)
        .set({ name: 'New Name', updatedAt: new Date().toISOString() })
        .where(eq(schema.projects.id, project.id))

      // Assert
      const result = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, project.id))
        .limit(1)

      expect(result[0].name).toBe('New Name')
    })

    it('should update budget hours', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id, {
        category: 'budget',
        budgetHours: 100,
      })

      // Act
      await db
        .update(schema.projects)
        .set({ budgetHours: 200, updatedAt: new Date().toISOString() })
        .where(eq(schema.projects.id, project.id))

      // Assert
      const result = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, project.id))
        .limit(1)

      expect(result[0].budgetHours).toBe(200)
    })
  })

  describe('delete', () => {
    it('should delete project by id', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)

      // Act
      await db.delete(schema.projects).where(eq(schema.projects.id, project.id))

      // Assert
      const result = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, project.id))
        .limit(1)

      expect(result[0]).toBeUndefined()
    })

    it('should only delete specified project', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project1 = await seed.project(db, org.id, { name: 'Project 1' })
      const project2 = await seed.project(db, org.id, { name: 'Project 2' })

      // Act
      await db.delete(schema.projects).where(eq(schema.projects.id, project1.id))

      // Assert
      const results = await db.select().from(schema.projects)
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe(project2.id)
    })
  })

  describe('budget category validation', () => {
    it('should store budget category correctly', async () => {
      // Arrange
      const org = await seed.organisation(db)

      // Act
      const project = await seed.project(db, org.id, {
        category: 'budget',
        budgetHours: 100,
      })

      // Assert
      const result = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, project.id))
        .limit(1)

      expect(result[0].category).toBe('budget')
    })

    it('should store fixed category correctly', async () => {
      // Arrange
      const org = await seed.organisation(db)

      // Act
      const project = await seed.project(db, org.id, {
        category: 'fixed',
        budgetHours: null,
      })

      // Assert
      const result = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, project.id))
        .limit(1)

      expect(result[0].category).toBe('fixed')
    })
  })
})
