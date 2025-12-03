import { db, betterAuth } from '@/db'
import { eq, and } from 'drizzle-orm'
import type { ProjectRole } from '@/schemas'

// ProjectMember type derived from Better Auth teamMember schema
export type ProjectMember = typeof betterAuth.teamMember.$inferSelect
export type CreateProjectMember = {
  projectId: string // Maps to teamId
  userId: string
  role: ProjectRole
}

export interface ProjectMemberWithDetails {
  id: string
  projectId: string
  userId: string
  role: ProjectRole
  createdAt: Date | null
  projectName: string
  userHandle: string | null
  userEmail: string
}

export interface ProjectMembershipForAuth {
  projectId: string
  projectName: string
  organisationId: string
  organisationName: string | null
  role: ProjectRole
}

/**
 * Project Member Repository
 *
 * Project members are stored as "teamMembers" in Better Auth's organization plugin.
 * This repository handles READ operations via direct DB queries.
 * For mutations, use authRepository in server functions:
 * - authRepository.addMember() - add member to team
 *
 * This separation ensures server-only code isn't bundled for the client.
 */
export const projectMemberRepository = {
  // ============================================
  // READ OPERATIONS (direct DB - no side effects)
  // ============================================

  /**
   * Find a membership by ID
   */
  async findById(id: string): Promise<ProjectMember | undefined> {
    const result = await db
      .select()
      .from(betterAuth.teamMember)
      .where(eq(betterAuth.teamMember.id, id))
      .limit(1)
    return result[0]
  },

  /**
   * Find a membership by project and user
   */
  async findByProjectAndUser(
    projectId: string,
    userId: string
  ): Promise<ProjectMember | undefined> {
    const result = await db
      .select()
      .from(betterAuth.teamMember)
      .where(
        and(
          eq(betterAuth.teamMember.teamId, projectId),
          eq(betterAuth.teamMember.userId, userId)
        )
      )
      .limit(1)
    return result[0]
  },

  /**
   * Find all memberships for a user
   */
  async findByUserId(userId: string): Promise<ProjectMember[]> {
    return await db
      .select()
      .from(betterAuth.teamMember)
      .where(eq(betterAuth.teamMember.userId, userId))
  },

  /**
   * Find all memberships for a user with project details
   */
  async findByUserIdWithProjects(
    userId: string
  ): Promise<ProjectMemberWithDetails[]> {
    const result = await db
      .select({
        id: betterAuth.teamMember.id,
        projectId: betterAuth.teamMember.teamId,
        userId: betterAuth.teamMember.userId,
        role: betterAuth.teamMember.projectRole,
        createdAt: betterAuth.teamMember.createdAt,
        projectName: betterAuth.team.name,
        userHandle: betterAuth.user.handle,
        userEmail: betterAuth.user.email,
      })
      .from(betterAuth.teamMember)
      .innerJoin(betterAuth.team, eq(betterAuth.teamMember.teamId, betterAuth.team.id))
      .innerJoin(betterAuth.user, eq(betterAuth.teamMember.userId, betterAuth.user.id))
      .where(eq(betterAuth.teamMember.userId, userId))

    return result as ProjectMemberWithDetails[]
  },

  /**
   * Find all members of a project
   */
  async findByProjectId(projectId: string): Promise<ProjectMember[]> {
    return await db
      .select()
      .from(betterAuth.teamMember)
      .where(eq(betterAuth.teamMember.teamId, projectId))
  },

  /**
   * Find all members of a project with user details
   */
  async findByProjectIdWithUsers(
    projectId: string
  ): Promise<ProjectMemberWithDetails[]> {
    const result = await db
      .select({
        id: betterAuth.teamMember.id,
        projectId: betterAuth.teamMember.teamId,
        userId: betterAuth.teamMember.userId,
        role: betterAuth.teamMember.projectRole,
        createdAt: betterAuth.teamMember.createdAt,
        projectName: betterAuth.team.name,
        userHandle: betterAuth.user.handle,
        userEmail: betterAuth.user.email,
      })
      .from(betterAuth.teamMember)
      .innerJoin(betterAuth.team, eq(betterAuth.teamMember.teamId, betterAuth.team.id))
      .innerJoin(betterAuth.user, eq(betterAuth.teamMember.userId, betterAuth.user.id))
      .where(eq(betterAuth.teamMember.teamId, projectId))

    return result as ProjectMemberWithDetails[]
  },

  /**
   * Find all memberships for a user with project and organisation details
   * Used for auth context to provide full membership info
   * Uses LEFT JOIN on organisations to include projects without an organisation
   */
  async findMembershipsForAuth(
    userId: string
  ): Promise<ProjectMembershipForAuth[]> {
    const result = await db
      .select({
        projectId: betterAuth.teamMember.teamId,
        projectName: betterAuth.team.name,
        organisationId: betterAuth.team.organizationId,
        organisationName: betterAuth.organization.name,
        role: betterAuth.teamMember.projectRole,
      })
      .from(betterAuth.teamMember)
      .innerJoin(betterAuth.team, eq(betterAuth.teamMember.teamId, betterAuth.team.id))
      .leftJoin(betterAuth.organization, eq(betterAuth.team.organizationId, betterAuth.organization.id))
      .where(eq(betterAuth.teamMember.userId, userId))

    return result as ProjectMembershipForAuth[]
  },

  // ============================================
  // HELPER OPERATIONS (direct DB for app-specific fields)
  // ============================================

  /**
   * Update project role (app-specific field, not managed by Better Auth)
   * Call this after using authRepository.addMember() to set the project-specific role
   */
  async updateProjectRole(
    projectId: string,
    userId: string,
    role: ProjectRole
  ): Promise<void> {
    await db
      .update(betterAuth.teamMember)
      .set({ projectRole: role })
      .where(
        and(
          eq(betterAuth.teamMember.teamId, projectId),
          eq(betterAuth.teamMember.userId, userId)
        )
      )
  },

  /**
   * Update project role by membership ID
   */
  async updateProjectRoleById(id: string, role: ProjectRole): Promise<void> {
    await db
      .update(betterAuth.teamMember)
      .set({ projectRole: role })
      .where(eq(betterAuth.teamMember.id, id))
  },
}
