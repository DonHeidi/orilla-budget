import { db, timeEntries } from '@/db'
import { eq } from 'drizzle-orm'
import type { TimeEntry } from '@/types'

export const timeEntryRepository = {
  async findAll(): Promise<TimeEntry[]> {
    return await db.select().from(timeEntries)
  },

  async findById(id: string): Promise<TimeEntry | undefined> {
    const result = await db.select().from(timeEntries).where(eq(timeEntries.id, id)).limit(1)
    return result[0]
  },

  async findByProjectId(projectId: string): Promise<TimeEntry[]> {
    return await db.select().from(timeEntries).where(eq(timeEntries.projectId, projectId))
  },

  async findByOrganisationId(organisationId: string): Promise<TimeEntry[]> {
    return await db.select().from(timeEntries).where(eq(timeEntries.organisationId, organisationId))
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
}
