import {
  db,
  timeSheets,
  timeSheetEntries,
  timeEntries,
  organisations,
  projects,
} from '@/db'
import { eq, sql, and, notInArray } from 'drizzle-orm'
import type { TimeSheet, TimeEntry } from '@/schemas'
import type { TimeSheetWithEntries } from '@/types'

export const timeSheetRepository = {
  // Basic CRUD operations
  async findAll(): Promise<TimeSheet[]> {
    return await db.select().from(timeSheets)
  },

  async findById(id: string): Promise<TimeSheet | undefined> {
    const result = await db
      .select()
      .from(timeSheets)
      .where(eq(timeSheets.id, id))
      .limit(1)
    return result[0]
  },

  async findByStatus(
    status: 'draft' | 'submitted' | 'approved' | 'rejected'
  ): Promise<TimeSheet[]> {
    return await db
      .select()
      .from(timeSheets)
      .where(eq(timeSheets.status, status))
  },

  async findByOrganisation(organisationId: string): Promise<TimeSheet[]> {
    return await db
      .select()
      .from(timeSheets)
      .where(eq(timeSheets.organisationId, organisationId))
  },

  async findByProject(projectId: string): Promise<TimeSheet[]> {
    return await db
      .select()
      .from(timeSheets)
      .where(eq(timeSheets.projectId, projectId))
  },

  async create(sheet: TimeSheet): Promise<TimeSheet> {
    await db.insert(timeSheets).values(sheet)
    return sheet
  },

  async update(id: string, data: Partial<TimeSheet>): Promise<void> {
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString(),
    }
    await db.update(timeSheets).set(updateData).where(eq(timeSheets.id, id))
  },

  async delete(id: string): Promise<void> {
    // Cascade delete will handle time_sheet_entries
    await db.delete(timeSheets).where(eq(timeSheets.id, id))
  },

  // Complex queries
  async findWithEntries(id: string): Promise<TimeSheetWithEntries | undefined> {
    const sheet = await this.findById(id)
    if (!sheet) return undefined

    // Get entries in this sheet
    const sheetEntryRecords = await db
      .select()
      .from(timeSheetEntries)
      .where(eq(timeSheetEntries.timeSheetId, id))

    const entryIds = sheetEntryRecords.map((se) => se.timeEntryId)

    let entries: TimeEntry[] = []
    if (entryIds.length > 0) {
      entries = await db
        .select()
        .from(timeEntries)
        .where(sql`${timeEntries.id} IN ${entryIds}`)
    }

    const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0)

    // Get organisation and project if they exist
    let organisation = undefined
    let project = undefined

    if (sheet.organisationId) {
      const orgResult = await db
        .select()
        .from(organisations)
        .where(eq(organisations.id, sheet.organisationId))
        .limit(1)
      organisation = orgResult[0]
    }

    if (sheet.projectId) {
      const projResult = await db
        .select()
        .from(projects)
        .where(eq(projects.id, sheet.projectId))
        .limit(1)
      project = projResult[0]
    }

    return {
      timeSheet: sheet,
      entries,
      totalHours,
      organisation,
      project,
    }
  },

  // Entry management
  async addEntries(sheetId: string, entryIds: string[]): Promise<void> {
    const now = new Date().toISOString()
    const entries = entryIds.map((entryId) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timeSheetId: sheetId,
      timeEntryId: entryId,
      createdAt: now,
    }))

    if (entries.length > 0) {
      await db.insert(timeSheetEntries).values(entries)
    }

    // Update sheet's updatedAt
    await this.update(sheetId, {})
  },

  async removeEntry(sheetId: string, entryId: string): Promise<void> {
    await db
      .delete(timeSheetEntries)
      .where(
        and(
          eq(timeSheetEntries.timeSheetId, sheetId),
          eq(timeSheetEntries.timeEntryId, entryId)
        )
      )

    // Update sheet's updatedAt
    await this.update(sheetId, {})
  },

  async getAvailableEntries(filters?: {
    organisationId?: string
    projectId?: string
  }): Promise<TimeEntry[]> {
    // Get IDs of entries that are in approved sheets
    const approvedSheets = await this.findByStatus('approved')
    const approvedSheetIds = approvedSheets.map((s) => s.id)

    let entriesInApprovedSheets: string[] = []
    if (approvedSheetIds.length > 0) {
      const sheetEntryRecords = await db
        .select()
        .from(timeSheetEntries)
        .where(sql`${timeSheetEntries.timeSheetId} IN ${approvedSheetIds}`)

      entriesInApprovedSheets = sheetEntryRecords.map((se) => se.timeEntryId)
    }

    // Build query conditions
    const conditions = []

    if (entriesInApprovedSheets.length > 0) {
      conditions.push(notInArray(timeEntries.id, entriesInApprovedSheets))
    }

    if (filters?.organisationId) {
      conditions.push(eq(timeEntries.organisationId, filters.organisationId))
    }

    if (filters?.projectId) {
      conditions.push(eq(timeEntries.projectId, filters.projectId))
    }

    if (conditions.length === 0) {
      return await db.select().from(timeEntries)
    }

    return await db
      .select()
      .from(timeEntries)
      .where(and(...conditions))
  },

  async getEntriesInSheet(sheetId: string): Promise<TimeEntry[]> {
    const sheetEntryRecords = await db
      .select()
      .from(timeSheetEntries)
      .where(eq(timeSheetEntries.timeSheetId, sheetId))

    const entryIds = sheetEntryRecords.map((se) => se.timeEntryId)

    if (entryIds.length === 0) return []

    return await db
      .select()
      .from(timeEntries)
      .where(sql`${timeEntries.id} IN ${entryIds}`)
  },

  // Workflow actions
  async submitSheet(id: string): Promise<void> {
    await this.update(id, {
      status: 'submitted',
      submittedDate: new Date().toISOString(),
    })
  },

  async approveSheet(id: string): Promise<void> {
    const now = new Date().toISOString()

    // Update sheet status
    await this.update(id, {
      status: 'approved',
      approvedDate: now,
    })

    // Approve all entries in this sheet
    const entries = await this.getEntriesInSheet(id)
    for (const entry of entries) {
      await db
        .update(timeEntries)
        .set({ approvedDate: now })
        .where(eq(timeEntries.id, entry.id))
    }
  },

  async rejectSheet(id: string, reason?: string): Promise<void> {
    await this.update(id, {
      status: 'rejected',
      rejectedDate: new Date().toISOString(),
      rejectionReason: reason,
    })
  },

  async revertToDraft(id: string): Promise<void> {
    await this.update(id, {
      status: 'draft',
      submittedDate: undefined,
      approvedDate: undefined,
      rejectedDate: undefined,
      rejectionReason: undefined,
    })
  },
}
