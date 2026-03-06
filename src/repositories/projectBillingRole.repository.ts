import { db } from '@/db'
import { projectBillingRoles } from '@/db/schema'
import { eq, and, ne } from 'drizzle-orm'
import type { CreateProjectBillingRole, UpdateProjectBillingRole } from '@/schemas'

export type ProjectBillingRole = typeof projectBillingRoles.$inferSelect

export const projectBillingRoleRepository = {
  /**
   * Find all billing roles for a project (excluding archived)
   */
  async findByProjectId(projectId: string): Promise<ProjectBillingRole[]> {
    return db
      .select()
      .from(projectBillingRoles)
      .where(
        and(eq(projectBillingRoles.projectId, projectId), eq(projectBillingRoles.archived, false))
      )
  },

  /**
   * Find all billing roles for a project (including archived)
   */
  async findAllByProjectId(projectId: string): Promise<ProjectBillingRole[]> {
    return db.select().from(projectBillingRoles).where(eq(projectBillingRoles.projectId, projectId))
  },

  /**
   * Find billing role by ID
   */
  async findById(id: string): Promise<ProjectBillingRole | undefined> {
    const result = await db
      .select()
      .from(projectBillingRoles)
      .where(eq(projectBillingRoles.id, id))
      .limit(1)
    return result[0]
  },

  /**
   * Create a billing role
   */
  async create(data: CreateProjectBillingRole): Promise<ProjectBillingRole> {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()

    const result = await db
      .insert(projectBillingRoles)
      .values({
        id,
        projectId: data.projectId,
        name: data.name,
        description: data.description || '',
        archived: false,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    return result[0]!
  },

  /**
   * Update billing role
   */
  async update(id: string, data: UpdateProjectBillingRole): Promise<ProjectBillingRole | undefined> {
    const result = await db
      .update(projectBillingRoles)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(projectBillingRoles.id, id))
      .returning()

    return result[0]
  },

  /**
   * Archive billing role (soft delete to preserve historical data)
   */
  async archive(id: string): Promise<void> {
    await db
      .update(projectBillingRoles)
      .set({
        archived: true,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(projectBillingRoles.id, id))
  },

  /**
   * Check if role name exists in project (for uniqueness validation)
   */
  async existsByName(
    projectId: string,
    name: string,
    excludeId?: string
  ): Promise<boolean> {
    const conditions = [
      eq(projectBillingRoles.projectId, projectId),
      eq(projectBillingRoles.name, name),
      eq(projectBillingRoles.archived, false),
    ]

    if (excludeId) {
      conditions.push(ne(projectBillingRoles.id, excludeId))
    }

    const result = await db
      .select({ id: projectBillingRoles.id })
      .from(projectBillingRoles)
      .where(and(...conditions))
      .limit(1)

    return result.length > 0
  },
}
