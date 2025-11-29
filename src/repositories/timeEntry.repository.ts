import { db, timeEntries } from '@/db'
import { eq, inArray } from 'drizzle-orm'
import type { TimeEntry } from '@/schemas'

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
    await db.update(timeEntries).set(data).where(eq(timeEntries.id, id))
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
}
