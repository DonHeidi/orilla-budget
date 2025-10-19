import { db, projects } from '@/db'
import { eq } from 'drizzle-orm'
import type { Project } from '@/types'

export const projectRepository = {
  async findAll(): Promise<Project[]> {
    return await db.select().from(projects)
  },

  async findById(id: string): Promise<Project | undefined> {
    const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1)
    return result[0]
  },

  async findByOrganisationId(organisationId: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.organisationId, organisationId))
  },

  async create(project: Project): Promise<Project> {
    await db.insert(projects).values(project)
    return project
  },

  async update(id: string, data: Partial<Project>): Promise<void> {
    await db.update(projects).set(data).where(eq(projects.id, id))
  },

  async delete(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id))
  },
}
