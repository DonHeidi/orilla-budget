import { db, betterAuth } from '@/db'
import { project } from '@/db/schema'
import { eq, inArray, and, count } from 'drizzle-orm'
import type { ProjectCategory } from '@/schemas'

// Project type derived from the business project table
export type Project = typeof project.$inferSelect

// Backwards-compatible Team type for existing code
export type Team = typeof betterAuth.team.$inferSelect

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
 * Projects have a 1:1 relationship with Better Auth teams:
 * - `team` table: Authorization layer (managed by Better Auth)
 * - `project` table: Business data layer (name, description, category, budgetHours)
 *
 * READ operations query the `project` table for business data.
 * For team/membership mutations, use authRepository.
 */
export const projectRepository = {
  // ============================================
  // READ OPERATIONS - Business Data
  // ============================================

  /**
   * Find all projects (business data)
   */
  async findAll(): Promise<Project[]> {
    return await db.select().from(project)
  },

  /**
   * Find project by ID
   */
  async findById(id: string): Promise<Project | undefined> {
    const result = await db.select().from(project).where(eq(project.id, id)).limit(1)
    return result[0]
  },

  /**
   * Find project by team ID (Better Auth team reference)
   */
  async findByTeamId(teamId: string): Promise<Project | undefined> {
    const result = await db.select().from(project).where(eq(project.teamId, teamId)).limit(1)
    return result[0]
  },

  /**
   * Find projects by organisation
   */
  async findByOrganisationId(organisationId: string): Promise<Project[]> {
    return await db.select().from(project).where(eq(project.organisationId, organisationId))
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
    return db.select().from(project).where(inArray(project.teamId, teamIds))
  },

  /**
   * Find projects by their team IDs
   * Used for loading projects related to user's memberships
   */
  async findByTeamIds(teamIds: string[]): Promise<Project[]> {
    if (teamIds.length === 0) return []
    return db.select().from(project).where(inArray(project.teamId, teamIds))
  },

  /**
   * Find projects by their project IDs
   */
  async findByIds(ids: string[]): Promise<Project[]> {
    if (ids.length === 0) return []
    return db.select().from(project).where(inArray(project.id, ids))
  },

  // ============================================
  // WRITE OPERATIONS - Business Data
  // ============================================

  /**
   * Update project business data
   * Note: Team (auth) operations should go through authRepository
   */
  async update(
    id: string,
    data: Partial<Pick<Project, 'name' | 'description' | 'category' | 'budgetHours'>>
  ): Promise<Project | undefined> {
    const result = await db
      .update(project)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(project.id, id))
      .returning()

    return result[0]
  },

  /**
   * Update project by team ID
   */
  async updateByTeamId(
    teamId: string,
    data: Partial<Pick<Project, 'name' | 'description' | 'category' | 'budgetHours'>>
  ): Promise<Project | undefined> {
    const result = await db
      .update(project)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(project.teamId, teamId))
      .returning()

    return result[0]
  },

  // ============================================
  // OWNER MANAGEMENT
  // ============================================

  /**
   * Check if an owner can be removed (must have at least one owner remaining)
   * Returns true if removal is allowed, false if it would leave project without owners
   */
  async canRemoveOwner(projectId: string): Promise<boolean> {
    // First get the teamId for this project
    const proj = await db.select().from(project).where(eq(project.id, projectId)).limit(1)

    if (!proj[0]) return false

    const ownerCountResult = await db
      .select({ count: count() })
      .from(betterAuth.teamMember)
      .where(
        and(
          eq(betterAuth.teamMember.teamId, proj[0].teamId),
          eq(betterAuth.teamMember.projectRole, 'owner')
        )
      )

    const ownerCount = ownerCountResult[0]?.count ?? 0
    return ownerCount > 1
  },

  /**
   * Check if an owner can be removed by team ID
   */
  async canRemoveOwnerByTeamId(teamId: string): Promise<boolean> {
    const ownerCountResult = await db
      .select({ count: count() })
      .from(betterAuth.teamMember)
      .where(
        and(
          eq(betterAuth.teamMember.teamId, teamId),
          eq(betterAuth.teamMember.projectRole, 'owner')
        )
      )

    const ownerCount = ownerCountResult[0]?.count ?? 0
    return ownerCount > 1
  },

  /**
   * Get owner count for a project
   */
  async getOwnerCount(projectId: string): Promise<number> {
    const proj = await db.select().from(project).where(eq(project.id, projectId)).limit(1)

    if (!proj[0]) return 0

    const result = await db
      .select({ count: count() })
      .from(betterAuth.teamMember)
      .where(
        and(
          eq(betterAuth.teamMember.teamId, proj[0].teamId),
          eq(betterAuth.teamMember.projectRole, 'owner')
        )
      )

    return result[0]?.count ?? 0
  },

  // ============================================
  // LEGACY COMPATIBILITY - Query team table
  // ============================================

  /**
   * @deprecated Use findByTeamId() to get project by team ID
   * Legacy method that queries Better Auth team table directly
   */
  async findTeamById(id: string): Promise<Team | undefined> {
    const result = await db
      .select()
      .from(betterAuth.team)
      .where(eq(betterAuth.team.id, id))
      .limit(1)
    return result[0]
  },

  /**
   * @deprecated Use findAll() to get all projects
   * Legacy method that queries Better Auth team table directly
   */
  async findAllTeams(): Promise<Team[]> {
    return await db.select().from(betterAuth.team)
  },
}
