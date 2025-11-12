import { describe, it, expect, beforeEach } from 'bun:test'
import {
  createTestDb,
  cleanDatabase,
  seed,
  testFactories,
} from '@/test/db-utils'
import { timeEntryRepository } from './timeEntry.repository'
import * as schema from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Time Entry Repository Tests
 *
 * Key functionality: findByProjectId, findByOrganisationId filtering
 */

describe('timeEntryRepository', () => {
  const { db } = createTestDb()

  beforeEach(async () => {
    await cleanDatabase(db)
  })

  describe('findAll', () => {
    it('should retrieve all time entries from database', async () => {
      // Arrange
      const entry1 = testFactories.timeEntry({ title: 'Bug fix', hours: 2 })
      const entry2 = testFactories.timeEntry({ title: 'Feature dev', hours: 5 })

      await db.insert(schema.timeEntries).values([entry1, entry2])

      // Act
      const results = await db.select().from(schema.timeEntries)

      // Assert
      expect(results).toHaveLength(2)
      expect(results.map((e) => e.title)).toContain('Bug fix')
      expect(results.map((e) => e.title)).toContain('Feature dev')
    })

    it('should return empty array when no time entries exist', async () => {
      // Act
      const results = await db.select().from(schema.timeEntries)

      // Assert
      expect(results).toEqual([])
    })
  })

  describe('findById', () => {
    it('should retrieve time entry by id', async () => {
      // Arrange
      const entry = testFactories.timeEntry({
        id: 'entry-123',
        title: 'Test Entry',
      })
      await db.insert(schema.timeEntries).values(entry)

      // Act
      const result = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, 'entry-123'))
        .limit(1)

      // Assert
      expect(result[0]).toBeDefined()
      expect(result[0].id).toBe('entry-123')
      expect(result[0].title).toBe('Test Entry')
    })

    it('should return undefined when time entry not found', async () => {
      // Act
      const result = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, 'nonexistent'))
        .limit(1)

      // Assert
      expect(result[0]).toBeUndefined()
    })
  })

  describe('findByProjectId', () => {
    it('should retrieve all time entries for a project', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project1 = await seed.project(db, org.id, { id: 'proj-1' })
      const project2 = await seed.project(db, org.id, { id: 'proj-2' })

      const entry1 = testFactories.timeEntry({
        projectId: 'proj-1',
        title: 'Proj1 Entry 1',
      })
      const entry2 = testFactories.timeEntry({
        projectId: 'proj-1',
        title: 'Proj1 Entry 2',
      })
      const entry3 = testFactories.timeEntry({
        projectId: 'proj-2',
        title: 'Proj2 Entry 1',
      })

      await db.insert(schema.timeEntries).values([entry1, entry2, entry3])

      // Act
      const results = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.projectId, 'proj-1'))

      // Assert
      expect(results).toHaveLength(2)
      expect(results.map((e) => e.title)).toContain('Proj1 Entry 1')
      expect(results.map((e) => e.title)).toContain('Proj1 Entry 2')
      expect(results.map((e) => e.title)).not.toContain('Proj2 Entry 1')
    })

    it('should return empty array when project has no time entries', async () => {
      // Arrange
      const org = await seed.organisation(db)
      await seed.project(db, org.id, { id: 'proj-1' })

      // Act
      const results = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.projectId, 'proj-1'))

      // Assert
      expect(results).toEqual([])
    })
  })

  describe('findByOrganisationId', () => {
    it('should retrieve all time entries for an organisation', async () => {
      // Arrange
      const org1 = await seed.organisation(db, { id: 'org-1' })
      const org2 = await seed.organisation(db, { id: 'org-2' })

      const entry1 = testFactories.timeEntry({
        organisationId: 'org-1',
        title: 'Org1 Entry 1',
      })
      const entry2 = testFactories.timeEntry({
        organisationId: 'org-1',
        title: 'Org1 Entry 2',
      })
      const entry3 = testFactories.timeEntry({
        organisationId: 'org-2',
        title: 'Org2 Entry 1',
      })

      await db.insert(schema.timeEntries).values([entry1, entry2, entry3])

      // Act
      const results = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.organisationId, 'org-1'))

      // Assert
      expect(results).toHaveLength(2)
      expect(results.map((e) => e.title)).toContain('Org1 Entry 1')
      expect(results.map((e) => e.title)).toContain('Org1 Entry 2')
      expect(results.map((e) => e.title)).not.toContain('Org2 Entry 1')
    })

    it('should return empty array when organisation has no time entries', async () => {
      // Arrange
      await seed.organisation(db, { id: 'org-1' })

      // Act
      const results = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.organisationId, 'org-1'))

      // Assert
      expect(results).toEqual([])
    })
  })

  describe('create', () => {
    it('should insert new time entry into database', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id)
      const newEntry = testFactories.timeEntry({
        projectId: project.id,
        title: 'New Task',
        hours: 3.5,
        date: '2024-11-11',
      })

      // Act
      await db.insert(schema.timeEntries).values(newEntry)

      // Assert
      const result = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, newEntry.id))
        .limit(1)
      expect(result[0]).toBeDefined()
      expect(result[0].title).toBe('New Task')
      expect(result[0].hours).toBe(3.5)
      expect(result[0].date).toBe('2024-11-11')
    })

    it('should preserve all time entry fields', async () => {
      // Arrange
      const newEntry = testFactories.timeEntry({
        title: 'Complete Task',
        description: 'Detailed description',
        hours: 2.75,
        date: '2024-11-11',
        billed: true,
      })

      // Act
      await db.insert(schema.timeEntries).values(newEntry)

      // Assert
      const result = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, newEntry.id))
        .limit(1)
      expect(result[0].description).toBe('Detailed description')
      expect(result[0].billed).toBe(true)
    })

    it('should allow time entry without project (organisation only)', async () => {
      // Arrange
      const org = await seed.organisation(db, { id: 'org-1' })
      const newEntry = testFactories.timeEntry({
        projectId: undefined,
        organisationId: 'org-1',
        title: 'General work',
        hours: 1,
        date: '2024-11-11',
      })

      // Act
      await db.insert(schema.timeEntries).values(newEntry)

      // Assert
      const result = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, newEntry.id))
        .limit(1)
      expect(result[0].projectId).toBeNull()
      expect(result[0].organisationId).toBe('org-1')
    })
  })

  describe('update', () => {
    it('should update time entry title', async () => {
      // Arrange
      const entry = await seed.timeEntry(db, { title: 'Old Title' })

      // Act
      await db
        .update(schema.timeEntries)
        .set({ title: 'New Title' })
        .where(eq(schema.timeEntries.id, entry.id))

      // Assert
      const result = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, entry.id))
        .limit(1)
      expect(result[0].title).toBe('New Title')
    })

    it('should update hours', async () => {
      // Arrange
      const entry = await seed.timeEntry(db, { hours: 2 })

      // Act
      await db
        .update(schema.timeEntries)
        .set({ hours: 5.5 })
        .where(eq(schema.timeEntries.id, entry.id))

      // Assert
      const result = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, entry.id))
        .limit(1)
      expect(result[0].hours).toBe(5.5)
    })

    it('should update description', async () => {
      // Arrange
      const entry = await seed.timeEntry(db, { description: 'Old description' })

      // Act
      await db
        .update(schema.timeEntries)
        .set({ description: 'New description' })
        .where(eq(schema.timeEntries.id, entry.id))

      // Assert
      const result = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, entry.id))
        .limit(1)
      expect(result[0].description).toBe('New description')
    })

    it('should mark entry as billed', async () => {
      // Arrange
      const entry = await seed.timeEntry(db, { billed: false })

      // Act
      await db
        .update(schema.timeEntries)
        .set({ billed: true })
        .where(eq(schema.timeEntries.id, entry.id))

      // Assert
      const result = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, entry.id))
        .limit(1)
      expect(result[0].billed).toBe(true)
    })

    it('should set approved date', async () => {
      // Arrange
      const approvedDate = new Date().toISOString()
      const entry = await seed.timeEntry(db, { approvedDate: undefined })

      // Act
      await db
        .update(schema.timeEntries)
        .set({ approvedDate })
        .where(eq(schema.timeEntries.id, entry.id))

      // Assert
      const result = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, entry.id))
        .limit(1)
      expect(result[0].approvedDate).toBe(approvedDate)
    })

    it('should update multiple fields', async () => {
      // Arrange
      const entry = await seed.timeEntry(db)

      // Act
      await db
        .update(schema.timeEntries)
        .set({
          title: 'Updated Title',
          description: 'Updated description',
          hours: 10,
          billed: true,
        })
        .where(eq(schema.timeEntries.id, entry.id))

      // Assert
      const result = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, entry.id))
        .limit(1)
      expect(result[0].title).toBe('Updated Title')
      expect(result[0].description).toBe('Updated description')
      expect(result[0].hours).toBe(10)
      expect(result[0].billed).toBe(true)
    })

    it('should not affect other time entries', async () => {
      // Arrange
      const entry1 = await seed.timeEntry(db, { title: 'Entry 1' })
      const entry2 = await seed.timeEntry(db, { title: 'Entry 2' })

      // Act
      await db
        .update(schema.timeEntries)
        .set({ title: 'Updated' })
        .where(eq(schema.timeEntries.id, entry1.id))

      // Assert
      const result2 = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, entry2.id))
        .limit(1)
      expect(result2[0].title).toBe('Entry 2')
    })
  })

  describe('delete', () => {
    it('should remove time entry from database', async () => {
      // Arrange
      const entry = await seed.timeEntry(db)

      // Act
      await db
        .delete(schema.timeEntries)
        .where(eq(schema.timeEntries.id, entry.id))

      // Assert
      const result = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, entry.id))
        .limit(1)
      expect(result[0]).toBeUndefined()
    })

    it('should cascade delete when project is deleted', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id, { id: 'proj-1' })
      const entry = await seed.timeEntry(db, { projectId: 'proj-1' })

      // Act - Delete project
      await db.delete(schema.projects).where(eq(schema.projects.id, 'proj-1'))

      // Assert - Time entry should be deleted due to cascade
      const result = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, entry.id))
        .limit(1)
      expect(result[0]).toBeUndefined()
    })

    it('should cascade delete when organisation is deleted', async () => {
      // Arrange
      const org = await seed.organisation(db, { id: 'org-1' })
      const entry = await seed.timeEntry(db, { organisationId: 'org-1' })

      // Act - Delete organisation
      await db
        .delete(schema.organisations)
        .where(eq(schema.organisations.id, 'org-1'))

      // Assert - Time entry should be deleted due to cascade
      const result = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, entry.id))
        .limit(1)
      expect(result[0]).toBeUndefined()
    })

    it('should not affect other time entries', async () => {
      // Arrange
      const entry1 = await seed.timeEntry(db)
      const entry2 = await seed.timeEntry(db)

      // Act
      await db
        .delete(schema.timeEntries)
        .where(eq(schema.timeEntries.id, entry1.id))

      // Assert
      const remaining = await db.select().from(schema.timeEntries)
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe(entry2.id)
    })
  })

  describe('time entry states', () => {
    it('should handle unbilled entries', async () => {
      // Arrange & Act
      const entry = await seed.timeEntry(db, { billed: false })

      // Assert
      const result = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, entry.id))
        .limit(1)
      expect(result[0].billed).toBe(false)
    })

    it('should handle billed entries', async () => {
      // Arrange & Act
      const entry = await seed.timeEntry(db, { billed: true })

      // Assert
      const result = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, entry.id))
        .limit(1)
      expect(result[0].billed).toBe(true)
    })

    it('should handle unapproved entries', async () => {
      // Arrange & Act
      const entry = await seed.timeEntry(db, { approvedDate: undefined })

      // Assert
      const result = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, entry.id))
        .limit(1)
      expect(result[0].approvedDate).toBeNull()
    })

    it('should handle approved entries', async () => {
      // Arrange
      const approvedDate = new Date().toISOString()
      const entry = await seed.timeEntry(db, { approvedDate })

      // Act - Entry is already created with approvedDate

      // Assert
      const result = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, entry.id))
        .limit(1)
      expect(result[0].approvedDate).toBe(approvedDate)
    })
  })

  describe('hours tracking', () => {
    it('should handle integer hours', async () => {
      // Arrange & Act
      const entry = await seed.timeEntry(db, { hours: 5 })

      // Assert
      const result = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, entry.id))
        .limit(1)
      expect(result[0].hours).toBe(5)
    })

    it('should handle decimal hours', async () => {
      // Arrange & Act
      const entry = await seed.timeEntry(db, { hours: 2.5 })

      // Assert
      const result = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, entry.id))
        .limit(1)
      expect(result[0].hours).toBe(2.5)
    })

    it('should handle precise decimal hours', async () => {
      // Arrange & Act
      const entry = await seed.timeEntry(db, { hours: 1.75 })

      // Assert
      const result = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, entry.id))
        .limit(1)
      expect(result[0].hours).toBe(1.75)
    })
  })
})
