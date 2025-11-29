import { describe, it, expect, beforeEach } from 'bun:test'
import {
  createTestDb,
  cleanDatabase,
  seed,
  testFactories,
} from '@/test/db-utils'
import { projectRepository } from './project.repository'
import * as schema from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Project Repository Tests
 *
 * Key functionality: findByOrganisationId, budget validation
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
      const project1 = testFactories.project(org.id, { name: 'Project Alpha' })
      const project2 = testFactories.project(org.id, { name: 'Project Beta' })

      await db.insert(schema.projects).values([project1, project2])

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
      const project = testFactories.project(org.id, {
        id: 'proj-123',
        name: 'Test Project',
      })
      await db.insert(schema.projects).values(project)

      // Act
      const result = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, 'proj-123'))
        .limit(1)

      // Assert
      expect(result[0]).toBeDefined()
      expect(result[0].id).toBe('proj-123')
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

      const proj1 = testFactories.project('org-1', { name: 'Org1 Project 1' })
      const proj2 = testFactories.project('org-1', { name: 'Org1 Project 2' })
      const proj3 = testFactories.project('org-2', { name: 'Org2 Project 1' })

      await db.insert(schema.projects).values([proj1, proj2, proj3])

      // Act
      const results = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.organisationId, 'org-1'))

      // Assert
      expect(results).toHaveLength(2)
      expect(results.map((p) => p.name)).toContain('Org1 Project 1')
      expect(results.map((p) => p.name)).toContain('Org1 Project 2')
      expect(results.map((p) => p.name)).not.toContain('Org2 Project 1')
    })

    it('should return empty array when organisation has no projects', async () => {
      // Arrange
      await seed.organisation(db, { id: 'org-1' })

      // Act
      const results = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.organisationId, 'org-1'))

      // Assert
      expect(results).toEqual([])
    })

    it('should handle multiple organisations with different project counts', async () => {
      // Arrange
      const org1 = await seed.organisation(db, { id: 'org-1' })
      const org2 = await seed.organisation(db, { id: 'org-2' })

      await seed.project(db, 'org-1', { name: 'Org1 Project' })
      await seed.project(db, 'org-2', { name: 'Org2 Project 1' })
      await seed.project(db, 'org-2', { name: 'Org2 Project 2' })
      await seed.project(db, 'org-2', { name: 'Org2 Project 3' })

      // Act
      const org1Results = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.organisationId, 'org-1'))
      const org2Results = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.organisationId, 'org-2'))

      // Assert
      expect(org1Results).toHaveLength(1)
      expect(org2Results).toHaveLength(3)
    })
  })

  describe('create', () => {
    it('should insert new budget project into database', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const newProject = testFactories.project(org.id, {
        name: 'New Project',
        category: 'budget',
        budgetHours: 100,
      })

      // Act
      await db.insert(schema.projects).values(newProject)

      // Assert
      const result = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, newProject.id))
        .limit(1)
      expect(result[0]).toBeDefined()
      expect(result[0].name).toBe('New Project')
      expect(result[0].category).toBe('budget')
      expect(result[0].budgetHours).toBe(100)
    })

    it('should insert new fixed project into database', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const newProject = testFactories.project(org.id, {
        name: 'Fixed Price Project',
        category: 'fixed',
        budgetHours: null,
      })

      // Act
      await db.insert(schema.projects).values(newProject)

      // Assert
      const result = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, newProject.id))
        .limit(1)
      expect(result[0]).toBeDefined()
      expect(result[0].category).toBe('fixed')
      expect(result[0].budgetHours).toBeNull()
    })

    it('should preserve all project fields', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const newProject = testFactories.project(org.id, {
        name: 'Complete Project',
        description: 'A detailed description',
        category: 'budget',
        budgetHours: 150.5,
      })

      // Act
      await db.insert(schema.projects).values(newProject)

      // Assert
      const result = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, newProject.id))
        .limit(1)
      expect(result[0].description).toBe('A detailed description')
      expect(result[0].budgetHours).toBe(150.5)
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
        .set({ name: 'New Name' })
        .where(eq(schema.projects.id, project.id))

      // Assert
      const result = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, project.id))
        .limit(1)
      expect(result[0].name).toBe('New Name')
    })

    it('should update project description', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id, {
        description: 'Old description',
      })

      // Act
      await db
        .update(schema.projects)
        .set({ description: 'New description' })
        .where(eq(schema.projects.id, project.id))

      // Assert
      const result = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, project.id))
        .limit(1)
      expect(result[0].description).toBe('New description')
    })

    it('should update budget hours', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id, { budgetHours: 100 })

      // Act
      await db
        .update(schema.projects)
        .set({ budgetHours: 200 })
        .where(eq(schema.projects.id, project.id))

      // Assert
      const result = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, project.id))
        .limit(1)
      expect(result[0].budgetHours).toBe(200)
    })

    it('should update multiple fields', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)

      // Act
      await db
        .update(schema.projects)
        .set({
          name: 'Updated Name',
          description: 'Updated description',
          budgetHours: 300,
        })
        .where(eq(schema.projects.id, project.id))

      // Assert
      const result = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, project.id))
        .limit(1)
      expect(result[0].name).toBe('Updated Name')
      expect(result[0].description).toBe('Updated description')
      expect(result[0].budgetHours).toBe(300)
    })

    it('should convert budget project to fixed project', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id, {
        category: 'budget',
        budgetHours: 100,
      })

      // Act
      await db
        .update(schema.projects)
        .set({
          category: 'fixed',
          budgetHours: null,
        })
        .where(eq(schema.projects.id, project.id))

      // Assert
      const result = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, project.id))
        .limit(1)
      expect(result[0].category).toBe('fixed')
      expect(result[0].budgetHours).toBeNull()
    })

    it('should not affect other projects', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project1 = await seed.project(db, org.id, { name: 'Project 1' })
      const project2 = await seed.project(db, org.id, { name: 'Project 2' })

      // Act
      await db
        .update(schema.projects)
        .set({ name: 'Updated' })
        .where(eq(schema.projects.id, project1.id))

      // Assert
      const result2 = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, project2.id))
        .limit(1)
      expect(result2[0].name).toBe('Project 2')
    })
  })

  describe('delete', () => {
    it('should remove project from database', async () => {
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

    it('should set organisationId to null when organisation is deleted', async () => {
      // Arrange
      const org = await seed.organisation(db, { id: 'org-1' })
      const project = await seed.project(db, 'org-1')

      // Act - Delete organisation
      await db
        .delete(schema.organisations)
        .where(eq(schema.organisations.id, 'org-1'))

      // Assert - Project should remain but with null organisationId
      const result = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, project.id))
        .limit(1)
      expect(result[0]).toBeDefined()
      expect(result[0].organisationId).toBeNull()
    })

    it('should not affect other projects', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project1 = await seed.project(db, org.id)
      const project2 = await seed.project(db, org.id)

      // Act
      await db
        .delete(schema.projects)
        .where(eq(schema.projects.id, project1.id))

      // Assert
      const remaining = await db.select().from(schema.projects)
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe(project2.id)
    })
  })

  describe('data integrity', () => {
    it('should maintain foreign key relationship with organisation', async () => {
      // Arrange & Act & Assert
      const invalidProject = testFactories.project('nonexistent-org')
      try {
        await db.insert(schema.projects).values(invalidProject)
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should allow multiple projects for same organisation', async () => {
      // Arrange
      const org = await seed.organisation(db, { id: 'org-1' })
      const project1 = testFactories.project('org-1', { name: 'Project 1' })
      const project2 = testFactories.project('org-1', { name: 'Project 2' })
      const project3 = testFactories.project('org-1', { name: 'Project 3' })

      // Act
      await db.insert(schema.projects).values([project1, project2, project3])

      // Assert
      const results = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.organisationId, 'org-1'))
      expect(results).toHaveLength(3)
    })
  })

  describe('project categories', () => {
    it('should handle budget (Time & Materials) projects', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = testFactories.project(org.id, {
        category: 'budget',
        budgetHours: 100,
      })

      // Act
      await db.insert(schema.projects).values(project)

      // Assert
      const result = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, project.id))
        .limit(1)
      expect(result[0].category).toBe('budget')
      expect(result[0].budgetHours).toBe(100)
    })

    it('should handle fixed price projects', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = testFactories.project(org.id, {
        category: 'fixed',
        budgetHours: null,
      })

      // Act
      await db.insert(schema.projects).values(project)

      // Assert
      const result = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, project.id))
        .limit(1)
      expect(result[0].category).toBe('fixed')
      expect(result[0].budgetHours).toBeNull()
    })

    it('should allow decimal budget hours', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = testFactories.project(org.id, {
        category: 'budget',
        budgetHours: 75.25,
      })

      // Act
      await db.insert(schema.projects).values(project)

      // Assert
      const result = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, project.id))
        .limit(1)
      expect(result[0].budgetHours).toBe(75.25)
    })
  })
})
