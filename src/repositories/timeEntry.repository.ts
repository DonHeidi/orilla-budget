import { db, timeEntries, timeSheetEntries, timeSheets } from '@/db'
import { eq, and, ne, inArray } from 'drizzle-orm'
import type { TimeEntry, EntryStatus } from '@/schemas'

export const timeEntryRepository = {
  async findAll(): Promise<TimeEntry[]> {
    return await db.select().from(timeEntries)
  },

  async findById(id: string): Promise<TimeEntry | undefined> {
    const result = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.id, id))
      .limit(1)
    return result[0]
  },

  async findByProjectId(projectId: string): Promise<TimeEntry[]> {
    return await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.projectId, projectId))
  },

  async findByOrganisationId(organisationId: string): Promise<TimeEntry[]> {
    return await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.organisationId, organisationId))
  },

  async create(entry: TimeEntry): Promise<TimeEntry> {
    await db.insert(timeEntries).values(entry)
    return entry
  },

  async update(id: string, data: Partial<TimeEntry>): Promise<void> {
    // Set lastEditedAt whenever an entry is updated
    const updateData = {
      ...data,
      lastEditedAt: new Date().toISOString(),
    }
    await db.update(timeEntries).set(updateData).where(eq(timeEntries.id, id))
  },

  async delete(id: string): Promise<void> {
    await db.delete(timeEntries).where(eq(timeEntries.id, id))
  },

  /**
   * Find time entries created by a specific user
   * Used for expert filtering - admins should use findAll()
   */
  async findByCreatedByUserId(userId: string): Promise<TimeEntry[]> {
    return db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.createdByUserId, userId))
  },

  /**
   * Find time entries for specific projects
   * Used for loading time entries related to user's projects
   */
  async findByProjectIds(projectIds: string[]): Promise<TimeEntry[]> {
    if (projectIds.length === 0) return []
    return db
      .select()
      .from(timeEntries)
      .where(inArray(timeEntries.projectId, projectIds))
  },

  // ============================================================================
  // APPROVAL WORKFLOW METHODS
  // ============================================================================

  /**
   * Update the status of a time entry (pending, questioned, approved)
   */
  async updateStatus(
    id: string,
    status: EntryStatus,
    changedBy: string
  ): Promise<void> {
    const now = new Date().toISOString()
    const updateData: Partial<TimeEntry> = {
      status,
      statusChangedAt: now,
      statusChangedBy: changedBy,
    }

    // Set approvedDate when status becomes 'approved' for backwards compatibility
    if (status === 'approved') {
      updateData.approvedDate = now
    } else {
      updateData.approvedDate = null
    }

    await db.update(timeEntries).set(updateData).where(eq(timeEntries.id, id))
  },

  /**
   * Check if an entry is in a non-draft time sheet (for edit blocking)
   */
  async isInSubmittedSheet(id: string): Promise<boolean> {
    const result = await db
      .select({ sheetStatus: timeSheets.status })
      .from(timeSheetEntries)
      .innerJoin(timeSheets, eq(timeSheetEntries.timeSheetId, timeSheets.id))
      .where(
        and(
          eq(timeSheetEntries.timeEntryId, id),
          ne(timeSheets.status, 'draft')
        )
      )
      .limit(1)

    return result.length > 0
  },

  /**
   * Get the time sheet status for an entry (if it's in a sheet)
   */
  async getSheetStatus(id: string): Promise<string | null> {
    const result = await db
      .select({ sheetStatus: timeSheets.status })
      .from(timeSheetEntries)
      .innerJoin(timeSheets, eq(timeSheetEntries.timeSheetId, timeSheets.id))
      .where(eq(timeSheetEntries.timeEntryId, id))
      .limit(1)

    return result[0]?.sheetStatus ?? null
  },
}
