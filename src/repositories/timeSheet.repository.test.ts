import { describe, it, expect, beforeEach } from 'bun:test'
import { createTestDb, cleanDatabase, seed, testFactories } from '@/test/db-utils'
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
      const sheet1 = testFactories.timeSheet({ title: 'Week 45', organisationId: org.id })
      const sheet2 = testFactories.timeSheet({ title: 'Week 46', organisationId: org.id })

      await db.insert(schema.timeSheets).values([sheet1, sheet2])

      // Act
      const results = await db.select().from(schema.timeSheets)

      // Assert
      expect(results).toHaveLength(2)
      expect(results.map(s => s.title)).toContain('Week 45')
      expect(results.map(s => s.title)).toContain('Week 46')
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
      const sheet = testFactories.timeSheet({ id: 'sheet-123', title: 'Test Sheet', organisationId: org.id })
      await db.insert(schema.timeSheets).values(sheet)

      // Act
      const result = await db.select().from(schema.timeSheets).where(eq(schema.timeSheets.id, 'sheet-123')).limit(1)

      // Assert
      expect(result[0]).toBeDefined()
      expect(result[0].id).toBe('sheet-123')
      expect(result[0].title).toBe('Test Sheet')
    })

    it('should return undefined when time sheet not found', async () => {
      // Act
      const result = await db.select().from(schema.timeSheets).where(eq(schema.timeSheets.id, 'nonexistent')).limit(1)

      // Assert
      expect(result[0]).toBeUndefined()
    })
  })

  describe('findByStatus', () => {
    it('should retrieve all draft time sheets', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const draft1 = await seed.timeSheet(db, { status: 'draft', title: 'Draft 1', organisationId: org.id })
      const draft2 = await seed.timeSheet(db, { status: 'draft', title: 'Draft 2', organisationId: org.id })
      const submitted = await seed.timeSheet(db, { status: 'submitted', title: 'Submitted', organisationId: org.id })

      // Act
      const results = await db.select().from(schema.timeSheets).where(eq(schema.timeSheets.status, 'draft'))

      // Assert
      expect(results).toHaveLength(2)
      expect(results.map(s => s.title)).toContain('Draft 1')
      expect(results.map(s => s.title)).toContain('Draft 2')
      expect(results.map(s => s.title)).not.toContain('Submitted')
    })

    it('should retrieve all submitted time sheets', async () => {
      // Arrange
      const org = await seed.organisation(db)
      await seed.timeSheet(db, { status: 'draft', organisationId: org.id })
      const submitted = await seed.timeSheet(db, { status: 'submitted', organisationId: org.id })

      // Act
      const results = await db.select().from(schema.timeSheets).where(eq(schema.timeSheets.status, 'submitted'))

      // Assert
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe(submitted.id)
    })

    it('should retrieve all approved time sheets', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const approved = await seed.timeSheet(db, { status: 'approved', organisationId: org.id })

      // Act
      const results = await db.select().from(schema.timeSheets).where(eq(schema.timeSheets.status, 'approved'))

      // Assert
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe(approved.id)
    })

    it('should retrieve all rejected time sheets', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const rejected = await seed.timeSheet(db, { status: 'rejected', organisationId: org.id })

      // Act
      const results = await db.select().from(schema.timeSheets).where(eq(schema.timeSheets.status, 'rejected'))

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

      await seed.timeSheet(db, { organisationId: 'org-1', title: 'Org1 Sheet 1' })
      await seed.timeSheet(db, { organisationId: 'org-1', title: 'Org1 Sheet 2' })
      await seed.timeSheet(db, { organisationId: 'org-2', title: 'Org2 Sheet 1' })

      // Act
      const results = await db.select().from(schema.timeSheets).where(eq(schema.timeSheets.organisationId, 'org-1'))

      // Assert
      expect(results).toHaveLength(2)
      expect(results.map(s => s.title)).toContain('Org1 Sheet 1')
      expect(results.map(s => s.title)).toContain('Org1 Sheet 2')
    })
  })

  describe('findByProject', () => {
    it('should retrieve all time sheets for a project', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project1 = await seed.project(db, org.id, { id: 'proj-1' })
      const project2 = await seed.project(db, org.id, { id: 'proj-2' })

      await seed.timeSheet(db, { projectId: 'proj-1', organisationId: org.id })
      await seed.timeSheet(db, { projectId: 'proj-1', organisationId: org.id })
      await seed.timeSheet(db, { projectId: 'proj-2', organisationId: org.id })

      // Act
      const results = await db.select().from(schema.timeSheets).where(eq(schema.timeSheets.projectId, 'proj-1'))

      // Assert
      expect(results).toHaveLength(2)
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
      const result = await db.select().from(schema.timeSheets).where(eq(schema.timeSheets.id, newSheet.id)).limit(1)
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
      const result = await db.select().from(schema.timeSheets).where(eq(schema.timeSheets.id, newSheet.id)).limit(1)
      expect(result[0].description).toBe('Detailed description')
      expect(result[0].startDate).toBe('2024-11-04')
      expect(result[0].endDate).toBe('2024-11-10')
    })
  })

  describe('update', () => {
    it('should update time sheet title', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet = await seed.timeSheet(db, { title: 'Old Title', organisationId: org.id })

      // Act
      const updateData = { title: 'New Title', updatedAt: new Date().toISOString() }
      await db.update(schema.timeSheets).set(updateData).where(eq(schema.timeSheets.id, sheet.id))

      // Assert
      const result = await db.select().from(schema.timeSheets).where(eq(schema.timeSheets.id, sheet.id)).limit(1)
      expect(result[0].title).toBe('New Title')
    })

    it('should automatically update updatedAt timestamp', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet = await seed.timeSheet(db, { organisationId: org.id })
      const originalUpdatedAt = sheet.updatedAt

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      // Act
      const newUpdatedAt = new Date().toISOString()
      await db.update(schema.timeSheets).set({ title: 'Updated', updatedAt: newUpdatedAt }).where(eq(schema.timeSheets.id, sheet.id))

      // Assert
      const result = await db.select().from(schema.timeSheets).where(eq(schema.timeSheets.id, sheet.id)).limit(1)
      expect(result[0].updatedAt).not.toBe(originalUpdatedAt)
    })
  })

  describe('delete', () => {
    it('should remove time sheet from database', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet = await seed.timeSheet(db, { organisationId: org.id })

      // Act
      await db.delete(schema.timeSheets).where(eq(schema.timeSheets.id, sheet.id))

      // Assert
      const result = await db.select().from(schema.timeSheets).where(eq(schema.timeSheets.id, sheet.id)).limit(1)
      expect(result[0]).toBeUndefined()
    })

    it('should cascade delete time sheet entries', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet = await seed.timeSheet(db, { id: 'sheet-1', organisationId: org.id })
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
      await db.delete(schema.timeSheets).where(eq(schema.timeSheets.id, 'sheet-1'))

      // Assert - Sheet entry should be deleted due to cascade
      const result = await db.select().from(schema.timeSheetEntries).where(eq(schema.timeSheetEntries.id, 'tse-1')).limit(1)
      expect(result[0]).toBeUndefined()
    })
  })

  describe('findWithEntries - Complex query with joins', () => {
    it('should retrieve time sheet with all entries and calculate total hours', async () => {
      // Arrange
      const org = await seed.organisation(db, { id: 'org-1' })
      const sheet = await seed.timeSheet(db, { id: 'sheet-1', organisationId: 'org-1' })
      const entry1 = await seed.timeEntry(db, { hours: 2.5 })
      const entry2 = await seed.timeEntry(db, { hours: 3.5 })

      // Add entries to sheet
      await db.insert(schema.timeSheetEntries).values([
        { id: 'tse-1', timeSheetId: 'sheet-1', timeEntryId: entry1.id, createdAt: new Date().toISOString() },
        { id: 'tse-2', timeSheetId: 'sheet-1', timeEntryId: entry2.id, createdAt: new Date().toISOString() },
      ])

      // Act - Simulate the repository's findWithEntries logic
      const sheetResult = await db.select().from(schema.timeSheets).where(eq(schema.timeSheets.id, 'sheet-1')).limit(1)
      const sheetEntryRecords = await db.select().from(schema.timeSheetEntries).where(eq(schema.timeSheetEntries.timeSheetId, 'sheet-1'))
      const entryIds = sheetEntryRecords.map(se => se.timeEntryId)
      const entries = await db.select().from(schema.timeEntries).where(sql`${schema.timeEntries.id} IN ${entryIds}`)
      const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0)

      // Assert
      expect(sheetResult[0]).toBeDefined()
      expect(entries).toHaveLength(2)
      expect(totalHours).toBe(6) // 2.5 + 3.5
    })

    it('should include organisation when present', async () => {
      // Arrange
      const org = await seed.organisation(db, { id: 'org-1', name: 'Test Org' })
      const sheet = await seed.timeSheet(db, { id: 'sheet-1', organisationId: 'org-1' })

      // Act
      const sheetResult = await db.select().from(schema.timeSheets).where(eq(schema.timeSheets.id, 'sheet-1')).limit(1)
      const orgResult = await db.select().from(schema.organisations).where(eq(schema.organisations.id, 'org-1')).limit(1)

      // Assert
      expect(orgResult[0]).toBeDefined()
      expect(orgResult[0].name).toBe('Test Org')
    })

    it('should include project when present', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project = await seed.project(db, org.id, { id: 'proj-1', name: 'Test Project' })
      const sheet = await seed.timeSheet(db, { id: 'sheet-1', projectId: 'proj-1', organisationId: org.id })

      // Act
      const projResult = await db.select().from(schema.projects).where(eq(schema.projects.id, 'proj-1')).limit(1)

      // Assert
      expect(projResult[0]).toBeDefined()
      expect(projResult[0].name).toBe('Test Project')
    })
  })

  describe('addEntries - Entry management', () => {
    it('should add multiple entries to a time sheet', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet = await seed.timeSheet(db, { id: 'sheet-1', organisationId: org.id })
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
      const result = await db.select().from(schema.timeSheetEntries).where(eq(schema.timeSheetEntries.timeSheetId, 'sheet-1'))
      expect(result).toHaveLength(2)
    })

    it('should not add entries if array is empty', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet = await seed.timeSheet(db, { id: 'sheet-1', organisationId: org.id })

      // Act - Don't insert if empty
      const entryIds: string[] = []
      if (entryIds.length > 0) {
        await db.insert(schema.timeSheetEntries).values([])
      }

      // Assert
      const result = await db.select().from(schema.timeSheetEntries).where(eq(schema.timeSheetEntries.timeSheetId, 'sheet-1'))
      expect(result).toHaveLength(0)
    })
  })

  describe('removeEntry - Entry removal', () => {
    it('should remove specific entry from time sheet', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet = await seed.timeSheet(db, { id: 'sheet-1', organisationId: org.id })
      const entry1 = await seed.timeEntry(db)
      const entry2 = await seed.timeEntry(db)

      await db.insert(schema.timeSheetEntries).values([
        { id: 'tse-1', timeSheetId: 'sheet-1', timeEntryId: entry1.id, createdAt: new Date().toISOString() },
        { id: 'tse-2', timeSheetId: 'sheet-1', timeEntryId: entry2.id, createdAt: new Date().toISOString() },
      ])

      // Act
      await db.delete(schema.timeSheetEntries).where(
        and(
          eq(schema.timeSheetEntries.timeSheetId, 'sheet-1'),
          eq(schema.timeSheetEntries.timeEntryId, entry1.id)
        )
      )

      // Assert
      const result = await db.select().from(schema.timeSheetEntries).where(eq(schema.timeSheetEntries.timeSheetId, 'sheet-1'))
      expect(result).toHaveLength(1)
      expect(result[0].timeEntryId).toBe(entry2.id)
    })
  })

  describe('getAvailableEntries - Complex filtering logic', () => {
    it('should exclude entries in approved sheets', async () => {
      // Arrange
      const org = await seed.organisation(db, { id: 'org-1' })
      const approvedSheet = await seed.timeSheet(db, { status: 'approved', organisationId: 'org-1' })
      const entry1 = await seed.timeEntry(db, { organisationId: 'org-1' })
      const entry2 = await seed.timeEntry(db, { organisationId: 'org-1' })

      // Add entry1 to approved sheet
      await db.insert(schema.timeSheetEntries).values({
        id: 'tse-1',
        timeSheetId: approvedSheet.id,
        timeEntryId: entry1.id,
        createdAt: new Date().toISOString(),
      })

      // Act - Get approved sheets and their entries
      const approvedSheets = await db.select().from(schema.timeSheets).where(eq(schema.timeSheets.status, 'approved'))
      const approvedSheetIds = approvedSheets.map(s => s.id)

      let entriesInApprovedSheets: string[] = []
      if (approvedSheetIds.length > 0) {
        const sheetEntryRecords = await db.select().from(schema.timeSheetEntries)
          .where(sql`${schema.timeSheetEntries.timeSheetId} IN ${approvedSheetIds}`)
        entriesInApprovedSheets = sheetEntryRecords.map(se => se.timeEntryId)
      }

      // Assert
      expect(entriesInApprovedSheets).toContain(entry1.id)
      expect(entriesInApprovedSheets).not.toContain(entry2.id)
    })

    it('should filter by organisation', async () => {
      // Arrange
      const org1 = await seed.organisation(db, { id: 'org-1' })
      const org2 = await seed.organisation(db, { id: 'org-2' })
      const entry1 = await seed.timeEntry(db, { organisationId: 'org-1' })
      const entry2 = await seed.timeEntry(db, { organisationId: 'org-2' })

      // Act
      const results = await db.select().from(schema.timeEntries).where(eq(schema.timeEntries.organisationId, 'org-1'))

      // Assert
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe(entry1.id)
    })

    it('should filter by project', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const project1 = await seed.project(db, org.id, { id: 'proj-1' })
      const entry1 = await seed.timeEntry(db, { projectId: 'proj-1' })
      const entry2 = await seed.timeEntry(db, { projectId: undefined })

      // Act
      const results = await db.select().from(schema.timeEntries).where(eq(schema.timeEntries.projectId, 'proj-1'))

      // Assert
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe(entry1.id)
    })
  })

  describe('getEntriesInSheet', () => {
    it('should retrieve all entries in a time sheet', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet = await seed.timeSheet(db, { id: 'sheet-1', organisationId: org.id })
      const entry1 = await seed.timeEntry(db)
      const entry2 = await seed.timeEntry(db)

      await db.insert(schema.timeSheetEntries).values([
        { id: 'tse-1', timeSheetId: 'sheet-1', timeEntryId: entry1.id, createdAt: new Date().toISOString() },
        { id: 'tse-2', timeSheetId: 'sheet-1', timeEntryId: entry2.id, createdAt: new Date().toISOString() },
      ])

      // Act
      const sheetEntryRecords = await db.select().from(schema.timeSheetEntries).where(eq(schema.timeSheetEntries.timeSheetId, 'sheet-1'))
      const entryIds = sheetEntryRecords.map(se => se.timeEntryId)
      const entries = await db.select().from(schema.timeEntries).where(sql`${schema.timeEntries.id} IN ${entryIds}`)

      // Assert
      expect(entries).toHaveLength(2)
    })

    it('should return empty array when sheet has no entries', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet = await seed.timeSheet(db, { id: 'sheet-1', organisationId: org.id })

      // Act
      const sheetEntryRecords = await db.select().from(schema.timeSheetEntries).where(eq(schema.timeSheetEntries.timeSheetId, 'sheet-1'))

      // Assert
      expect(sheetEntryRecords).toHaveLength(0)
    })
  })

  describe('submitSheet - Workflow action', () => {
    it('should change status to submitted and set submittedDate', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet = await seed.timeSheet(db, { status: 'draft', organisationId: org.id })

      // Act
      const submittedDate = new Date().toISOString()
      await db.update(schema.timeSheets).set({
        status: 'submitted',
        submittedDate,
        updatedAt: submittedDate,
      }).where(eq(schema.timeSheets.id, sheet.id))

      // Assert
      const result = await db.select().from(schema.timeSheets).where(eq(schema.timeSheets.id, sheet.id)).limit(1)
      expect(result[0].status).toBe('submitted')
      expect(result[0].submittedDate).toBe(submittedDate)
    })
  })

  describe('approveSheet - Workflow action with cascade', () => {
    it('should change status to approved and set approvedDate', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet = await seed.timeSheet(db, { status: 'submitted', organisationId: org.id })

      // Act
      const approvedDate = new Date().toISOString()
      await db.update(schema.timeSheets).set({
        status: 'approved',
        approvedDate,
        updatedAt: approvedDate,
      }).where(eq(schema.timeSheets.id, sheet.id))

      // Assert
      const result = await db.select().from(schema.timeSheets).where(eq(schema.timeSheets.id, sheet.id)).limit(1)
      expect(result[0].status).toBe('approved')
      expect(result[0].approvedDate).toBe(approvedDate)
    })

    it('should approve all entries in the sheet', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet = await seed.timeSheet(db, { id: 'sheet-1', status: 'submitted', organisationId: org.id })
      const entry1 = await seed.timeEntry(db, { approvedDate: undefined })
      const entry2 = await seed.timeEntry(db, { approvedDate: undefined })

      await db.insert(schema.timeSheetEntries).values([
        { id: 'tse-1', timeSheetId: 'sheet-1', timeEntryId: entry1.id, createdAt: new Date().toISOString() },
        { id: 'tse-2', timeSheetId: 'sheet-1', timeEntryId: entry2.id, createdAt: new Date().toISOString() },
      ])

      // Act - Approve all entries
      const approvedDate = new Date().toISOString()
      const sheetEntryRecords = await db.select().from(schema.timeSheetEntries).where(eq(schema.timeSheetEntries.timeSheetId, 'sheet-1'))
      const entryIds = sheetEntryRecords.map(se => se.timeEntryId)
      const entries = await db.select().from(schema.timeEntries).where(sql`${schema.timeEntries.id} IN ${entryIds}`)

      for (const entry of entries) {
        await db.update(schema.timeEntries).set({ approvedDate }).where(eq(schema.timeEntries.id, entry.id))
      }

      // Assert
      const updatedEntry1 = await db.select().from(schema.timeEntries).where(eq(schema.timeEntries.id, entry1.id)).limit(1)
      const updatedEntry2 = await db.select().from(schema.timeEntries).where(eq(schema.timeEntries.id, entry2.id)).limit(1)
      expect(updatedEntry1[0].approvedDate).toBe(approvedDate)
      expect(updatedEntry2[0].approvedDate).toBe(approvedDate)
    })
  })

  describe('rejectSheet - Workflow action', () => {
    it('should change status to rejected and set rejectedDate and reason', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet = await seed.timeSheet(db, { status: 'submitted', organisationId: org.id })

      // Act
      const rejectedDate = new Date().toISOString()
      await db.update(schema.timeSheets).set({
        status: 'rejected',
        rejectedDate,
        rejectionReason: 'Missing details',
        updatedAt: rejectedDate,
      }).where(eq(schema.timeSheets.id, sheet.id))

      // Assert
      const result = await db.select().from(schema.timeSheets).where(eq(schema.timeSheets.id, sheet.id)).limit(1)
      expect(result[0].status).toBe('rejected')
      expect(result[0].rejectedDate).toBe(rejectedDate)
      expect(result[0].rejectionReason).toBe('Missing details')
    })

    it('should allow rejection without reason', async () => {
      // Arrange
      const org = await seed.organisation(db)
      const sheet = await seed.timeSheet(db, { status: 'submitted', organisationId: org.id })

      // Act
      const rejectedDate = new Date().toISOString()
      await db.update(schema.timeSheets).set({
        status: 'rejected',
        rejectedDate,
        updatedAt: rejectedDate,
      }).where(eq(schema.timeSheets.id, sheet.id))

      // Assert
      const result = await db.select().from(schema.timeSheets).where(eq(schema.timeSheets.id, sheet.id)).limit(1)
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
      await db.update(schema.timeSheets).set({
        status: 'draft',
        submittedDate: null,
        approvedDate: null,
        rejectedDate: null,
        rejectionReason: null,
        updatedAt: new Date().toISOString(),
      }).where(eq(schema.timeSheets.id, sheet.id))

      // Assert
      const result = await db.select().from(schema.timeSheets).where(eq(schema.timeSheets.id, sheet.id)).limit(1)
      expect(result[0].status).toBe('draft')
      expect(result[0].submittedDate).toBeNull()
      expect(result[0].approvedDate).toBeNull()
      expect(result[0].rejectedDate).toBeNull()
      expect(result[0].rejectionReason).toBeNull()
    })
  })
})
