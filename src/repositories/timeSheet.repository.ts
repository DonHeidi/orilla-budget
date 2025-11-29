import {
  db,
  timeSheets,
  timeSheetEntries,
  timeEntries,
  organisations,
  projects,
  accounts,
  timeSheetApprovals,
} from '@/db'
import { eq, sql, and, notInArray, ne } from 'drizzle-orm'
import type { TimeSheet, TimeEntry, EntryStatus } from '@/schemas'
import type { TimeSheetWithEntries } from '@/types'
import { generateId } from '@/lib/auth'

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

  async findByAccount(accountId: string): Promise<TimeSheet[]> {
    return await db
      .select()
      .from(timeSheets)
      .where(eq(timeSheets.accountId, accountId))
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

    let account = undefined
    if (sheet.accountId) {
      const accountResult = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, sheet.accountId))
        .limit(1)
      account = accountResult[0]
    }

    return {
      timeSheet: sheet,
      entries,
      totalHours,
      organisation,
      project,
      account,
    }
  },

  // Entry management
  async addEntries(sheetId: string, entryIds: string[]): Promise<void> {
    const now = new Date().toISOString()

    // Get the current lastEditedAt for each entry to store in the junction table
    const entryData = await db
      .select({ id: timeEntries.id, lastEditedAt: timeEntries.lastEditedAt })
      .from(timeEntries)
      .where(sql`${timeEntries.id} IN ${entryIds}`)

    const lastEditedMap = new Map(
      entryData.map((e) => [e.id, e.lastEditedAt])
    )

    const entries = entryIds.map((entryId) => ({
      id: generateId(),
      timeSheetId: sheetId,
      timeEntryId: entryId,
      entryLastEditedAtWhenAdded: lastEditedMap.get(entryId) ?? null,
      approvedInSheet: false,
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
    // Get IDs of ALL entries already in any time sheet (not just approved)
    const allSheetEntryRecords = await db.select().from(timeSheetEntries)
    const entriesInAnySheet = allSheetEntryRecords.map((se) => se.timeEntryId)

    // Build query conditions
    const conditions = []

    if (entriesInAnySheet.length > 0) {
      conditions.push(notInArray(timeEntries.id, entriesInAnySheet))
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

  async approveSheet(id: string, approvedBy: string): Promise<void> {
    const now = new Date().toISOString()

    // Update sheet status
    await this.update(id, {
      status: 'approved',
      approvedDate: now,
    })

    // Approve all entries in this sheet and update their status
    const entries = await this.getEntriesInSheet(id)
    for (const entry of entries) {
      await db
        .update(timeEntries)
        .set({
          approvedDate: now,
          status: 'approved',
          statusChangedAt: now,
          statusChangedBy: approvedBy,
        })
        .where(eq(timeEntries.id, entry.id))
    }

    // Mark all entries as approved in sheet
    await db
      .update(timeSheetEntries)
      .set({
        approvedInSheet: true,
        approvedInSheetAt: now,
        approvedInSheetBy: approvedBy,
      })
      .where(eq(timeSheetEntries.timeSheetId, id))
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

    // Clear multi-stage approvals when reverting to draft
    await db
      .delete(timeSheetApprovals)
      .where(eq(timeSheetApprovals.timeSheetId, id))

    // Reset entry approval status in sheet
    await db
      .update(timeSheetEntries)
      .set({
        approvedInSheet: false,
        approvedInSheetAt: null,
        approvedInSheetBy: null,
      })
      .where(eq(timeSheetEntries.timeSheetId, id))
  },

  // ============================================================================
  // APPROVAL WORKFLOW METHODS
  // ============================================================================

  /**
   * Check if a time sheet can be approved
   * Returns status info including whether all entries are approved
   */
  async canApproveSheet(id: string): Promise<{
    canApprove: boolean
    reason?: string
    hasQuestionedEntries: boolean
    pendingEntryCount: number
    approvedEntryCount: number
    totalEntryCount: number
  }> {
    const entries = await this.getEntriesInSheet(id)

    if (entries.length === 0) {
      return {
        canApprove: false,
        reason: 'Time sheet has no entries',
        hasQuestionedEntries: false,
        pendingEntryCount: 0,
        approvedEntryCount: 0,
        totalEntryCount: 0,
      }
    }

    const questionedEntries = entries.filter((e) => e.status === 'questioned')
    const pendingEntries = entries.filter((e) => e.status === 'pending')
    const approvedEntries = entries.filter((e) => e.status === 'approved')

    if (questionedEntries.length > 0) {
      return {
        canApprove: false,
        reason: `${questionedEntries.length} entries have open questions`,
        hasQuestionedEntries: true,
        pendingEntryCount: pendingEntries.length,
        approvedEntryCount: approvedEntries.length,
        totalEntryCount: entries.length,
      }
    }

    return {
      canApprove: true,
      hasQuestionedEntries: false,
      pendingEntryCount: pendingEntries.length,
      approvedEntryCount: approvedEntries.length,
      totalEntryCount: entries.length,
    }
  },

  /**
   * Get entries with their statuses for a time sheet
   */
  async getEntriesWithStatus(sheetId: string): Promise<
    Array<
      TimeEntry & {
        approvedInSheet: boolean
        approvedInSheetAt: string | null
        approvedInSheetBy: string | null
      }
    >
  > {
    const result = await db
      .select({
        id: timeEntries.id,
        projectId: timeEntries.projectId,
        organisationId: timeEntries.organisationId,
        title: timeEntries.title,
        description: timeEntries.description,
        hours: timeEntries.hours,
        date: timeEntries.date,
        status: timeEntries.status,
        statusChangedAt: timeEntries.statusChangedAt,
        statusChangedBy: timeEntries.statusChangedBy,
        lastEditedAt: timeEntries.lastEditedAt,
        createdBy: timeEntries.createdBy,
        approvedDate: timeEntries.approvedDate,
        billed: timeEntries.billed,
        createdAt: timeEntries.createdAt,
        approvedInSheet: timeSheetEntries.approvedInSheet,
        approvedInSheetAt: timeSheetEntries.approvedInSheetAt,
        approvedInSheetBy: timeSheetEntries.approvedInSheetBy,
      })
      .from(timeSheetEntries)
      .innerJoin(timeEntries, eq(timeSheetEntries.timeEntryId, timeEntries.id))
      .where(eq(timeSheetEntries.timeSheetId, sheetId))

    return result
  },

  /**
   * Approve a single entry within a time sheet
   */
  async approveEntryInSheet(
    sheetId: string,
    entryId: string,
    approvedBy: string
  ): Promise<void> {
    const now = new Date().toISOString()

    // Update entry status
    await db
      .update(timeEntries)
      .set({
        status: 'approved',
        statusChangedAt: now,
        statusChangedBy: approvedBy,
        approvedDate: now,
      })
      .where(eq(timeEntries.id, entryId))

    // Update junction table
    await db
      .update(timeSheetEntries)
      .set({
        approvedInSheet: true,
        approvedInSheetAt: now,
        approvedInSheetBy: approvedBy,
      })
      .where(
        and(
          eq(timeSheetEntries.timeSheetId, sheetId),
          eq(timeSheetEntries.timeEntryId, entryId)
        )
      )
  },

  /**
   * Question an entry within a time sheet
   */
  async questionEntryInSheet(
    sheetId: string,
    entryId: string,
    questionedBy: string
  ): Promise<void> {
    const now = new Date().toISOString()

    // Update entry status to questioned
    await db
      .update(timeEntries)
      .set({
        status: 'questioned',
        statusChangedAt: now,
        statusChangedBy: questionedBy,
        approvedDate: null,
      })
      .where(eq(timeEntries.id, entryId))

    // Reset approval in junction table
    await db
      .update(timeSheetEntries)
      .set({
        approvedInSheet: false,
        approvedInSheetAt: null,
        approvedInSheetBy: null,
      })
      .where(
        and(
          eq(timeSheetEntries.timeSheetId, sheetId),
          eq(timeSheetEntries.timeEntryId, entryId)
        )
      )
  },
}
