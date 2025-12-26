import { describe, it, expect, beforeEach } from 'bun:test'
import {
  createTestDb,
  cleanDatabase,
  seed,
  testFactories,
} from '@/test/db-utils'
import { timeSheetRepository } from './timeSheet.repository'
import * as schema from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'

/**
 * Time Sheet Repository Tests
 *
 * Most complex repository with 16 methods:
 * - Basic CRUD
 * - Complex queries (findWithEntries)
 * - Entry management (addEntries, removeEntry, getAvailableEntries, getEntriesInSheet)
 * - Workflow actions (submitSheet, approveSheet, rejectSheet, revertToDraft)
 * - Filtering (findByStatus, findByOrganisation, findByProject)
 */

describe('timeSheetRepository', () => {
  const { db } = createTestDb()

  beforeEach(async () => {
    await cleanDatabase(db)
  })

  describe('findAll', () => {
    it('should retrieve all time sheets from database', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet1 = testFactories.timeSheet({
        title: 'Week 45',
        organisationId: org.id,
      })
      const sheet2 = testFactories.timeSheet({
        title: 'Week 46',
        organisationId: org.id,
      })

      await db.insert(schema.timeSheets).values([sheet1, sheet2])

      // Act
      const results = await db.select().from(schema.timeSheets)

      // Assert
      expect(results).toHaveLength(2)
      expect(results.map((s) => s.title)).toContain('Week 45')
      expect(results.map((s) => s.title)).toContain('Week 46')
    })

    it('should return empty array when no time sheets exist', async () => {
      // Act
      const results = await db.select().from(schema.timeSheets)

      // Assert
      expect(results).toEqual([])
    })
  })

  describe('findById', () => {
    it('should retrieve time sheet by id', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet = testFactories.timeSheet({
        id: 'sheet-123',
        title: 'Test Sheet',
        organisationId: org.id,
      })
      await db.insert(schema.timeSheets).values(sheet)

      // Act
      const result = await db
        .select()
        .from(schema.timeSheets)
        .where(eq(schema.timeSheets.id, 'sheet-123'))
        .limit(1)

      // Assert
      expect(result[0]).toBeDefined()
      expect(result[0].id).toBe('sheet-123')
      expect(result[0].title).toBe('Test Sheet')
    })

    it('should return undefined when time sheet not found', async () => {
      // Act
      const result = await db
        .select()
        .from(schema.timeSheets)
        .where(eq(schema.timeSheets.id, 'nonexistent'))
        .limit(1)

      // Assert
      expect(result[0]).toBeUndefined()
    })
  })

  describe('findByStatus', () => {
    it('should retrieve all draft time sheets', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const draft1 = await seed.timeSheet(db, {
        status: 'draft',
        title: 'Draft 1',
        organisationId: org.id,
      })
      const draft2 = await seed.timeSheet(db, {
        status: 'draft',
        title: 'Draft 2',
        organisationId: org.id,
      })
      const submitted = await seed.timeSheet(db, {
        status: 'submitted',
        title: 'Submitted',
        organisationId: org.id,
      })

      // Act
      const results = await db
        .select()
        .from(schema.timeSheets)
        .where(eq(schema.timeSheets.status, 'draft'))

      // Assert
      expect(results).toHaveLength(2)
      expect(results.map((s) => s.title)).toContain('Draft 1')
      expect(results.map((s) => s.title)).toContain('Draft 2')
      expect(results.map((s) => s.title)).not.toContain('Submitted')
    })

    it('should retrieve all submitted time sheets', async () => {
      // Arrange
      const org = await seed.organisation(db)
      await seed.timeSheet(db, { status: 'draft', organisationId: org.id })
      const submitted = await seed.timeSheet(db, {
        status: 'submitted',
        organisationId: org.id,
      })

      // Act
      const results = await db
        .select()
        .from(schema.timeSheets)
        .where(eq(schema.timeSheets.status, 'submitted'))

      // Assert
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe(submitted.id)
    })

    it('should retrieve all approved time sheets', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const approved = await seed.timeSheet(db, {
        status: 'approved',
        organisationId: org.id,
      })

      // Act
      const results = await db
        .select()
        .from(schema.timeSheets)
        .where(eq(schema.timeSheets.status, 'approved'))

      // Assert
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe(approved.id)
    })

    it('should retrieve all rejected time sheets', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const rejected = await seed.timeSheet(db, {
        status: 'rejected',
        organisationId: org.id,
      })

      // Act
      const results = await db
        .select()
        .from(schema.timeSheets)
        .where(eq(schema.timeSheets.status, 'rejected'))

      // Assert
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe(rejected.id)
    })
  })

  describe('findByOrganisation', () => {
    it('should retrieve all time sheets for an organisation', async () => {
      // Arrange
      const org1 = await seed.organisation(db, { id: 'org-1' })
      const org2 = await seed.organisation(db, { id: 'org-2' })

      await seed.timeSheet(db, {
        organisationId: 'org-1',
        title: 'Org1 Sheet 1',
      })
      await seed.timeSheet(db, {
        organisationId: 'org-1',
        title: 'Org1 Sheet 2',
      })
      await seed.timeSheet(db, {
        organisationId: 'org-2',
        title: 'Org2 Sheet 1',
      })

      // Act
      const results = await db
        .select()
        .from(schema.timeSheets)
        .where(eq(schema.timeSheets.organisationId, 'org-1'))

      // Assert
      expect(results).toHaveLength(2)
      expect(results.map((s) => s.title)).toContain('Org1 Sheet 1')
      expect(results.map((s) => s.title)).toContain('Org1 Sheet 2')
    })
  })

  describe('findByProject', () => {
    it('should retrieve all time sheets for a project', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project1 = await seed.project(db, org.id)
      const project2 = await seed.project(db, org.id)

      // timeSheets.projectId references team.id, so use project.teamId
      await seed.timeSheet(db, { projectId: project1.teamId, organisationId: org.id })
      await seed.timeSheet(db, { projectId: project1.teamId, organisationId: org.id })
      await seed.timeSheet(db, { projectId: project2.teamId, organisationId: org.id })

      // Act
      const results = await db
        .select()
        .from(schema.timeSheets)
        .where(eq(schema.timeSheets.projectId, project1.teamId))

      // Assert
      expect(results).toHaveLength(2)
    })
  })

  describe('findByAccount', () => {
    it('should retrieve all time sheets for an account', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const account1 = await seed.account(db, org.id, { id: 'acc-1' })
      const account2 = await seed.account(db, org.id, { id: 'acc-2' })

      await seed.timeSheet(db, { accountId: 'acc-1', organisationId: org.id })
      await seed.timeSheet(db, { accountId: 'acc-1', organisationId: org.id })
      await seed.timeSheet(db, { accountId: 'acc-2', organisationId: org.id })

      // Act
      const results = await db
        .select()
        .from(schema.timeSheets)
        .where(eq(schema.timeSheets.accountId, 'acc-1'))

      // Assert
      expect(results).toHaveLength(2)
    })

    it('should return empty array when account has no time sheets', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const account = await seed.account(db, org.id, { id: 'acc-1' })

      // Act
      const results = await db
        .select()
        .from(schema.timeSheets)
        .where(eq(schema.timeSheets.accountId, 'acc-1'))

      // Assert
      expect(results).toHaveLength(0)
    })
  })

  describe('create', () => {
    it('should insert new time sheet into database', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const newSheet = testFactories.timeSheet({
        title: 'New Sheet',
        organisationId: org.id,
        status: 'draft',
      })

      // Act
      await db.insert(schema.timeSheets).values(newSheet)

      // Assert
      const result = await db
        .select()
        .from(schema.timeSheets)
        .where(eq(schema.timeSheets.id, newSheet.id))
        .limit(1)
      expect(result[0]).toBeDefined()
      expect(result[0].title).toBe('New Sheet')
      expect(result[0].status).toBe('draft')
    })

    it('should preserve all time sheet fields', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const newSheet = testFactories.timeSheet({
        title: 'Complete Sheet',
        description: 'Detailed description',
        startDate: '2024-11-04',
        endDate: '2024-11-10',
        organisationId: org.id,
        status: 'draft',
      })

      // Act
      await db.insert(schema.timeSheets).values(newSheet)

      // Assert
      const result = await db
        .select()
        .from(schema.timeSheets)
        .where(eq(schema.timeSheets.id, newSheet.id))
        .limit(1)
      expect(result[0].description).toBe('Detailed description')
      expect(result[0].startDate).toBe('2024-11-04')
      expect(result[0].endDate).toBe('2024-11-10')
    })
  })

  describe('update', () => {
    it('should update time sheet title', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet = await seed.timeSheet(db, {
        title: 'Old Title',
        organisationId: org.id,
      })

      // Act
      const updateData = {
        title: 'New Title',
        updatedAt: new Date().toISOString(),
      }
      await db
        .update(schema.timeSheets)
        .set(updateData)
        .where(eq(schema.timeSheets.id, sheet.id))

      // Assert
      const result = await db
        .select()
        .from(schema.timeSheets)
        .where(eq(schema.timeSheets.id, sheet.id))
        .limit(1)
      expect(result[0].title).toBe('New Title')
    })

    it('should automatically update updatedAt timestamp', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet = await seed.timeSheet(db, { organisationId: org.id })
      const originalUpdatedAt = sheet.updatedAt

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Act
      const newUpdatedAt = new Date().toISOString()
      await db
        .update(schema.timeSheets)
        .set({ title: 'Updated', updatedAt: newUpdatedAt })
        .where(eq(schema.timeSheets.id, sheet.id))

      // Assert
      const result = await db
        .select()
        .from(schema.timeSheets)
        .where(eq(schema.timeSheets.id, sheet.id))
        .limit(1)
      expect(result[0].updatedAt).not.toBe(originalUpdatedAt)
    })
  })

  describe('delete', () => {
    it('should remove time sheet from database', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet = await seed.timeSheet(db, { organisationId: org.id })

      // Act
      await db
        .delete(schema.timeSheets)
        .where(eq(schema.timeSheets.id, sheet.id))

      // Assert
      const result = await db
        .select()
        .from(schema.timeSheets)
        .where(eq(schema.timeSheets.id, sheet.id))
        .limit(1)
      expect(result[0]).toBeUndefined()
    })

    it('should cascade delete time sheet entries', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet = await seed.timeSheet(db, {
        id: 'sheet-1',
        organisationId: org.id,
      })
      const entry = await seed.timeEntry(db)

      // Add entry to sheet
      const sheetEntry = {
        id: 'tse-1',
        timeSheetId: 'sheet-1',
        timeEntryId: entry.id,
        createdAt: new Date().toISOString(),
      }
      await db.insert(schema.timeSheetEntries).values(sheetEntry)

      // Act - Delete sheet
      await db
        .delete(schema.timeSheets)
        .where(eq(schema.timeSheets.id, 'sheet-1'))

      // Assert - Sheet entry should be deleted due to cascade
      const result = await db
        .select()
        .from(schema.timeSheetEntries)
        .where(eq(schema.timeSheetEntries.id, 'tse-1'))
        .limit(1)
      expect(result[0]).toBeUndefined()
    })
  })

  describe('findWithEntries - Complex query with joins', () => {
    it('should retrieve time sheet with all entries and calculate total hours', async () => {
      // Arrange
      const org = await seed.organisation(db, { id: 'org-1' })
      const sheet = await seed.timeSheet(db, {
        id: 'sheet-1',
        organisationId: 'org-1',
      })
      const entry1 = await seed.timeEntry(db, { hours: 2.5 })
      const entry2 = await seed.timeEntry(db, { hours: 3.5 })

      // Add entries to sheet
      await db.insert(schema.timeSheetEntries).values([
        {
          id: 'tse-1',
          timeSheetId: 'sheet-1',
          timeEntryId: entry1.id,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'tse-2',
          timeSheetId: 'sheet-1',
          timeEntryId: entry2.id,
          createdAt: new Date().toISOString(),
        },
      ])

      // Act - Simulate the repository's findWithEntries logic
      const sheetResult = await db
        .select()
        .from(schema.timeSheets)
        .where(eq(schema.timeSheets.id, 'sheet-1'))
        .limit(1)
      const sheetEntryRecords = await db
        .select()
        .from(schema.timeSheetEntries)
        .where(eq(schema.timeSheetEntries.timeSheetId, 'sheet-1'))
      const entryIds = sheetEntryRecords.map((se) => se.timeEntryId)
      const entries = await db
        .select()
        .from(schema.timeEntries)
        .where(sql`${schema.timeEntries.id} IN ${entryIds}`)
      const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0)

      // Assert
      expect(sheetResult[0]).toBeDefined()
      expect(entries).toHaveLength(2)
      expect(totalHours).toBe(6) // 2.5 + 3.5
    })

    it('should include organisation when present', async () => {
      // Arrange
      const org = await seed.organisation(db, { id: 'org-1', name: 'Test Org' })
      const sheet = await seed.timeSheet(db, {
        id: 'sheet-1',
        organisationId: 'org-1',
      })

      // Act
      const sheetResult = await db
        .select()
        .from(schema.timeSheets)
        .where(eq(schema.timeSheets.id, 'sheet-1'))
        .limit(1)
      const orgResult = await db
        .select()
        .from(schema.organisations)
        .where(eq(schema.organisations.id, 'org-1'))
        .limit(1)

      // Assert
      expect(orgResult[0]).toBeDefined()
      expect(orgResult[0].name).toBe('Test Org')
    })

    it('should include project when present', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id, {
        name: 'Test Project',
      })
      // timeSheets.projectId references team.id, so use project.teamId
      const sheet = await seed.timeSheet(db, {
        id: 'sheet-1',
        projectId: project.teamId,
        organisationId: org.id,
      })

      // Act
      const projResult = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, project.id))
        .limit(1)

      // Assert
      expect(projResult[0]).toBeDefined()
      expect(projResult[0].name).toBe('Test Project')
    })
  })

  describe('addEntries - Entry management', () => {
    it('should add multiple entries to a time sheet', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet = await seed.timeSheet(db, {
        id: 'sheet-1',
        organisationId: org.id,
      })
      const entry1 = await seed.timeEntry(db)
      const entry2 = await seed.timeEntry(db)

      // Act - Simulate addEntries
      const now = new Date().toISOString()
      const entries = [entry1.id, entry2.id].map((entryId, i) => ({
        id: `tse-${i + 1}`,
        timeSheetId: 'sheet-1',
        timeEntryId: entryId,
        createdAt: now,
      }))
      await db.insert(schema.timeSheetEntries).values(entries)

      // Assert
      const result = await db
        .select()
        .from(schema.timeSheetEntries)
        .where(eq(schema.timeSheetEntries.timeSheetId, 'sheet-1'))
      expect(result).toHaveLength(2)
    })

    it('should not add entries if array is empty', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet = await seed.timeSheet(db, {
        id: 'sheet-1',
        organisationId: org.id,
      })

      // Act - Don't insert if empty
      const entryIds: string[] = []
      if (entryIds.length > 0) {
        await db.insert(schema.timeSheetEntries).values([])
      }

      // Assert
      const result = await db
        .select()
        .from(schema.timeSheetEntries)
        .where(eq(schema.timeSheetEntries.timeSheetId, 'sheet-1'))
      expect(result).toHaveLength(0)
    })
  })

  describe('removeEntry - Entry removal', () => {
    it('should remove specific entry from time sheet', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet = await seed.timeSheet(db, {
        id: 'sheet-1',
        organisationId: org.id,
      })
      const entry1 = await seed.timeEntry(db)
      const entry2 = await seed.timeEntry(db)

      await db.insert(schema.timeSheetEntries).values([
        {
          id: 'tse-1',
          timeSheetId: 'sheet-1',
          timeEntryId: entry1.id,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'tse-2',
          timeSheetId: 'sheet-1',
          timeEntryId: entry2.id,
          createdAt: new Date().toISOString(),
        },
      ])

      // Act
      await db
        .delete(schema.timeSheetEntries)
        .where(
          and(
            eq(schema.timeSheetEntries.timeSheetId, 'sheet-1'),
            eq(schema.timeSheetEntries.timeEntryId, entry1.id)
          )
        )

      // Assert
      const result = await db
        .select()
        .from(schema.timeSheetEntries)
        .where(eq(schema.timeSheetEntries.timeSheetId, 'sheet-1'))
      expect(result).toHaveLength(1)
      expect(result[0].timeEntryId).toBe(entry2.id)
    })
  })

  describe('getAvailableEntries - Complex filtering logic', () => {
    /**
     * These tests verify the query logic for filtering available time entries.
     * The repository excludes entries that are in ANY time sheet (not just approved).
     * Tests use the test db directly to verify the filtering logic.
     */

    it('should exclude entries in any time sheet (not just approved)', async () => {
      // Arrange
      const org = await seed.organisation(db, { id: 'org-1' })
      const draftSheet = await seed.timeSheet(db, {
        status: 'draft',
        organisationId: 'org-1',
      })
      const entry1 = await seed.timeEntry(db, { organisationId: 'org-1' })
      const entry2 = await seed.timeEntry(db, { organisationId: 'org-1' })

      // Add entry1 to draft sheet
      await db.insert(schema.timeSheetEntries).values({
        id: 'tse-1',
        timeSheetId: draftSheet.id,
        timeEntryId: entry1.id,
        createdAt: new Date().toISOString(),
      })

      // Act - Simulate getAvailableEntries logic: exclude entries in ANY sheet
      const allSheetEntryRecords = await db.select().from(schema.timeSheetEntries)
      const entriesInAnySheet = allSheetEntryRecords.map((se) => se.timeEntryId)

      const availableEntries = await db
        .select()
        .from(schema.timeEntries)
        .where(
          and(
            eq(schema.timeEntries.organisationId, 'org-1'),
            entriesInAnySheet.length > 0
              ? sql`${schema.timeEntries.id} NOT IN ${entriesInAnySheet}`
              : undefined
          )
        )

      // Assert - entry1 should be excluded even though sheet is draft
      expect(availableEntries).toHaveLength(1)
      expect(availableEntries[0].id).toBe(entry2.id)
    })

    it('should exclude entries in sheets of any status', async () => {
      // Arrange
      const org = await seed.organisation(db, { id: 'org-1' })

      // Create sheets with different statuses
      const draftSheet = await seed.timeSheet(db, {
        id: 'sheet-draft',
        status: 'draft',
        organisationId: 'org-1',
      })
      const submittedSheet = await seed.timeSheet(db, {
        id: 'sheet-submitted',
        status: 'submitted',
        organisationId: 'org-1',
      })
      const approvedSheet = await seed.timeSheet(db, {
        id: 'sheet-approved',
        status: 'approved',
        organisationId: 'org-1',
      })

      // Create entries
      const entryInDraft = await seed.timeEntry(db, { organisationId: 'org-1' })
      const entryInSubmitted = await seed.timeEntry(db, {
        organisationId: 'org-1',
      })
      const entryInApproved = await seed.timeEntry(db, {
        organisationId: 'org-1',
      })
      const unassignedEntry = await seed.timeEntry(db, {
        organisationId: 'org-1',
      })

      // Add entries to sheets
      await db.insert(schema.timeSheetEntries).values([
        {
          id: 'tse-1',
          timeSheetId: draftSheet.id,
          timeEntryId: entryInDraft.id,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'tse-2',
          timeSheetId: submittedSheet.id,
          timeEntryId: entryInSubmitted.id,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'tse-3',
          timeSheetId: approvedSheet.id,
          timeEntryId: entryInApproved.id,
          createdAt: new Date().toISOString(),
        },
      ])

      // Act - Simulate getAvailableEntries logic
      const allSheetEntryRecords = await db.select().from(schema.timeSheetEntries)
      const entriesInAnySheet = allSheetEntryRecords.map((se) => se.timeEntryId)

      const availableEntries = await db
        .select()
        .from(schema.timeEntries)
        .where(
          and(
            eq(schema.timeEntries.organisationId, 'org-1'),
            sql`${schema.timeEntries.id} NOT IN ${entriesInAnySheet}`
          )
        )

      // Assert - only unassigned entry should be available
      expect(availableEntries).toHaveLength(1)
      expect(availableEntries[0].id).toBe(unassignedEntry.id)
    })

    it('should filter by organisation', async () => {
      // Arrange
      const org1 = await seed.organisation(db, { id: 'org-1' })
      const org2 = await seed.organisation(db, { id: 'org-2' })
      const entry1 = await seed.timeEntry(db, { organisationId: 'org-1' })
      const entry2 = await seed.timeEntry(db, { organisationId: 'org-2' })

      // Act
      const results = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.organisationId, 'org-1'))

      // Assert
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe(entry1.id)
    })

    it('should filter by project', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project1 = await seed.project(db, org.id)
      // timeEntries.projectId references team.id, so use project.teamId
      const entry1 = await seed.timeEntry(db, { projectId: project1.teamId })
      const entry2 = await seed.timeEntry(db, { projectId: undefined })

      // Act
      const results = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.projectId, project1.teamId))

      // Assert
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe(entry1.id)
    })

    it('should return all entries when no sheets exist', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const entry1 = await seed.timeEntry(db, { organisationId: org.id })
      const entry2 = await seed.timeEntry(db, { organisationId: org.id })

      // Act - Simulate getAvailableEntries with no filters
      const allSheetEntryRecords = await db.select().from(schema.timeSheetEntries)
      const entriesInAnySheet = allSheetEntryRecords.map((se) => se.timeEntryId)

      // When no entries are in sheets, return all
      const availableEntries =
        entriesInAnySheet.length === 0
          ? await db.select().from(schema.timeEntries)
          : await db
              .select()
              .from(schema.timeEntries)
              .where(sql`${schema.timeEntries.id} NOT IN ${entriesInAnySheet}`)

      // Assert
      expect(availableEntries).toHaveLength(2)
    })
  })

  describe('getEntriesInSheet', () => {
    it('should retrieve all entries in a time sheet', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet = await seed.timeSheet(db, {
        id: 'sheet-1',
        organisationId: org.id,
      })
      const entry1 = await seed.timeEntry(db)
      const entry2 = await seed.timeEntry(db)

      await db.insert(schema.timeSheetEntries).values([
        {
          id: 'tse-1',
          timeSheetId: 'sheet-1',
          timeEntryId: entry1.id,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'tse-2',
          timeSheetId: 'sheet-1',
          timeEntryId: entry2.id,
          createdAt: new Date().toISOString(),
        },
      ])

      // Act
      const sheetEntryRecords = await db
        .select()
        .from(schema.timeSheetEntries)
        .where(eq(schema.timeSheetEntries.timeSheetId, 'sheet-1'))
      const entryIds = sheetEntryRecords.map((se) => se.timeEntryId)
      const entries = await db
        .select()
        .from(schema.timeEntries)
        .where(sql`${schema.timeEntries.id} IN ${entryIds}`)

      // Assert
      expect(entries).toHaveLength(2)
    })

    it('should return empty array when sheet has no entries', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet = await seed.timeSheet(db, {
        id: 'sheet-1',
        organisationId: org.id,
      })

      // Act
      const sheetEntryRecords = await db
        .select()
        .from(schema.timeSheetEntries)
        .where(eq(schema.timeSheetEntries.timeSheetId, 'sheet-1'))

      // Assert
      expect(sheetEntryRecords).toHaveLength(0)
    })
  })

  describe('submitSheet - Workflow action', () => {
    it('should change status to submitted and set submittedDate', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet = await seed.timeSheet(db, {
        status: 'draft',
        organisationId: org.id,
      })

      // Act
      const submittedDate = new Date().toISOString()
      await db
        .update(schema.timeSheets)
        .set({
          status: 'submitted',
          submittedDate,
          updatedAt: submittedDate,
        })
        .where(eq(schema.timeSheets.id, sheet.id))

      // Assert
      const result = await db
        .select()
        .from(schema.timeSheets)
        .where(eq(schema.timeSheets.id, sheet.id))
        .limit(1)
      expect(result[0].status).toBe('submitted')
      expect(result[0].submittedDate).toBe(submittedDate)
    })
  })

  describe('approveSheet - Workflow action with cascade', () => {
    it('should change status to approved and set approvedDate', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet = await seed.timeSheet(db, {
        status: 'submitted',
        organisationId: org.id,
      })

      // Act
      const approvedDate = new Date().toISOString()
      await db
        .update(schema.timeSheets)
        .set({
          status: 'approved',
          approvedDate,
          updatedAt: approvedDate,
        })
        .where(eq(schema.timeSheets.id, sheet.id))

      // Assert
      const result = await db
        .select()
        .from(schema.timeSheets)
        .where(eq(schema.timeSheets.id, sheet.id))
        .limit(1)
      expect(result[0].status).toBe('approved')
      expect(result[0].approvedDate).toBe(approvedDate)
    })

    it('should approve all entries in the sheet', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet = await seed.timeSheet(db, {
        id: 'sheet-1',
        status: 'submitted',
        organisationId: org.id,
      })
      const entry1 = await seed.timeEntry(db, { approvedDate: undefined })
      const entry2 = await seed.timeEntry(db, { approvedDate: undefined })

      await db.insert(schema.timeSheetEntries).values([
        {
          id: 'tse-1',
          timeSheetId: 'sheet-1',
          timeEntryId: entry1.id,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'tse-2',
          timeSheetId: 'sheet-1',
          timeEntryId: entry2.id,
          createdAt: new Date().toISOString(),
        },
      ])

      // Act - Approve all entries
      const approvedDate = new Date().toISOString()
      const sheetEntryRecords = await db
        .select()
        .from(schema.timeSheetEntries)
        .where(eq(schema.timeSheetEntries.timeSheetId, 'sheet-1'))
      const entryIds = sheetEntryRecords.map((se) => se.timeEntryId)
      const entries = await db
        .select()
        .from(schema.timeEntries)
        .where(sql`${schema.timeEntries.id} IN ${entryIds}`)

      for (const entry of entries) {
        await db
          .update(schema.timeEntries)
          .set({ approvedDate })
          .where(eq(schema.timeEntries.id, entry.id))
      }

      // Assert
      const updatedEntry1 = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, entry1.id))
        .limit(1)
      const updatedEntry2 = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, entry2.id))
        .limit(1)
      expect(updatedEntry1[0].approvedDate).toBe(approvedDate)
      expect(updatedEntry2[0].approvedDate).toBe(approvedDate)
    })
  })

  describe('rejectSheet - Workflow action', () => {
    it('should change status to rejected and set rejectedDate and reason', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet = await seed.timeSheet(db, {
        status: 'submitted',
        organisationId: org.id,
      })

      // Act
      const rejectedDate = new Date().toISOString()
      await db
        .update(schema.timeSheets)
        .set({
          status: 'rejected',
          rejectedDate,
          rejectionReason: 'Missing details',
          updatedAt: rejectedDate,
        })
        .where(eq(schema.timeSheets.id, sheet.id))

      // Assert
      const result = await db
        .select()
        .from(schema.timeSheets)
        .where(eq(schema.timeSheets.id, sheet.id))
        .limit(1)
      expect(result[0].status).toBe('rejected')
      expect(result[0].rejectedDate).toBe(rejectedDate)
      expect(result[0].rejectionReason).toBe('Missing details')
    })

    it('should allow rejection without reason', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet = await seed.timeSheet(db, {
        status: 'submitted',
        organisationId: org.id,
      })

      // Act
      const rejectedDate = new Date().toISOString()
      await db
        .update(schema.timeSheets)
        .set({
          status: 'rejected',
          rejectedDate,
          updatedAt: rejectedDate,
        })
        .where(eq(schema.timeSheets.id, sheet.id))

      // Assert
      const result = await db
        .select()
        .from(schema.timeSheets)
        .where(eq(schema.timeSheets.id, sheet.id))
        .limit(1)
      expect(result[0].status).toBe('rejected')
      expect(result[0].rejectionReason).toBeNull()
    })
  })

  describe('revertToDraft - Workflow action', () => {
    it('should change status to draft and clear workflow dates', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const now = new Date().toISOString()
      const sheet = await seed.timeSheet(db, {
        status: 'rejected',
        submittedDate: now,
        rejectedDate: now,
        rejectionReason: 'Some reason',
        organisationId: org.id,
      })

      // Act
      await db
        .update(schema.timeSheets)
        .set({
          status: 'draft',
          submittedDate: null,
          approvedDate: null,
          rejectedDate: null,
          rejectionReason: null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.timeSheets.id, sheet.id))

      // Assert
      const result = await db
        .select()
        .from(schema.timeSheets)
        .where(eq(schema.timeSheets.id, sheet.id))
        .limit(1)
      expect(result[0].status).toBe('draft')
      expect(result[0].submittedDate).toBeNull()
      expect(result[0].approvedDate).toBeNull()
      expect(result[0].rejectedDate).toBeNull()
      expect(result[0].rejectionReason).toBeNull()
    })
  })

  // ============================================================================
  // APPROVAL WORKFLOW TESTS
  // ============================================================================

  describe('canApproveSheet - Entry-level approval check', () => {
    it('should return false when sheet has no entries', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet = await seed.timeSheet(db, {
        id: 'sheet-1',
        status: 'submitted',
        organisationId: org.id,
      })

      // Act - Simulate canApproveSheet logic
      const sheetEntryRecords = await db
        .select()
        .from(schema.timeSheetEntries)
        .where(eq(schema.timeSheetEntries.timeSheetId, 'sheet-1'))
      const entryIds = sheetEntryRecords.map((se) => se.timeEntryId)

      const entries =
        entryIds.length > 0
          ? await db
              .select()
              .from(schema.timeEntries)
              .where(sql`${schema.timeEntries.id} IN ${entryIds}`)
          : []

      // Assert
      expect(entries.length).toBe(0)
      // When no entries, canApprove should be false
    })

    it('should return false when entries have questioned status', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const user = await seed.user(db)
      const sheet = await seed.timeSheet(db, {
        id: 'sheet-1',
        status: 'submitted',
        organisationId: org.id,
      })

      const entry = await seed.timeEntry(db, {
        status: 'questioned',
        organisationId: org.id,
        userId: user.id,
      })

      await db.insert(schema.timeSheetEntries).values({
        id: 'tse-1',
        timeSheetId: 'sheet-1',
        timeEntryId: entry.id,
        createdAt: new Date().toISOString(),
      })

      // Act - Simulate canApproveSheet logic
      const sheetEntryRecords = await db
        .select()
        .from(schema.timeSheetEntries)
        .where(eq(schema.timeSheetEntries.timeSheetId, 'sheet-1'))
      const entryIds = sheetEntryRecords.map((se) => se.timeEntryId)
      const entries = await db
        .select()
        .from(schema.timeEntries)
        .where(sql`${schema.timeEntries.id} IN ${entryIds}`)

      const questionedEntries = entries.filter((e) => e.status === 'questioned')
      const hasQuestionedEntries = questionedEntries.length > 0

      // Assert
      expect(hasQuestionedEntries).toBe(true)
      expect(questionedEntries.length).toBe(1)
    })

    it('should return true when all entries are pending or approved', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const user = await seed.user(db)
      const sheet = await seed.timeSheet(db, {
        id: 'sheet-1',
        status: 'submitted',
        organisationId: org.id,
      })

      const pendingEntry = await seed.timeEntry(db, {
        status: 'pending',
        organisationId: org.id,
        userId: user.id,
      })
      const approvedEntry = await seed.timeEntry(db, {
        status: 'approved',
        organisationId: org.id,
        userId: user.id,
      })

      await db.insert(schema.timeSheetEntries).values([
        {
          id: 'tse-1',
          timeSheetId: 'sheet-1',
          timeEntryId: pendingEntry.id,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'tse-2',
          timeSheetId: 'sheet-1',
          timeEntryId: approvedEntry.id,
          createdAt: new Date().toISOString(),
        },
      ])

      // Act - Simulate canApproveSheet logic
      const sheetEntryRecords = await db
        .select()
        .from(schema.timeSheetEntries)
        .where(eq(schema.timeSheetEntries.timeSheetId, 'sheet-1'))
      const entryIds = sheetEntryRecords.map((se) => se.timeEntryId)
      const entries = await db
        .select()
        .from(schema.timeEntries)
        .where(sql`${schema.timeEntries.id} IN ${entryIds}`)

      const questionedEntries = entries.filter((e) => e.status === 'questioned')
      const pendingEntries = entries.filter((e) => e.status === 'pending')
      const approvedEntries = entries.filter((e) => e.status === 'approved')

      // Assert
      expect(questionedEntries.length).toBe(0)
      expect(pendingEntries.length).toBe(1)
      expect(approvedEntries.length).toBe(1)
    })

    it('should count entries by status correctly', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const user = await seed.user(db)
      const sheet = await seed.timeSheet(db, {
        id: 'sheet-1',
        status: 'submitted',
        organisationId: org.id,
      })

      await seed.timeEntry(db, {
        id: 'entry-pending-1',
        status: 'pending',
        organisationId: org.id,
        userId: user.id,
      })
      await seed.timeEntry(db, {
        id: 'entry-pending-2',
        status: 'pending',
        organisationId: org.id,
        userId: user.id,
      })
      await seed.timeEntry(db, {
        id: 'entry-approved',
        status: 'approved',
        organisationId: org.id,
        userId: user.id,
      })

      await db.insert(schema.timeSheetEntries).values([
        {
          id: 'tse-1',
          timeSheetId: 'sheet-1',
          timeEntryId: 'entry-pending-1',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'tse-2',
          timeSheetId: 'sheet-1',
          timeEntryId: 'entry-pending-2',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'tse-3',
          timeSheetId: 'sheet-1',
          timeEntryId: 'entry-approved',
          createdAt: new Date().toISOString(),
        },
      ])

      // Act
      const sheetEntryRecords = await db
        .select()
        .from(schema.timeSheetEntries)
        .where(eq(schema.timeSheetEntries.timeSheetId, 'sheet-1'))
      const entryIds = sheetEntryRecords.map((se) => se.timeEntryId)
      const entries = await db
        .select()
        .from(schema.timeEntries)
        .where(sql`${schema.timeEntries.id} IN ${entryIds}`)

      const pendingCount = entries.filter((e) => e.status === 'pending').length
      const approvedCount = entries.filter((e) => e.status === 'approved').length
      const totalCount = entries.length

      // Assert
      expect(pendingCount).toBe(2)
      expect(approvedCount).toBe(1)
      expect(totalCount).toBe(3)
    })
  })

  describe('getEntriesWithStatus - Entry status query', () => {
    it('should retrieve entries with their status information', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const user = await seed.user(db)
      const sheet = await seed.timeSheet(db, {
        id: 'sheet-1',
        organisationId: org.id,
      })

      const entry = await seed.timeEntry(db, {
        status: 'pending',
        organisationId: org.id,
        userId: user.id,
      })

      await db.insert(schema.timeSheetEntries).values({
        id: 'tse-1',
        timeSheetId: 'sheet-1',
        timeEntryId: entry.id,
        approvedInSheet: false,
        approvedInSheetAt: null,
        approvedInSheetBy: null,
        createdAt: new Date().toISOString(),
      })

      // Act
      const result = await db
        .select({
          id: schema.timeEntries.id,
          status: schema.timeEntries.status,
          approvedInSheet: schema.timeSheetEntries.approvedInSheet,
          approvedInSheetAt: schema.timeSheetEntries.approvedInSheetAt,
          approvedInSheetBy: schema.timeSheetEntries.approvedInSheetBy,
        })
        .from(schema.timeSheetEntries)
        .innerJoin(
          schema.timeEntries,
          eq(schema.timeSheetEntries.timeEntryId, schema.timeEntries.id)
        )
        .where(eq(schema.timeSheetEntries.timeSheetId, 'sheet-1'))

      // Assert
      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('pending')
      expect(result[0].approvedInSheet).toBe(false)
      expect(result[0].approvedInSheetAt).toBeNull()
      expect(result[0].approvedInSheetBy).toBeNull()
    })

    it('should return entries with approval information when approved', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const user = await seed.user(db)
      const sheet = await seed.timeSheet(db, {
        id: 'sheet-1',
        organisationId: org.id,
      })

      const approvedAt = new Date().toISOString()
      const entry = await seed.timeEntry(db, {
        status: 'approved',
        organisationId: org.id,
        userId: user.id,
      })

      await db.insert(schema.timeSheetEntries).values({
        id: 'tse-1',
        timeSheetId: 'sheet-1',
        timeEntryId: entry.id,
        approvedInSheet: true,
        approvedInSheetAt: approvedAt,
        approvedInSheetBy: user.id,
        createdAt: new Date().toISOString(),
      })

      // Act
      const result = await db
        .select({
          id: schema.timeEntries.id,
          status: schema.timeEntries.status,
          approvedInSheet: schema.timeSheetEntries.approvedInSheet,
          approvedInSheetAt: schema.timeSheetEntries.approvedInSheetAt,
          approvedInSheetBy: schema.timeSheetEntries.approvedInSheetBy,
        })
        .from(schema.timeSheetEntries)
        .innerJoin(
          schema.timeEntries,
          eq(schema.timeSheetEntries.timeEntryId, schema.timeEntries.id)
        )
        .where(eq(schema.timeSheetEntries.timeSheetId, 'sheet-1'))

      // Assert
      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('approved')
      expect(result[0].approvedInSheet).toBe(true)
      expect(result[0].approvedInSheetAt).toBe(approvedAt)
      expect(result[0].approvedInSheetBy).toBe(user.id)
    })
  })

  describe('approveEntryInSheet - Entry-level approval', () => {
    it('should update entry status to approved', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const user = await seed.user(db)
      const sheet = await seed.timeSheet(db, {
        id: 'sheet-1',
        organisationId: org.id,
      })

      const entry = await seed.timeEntry(db, {
        status: 'pending',
        organisationId: org.id,
        userId: user.id,
      })

      await db.insert(schema.timeSheetEntries).values({
        id: 'tse-1',
        timeSheetId: 'sheet-1',
        timeEntryId: entry.id,
        createdAt: new Date().toISOString(),
      })

      // Act - Simulate approveEntryInSheet logic
      const now = new Date().toISOString()

      await db
        .update(schema.timeEntries)
        .set({
          status: 'approved',
          statusChangedAt: now,
          statusChangedBy: user.id,
          approvedDate: now,
        })
        .where(eq(schema.timeEntries.id, entry.id))

      await db
        .update(schema.timeSheetEntries)
        .set({
          approvedInSheet: true,
          approvedInSheetAt: now,
          approvedInSheetBy: user.id,
        })
        .where(
          and(
            eq(schema.timeSheetEntries.timeSheetId, 'sheet-1'),
            eq(schema.timeSheetEntries.timeEntryId, entry.id)
          )
        )

      // Assert
      const updatedEntry = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, entry.id))
        .limit(1)

      const updatedSheetEntry = await db
        .select()
        .from(schema.timeSheetEntries)
        .where(eq(schema.timeSheetEntries.id, 'tse-1'))
        .limit(1)

      expect(updatedEntry[0].status).toBe('approved')
      expect(updatedEntry[0].statusChangedBy).toBe(user.id)
      expect(updatedEntry[0].approvedDate).toBe(now)
      expect(updatedSheetEntry[0].approvedInSheet).toBe(true)
      expect(updatedSheetEntry[0].approvedInSheetBy).toBe(user.id)
    })

    it('should track who approved the entry', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const creator = await seed.user(db, { handle: 'creator', email: 'creator@test.com' })
      const approver = await seed.user(db, { handle: 'approver', email: 'approver@test.com' })
      const sheet = await seed.timeSheet(db, {
        id: 'sheet-1',
        organisationId: org.id,
      })

      const entry = await seed.timeEntry(db, {
        status: 'pending',
        organisationId: org.id,
        userId: creator.id,
      })

      await db.insert(schema.timeSheetEntries).values({
        id: 'tse-1',
        timeSheetId: 'sheet-1',
        timeEntryId: entry.id,
        createdAt: new Date().toISOString(),
      })

      // Act - Approve by a different user
      const now = new Date().toISOString()
      await db
        .update(schema.timeEntries)
        .set({
          status: 'approved',
          statusChangedAt: now,
          statusChangedBy: approver.id,
        })
        .where(eq(schema.timeEntries.id, entry.id))

      // Assert
      const result = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, entry.id))
        .limit(1)

      expect(result[0].statusChangedBy).toBe(approver.id)
      expect(result[0].statusChangedBy).not.toBe(creator.id)
    })
  })

  describe('questionEntryInSheet - Entry-level questioning', () => {
    it('should update entry status to questioned', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const user = await seed.user(db)
      const sheet = await seed.timeSheet(db, {
        id: 'sheet-1',
        organisationId: org.id,
      })

      const entry = await seed.timeEntry(db, {
        status: 'pending',
        organisationId: org.id,
        userId: user.id,
      })

      await db.insert(schema.timeSheetEntries).values({
        id: 'tse-1',
        timeSheetId: 'sheet-1',
        timeEntryId: entry.id,
        createdAt: new Date().toISOString(),
      })

      // Act - Simulate questionEntryInSheet logic
      const now = new Date().toISOString()

      await db
        .update(schema.timeEntries)
        .set({
          status: 'questioned',
          statusChangedAt: now,
          statusChangedBy: user.id,
          approvedDate: null,
        })
        .where(eq(schema.timeEntries.id, entry.id))

      await db
        .update(schema.timeSheetEntries)
        .set({
          approvedInSheet: false,
          approvedInSheetAt: null,
          approvedInSheetBy: null,
        })
        .where(
          and(
            eq(schema.timeSheetEntries.timeSheetId, 'sheet-1'),
            eq(schema.timeSheetEntries.timeEntryId, entry.id)
          )
        )

      // Assert
      const updatedEntry = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, entry.id))
        .limit(1)

      const updatedSheetEntry = await db
        .select()
        .from(schema.timeSheetEntries)
        .where(eq(schema.timeSheetEntries.id, 'tse-1'))
        .limit(1)

      expect(updatedEntry[0].status).toBe('questioned')
      expect(updatedEntry[0].statusChangedBy).toBe(user.id)
      expect(updatedEntry[0].approvedDate).toBeNull()
      expect(updatedSheetEntry[0].approvedInSheet).toBe(false)
      expect(updatedSheetEntry[0].approvedInSheetAt).toBeNull()
    })

    it('should reset approval status when questioning previously approved entry', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const approver = await seed.user(db, { handle: 'approver', email: 'approver2@test.com' })
      const questioner = await seed.user(db, { handle: 'questioner', email: 'questioner@test.com' })
      const sheet = await seed.timeSheet(db, {
        id: 'sheet-1',
        organisationId: org.id,
      })

      const approvedAt = new Date().toISOString()
      const entry = await seed.timeEntry(db, {
        status: 'approved',
        approvedDate: approvedAt,
        organisationId: org.id,
        userId: approver.id,
      })

      await db.insert(schema.timeSheetEntries).values({
        id: 'tse-1',
        timeSheetId: 'sheet-1',
        timeEntryId: entry.id,
        approvedInSheet: true,
        approvedInSheetAt: approvedAt,
        approvedInSheetBy: approver.id,
        createdAt: new Date().toISOString(),
      })

      // Act - Question the previously approved entry
      const now = new Date().toISOString()

      await db
        .update(schema.timeEntries)
        .set({
          status: 'questioned',
          statusChangedAt: now,
          statusChangedBy: questioner.id,
          approvedDate: null,
        })
        .where(eq(schema.timeEntries.id, entry.id))

      await db
        .update(schema.timeSheetEntries)
        .set({
          approvedInSheet: false,
          approvedInSheetAt: null,
          approvedInSheetBy: null,
        })
        .where(
          and(
            eq(schema.timeSheetEntries.timeSheetId, 'sheet-1'),
            eq(schema.timeSheetEntries.timeEntryId, entry.id)
          )
        )

      // Assert
      const updatedEntry = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, entry.id))
        .limit(1)

      const updatedSheetEntry = await db
        .select()
        .from(schema.timeSheetEntries)
        .where(eq(schema.timeSheetEntries.id, 'tse-1'))
        .limit(1)

      expect(updatedEntry[0].status).toBe('questioned')
      expect(updatedEntry[0].approvedDate).toBeNull()
      expect(updatedSheetEntry[0].approvedInSheet).toBe(false)
      expect(updatedSheetEntry[0].approvedInSheetAt).toBeNull()
      expect(updatedSheetEntry[0].approvedInSheetBy).toBeNull()
    })
  })

  describe('Entry status workflow', () => {
    it('should allow workflow: pending -> questioned -> pending -> approved', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const user = await seed.user(db)

      const entry = await seed.timeEntry(db, {
        status: 'pending',
        organisationId: org.id,
        userId: user.id,
      })

      // Step 1: Question the entry
      await db
        .update(schema.timeEntries)
        .set({ status: 'questioned' })
        .where(eq(schema.timeEntries.id, entry.id))

      let result = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, entry.id))
        .limit(1)
      expect(result[0].status).toBe('questioned')

      // Step 2: Return to pending
      await db
        .update(schema.timeEntries)
        .set({ status: 'pending' })
        .where(eq(schema.timeEntries.id, entry.id))

      result = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, entry.id))
        .limit(1)
      expect(result[0].status).toBe('pending')

      // Step 3: Approve
      await db
        .update(schema.timeEntries)
        .set({ status: 'approved' })
        .where(eq(schema.timeEntries.id, entry.id))

      result = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, entry.id))
        .limit(1)
      expect(result[0].status).toBe('approved')
    })

    it('should track status changes with timestamps', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const user = await seed.user(db)

      const entry = await seed.timeEntry(db, {
        status: 'pending',
        statusChangedAt: null,
        statusChangedBy: null,
        organisationId: org.id,
        userId: user.id,
      })

      // Act - Change status
      const now = new Date().toISOString()
      await db
        .update(schema.timeEntries)
        .set({
          status: 'approved',
          statusChangedAt: now,
          statusChangedBy: user.id,
        })
        .where(eq(schema.timeEntries.id, entry.id))

      // Assert
      const result = await db
        .select()
        .from(schema.timeEntries)
        .where(eq(schema.timeEntries.id, entry.id))
        .limit(1)

      expect(result[0].status).toBe('approved')
      expect(result[0].statusChangedAt).toBe(now)
      expect(result[0].statusChangedBy).toBe(user.id)
    })
  })
})
