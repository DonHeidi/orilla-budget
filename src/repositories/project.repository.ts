import { db, betterAuth } from '@/db'
import { eq, inArray } from 'drizzle-orm'
import type { ProjectCategory } from '@/schemas'

// Project type derived from Better Auth team schema
export type Project = typeof betterAuth.team.$inferSelect
export type CreateProject = {
  name: string
  organisationId: string
  description?: string | null
  category?: ProjectCategory | null
  budgetHours?: number | null
}

/**
 * Project Repository
 *
 * Projects are stored as "teams" in Better Auth's organization plugin.
 * This repository handles READ operations via direct DB queries.
 * For mutations, use authRepository in server functions:
 * - authRepository.createTeam() - create team (project)
 * - authRepository.updateTeam() - update team
 * - authRepository.removeTeam() - delete team
 *
 * This separation ensures server-only code isn't bundled for the client.
 */
export const projectRepository = {
  // ============================================
  // READ OPERATIONS (direct DB - no side effects)
  // ============================================

  async findAll(): Promise<Project[]> {
    return await db.select().from(betterAuth.team)
  },

  async findById(id: string): Promise<Project | undefined> {
    const result = await db
      .select()
      .from(betterAuth.team)
      .where(eq(betterAuth.team.id, id))
      .limit(1)
    return result[0]
  },

  async findByOrganisationId(organisationId: string): Promise<Project[]> {
    return await db
      .select()
      .from(betterAuth.team)
      .where(eq(betterAuth.team.organizationId, organisationId))
  },

  /**
   * Find projects where user has a membership (any role)
   * Used for expert filtering - admins should use findAll()
   */
  async findByUserId(userId: string): Promise<Project[]> {
    const memberships = await db
      .select({ teamId: betterAuth.teamMember.teamId })
      .from(betterAuth.teamMember)
      .where(eq(betterAuth.teamMember.userId, userId))

    if (memberships.length === 0) return []

    const teamIds = memberships.map((m) => m.teamId)
    return db.select().from(betterAuth.team).where(inArray(betterAuth.team.id, teamIds))
  },

  /**
   * Find projects by their IDs
   * Used for loading projects related to user's memberships
   */
  async findByIds(ids: string[]): Promise<Project[]> {
    if (ids.length === 0) return []
    return db.select().from(betterAuth.team).where(inArray(betterAuth.team.id, ids))
  },

  // ============================================
  // HELPER OPERATIONS (direct DB for app-specific fields)
  // ============================================

  /**
   * Update custom project fields (app-specific, not managed by Better Auth)
   * Call this after using authRepository.createTeam() or authRepository.updateTeam()
   */
  async updateCustomFields(
    id: string,
    data: Partial<Pick<Project, 'description' | 'category' | 'budgetHours'>>
  ): Promise<void> {
    const fields: Record<string, unknown> = { updatedAt: new Date() }
    if ('description' in data) fields.description = data.description
    if ('category' in data) fields.category = data.category
    if ('budgetHours' in data) fields.budgetHours = data.budgetHours

    if (Object.keys(fields).length > 1) {
      await db
        .update(betterAuth.team)
        .set(fields)
        .where(eq(betterAuth.team.id, id))
    }
  },
}
