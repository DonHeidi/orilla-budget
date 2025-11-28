import { db, projectMembers, projects, users } from '@/db'
import { eq, and } from 'drizzle-orm'
import type { ProjectMember, CreateProjectMember, ProjectRole } from '@/schemas'
import { generateId, now } from '@/lib/auth'

export interface ProjectMemberWithDetails {
  id: string
  projectId: string
  userId: string
  role: ProjectRole
  createdAt: string
  projectName: string
  userHandle: string
  userEmail: string
}

export const projectMemberRepository = {
  /**
   * Create a new project membership
   */
  async create(data: CreateProjectMember): Promise<ProjectMember> {
    const member: ProjectMember = {
      id: generateId(),
      ...data,
      createdAt: now(),
    }
    await db.insert(projectMembers).values(member)
    return member
  },

  /**
   * Find a membership by ID
   */
  async findById(id: string): Promise<ProjectMember | undefined> {
    const result = await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.id, id))
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
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, userId)
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
      .from(projectMembers)
      .where(eq(projectMembers.userId, userId))
  },

  /**
   * Find all memberships for a user with project details
   */
  async findByUserIdWithProjects(
    userId: string
  ): Promise<ProjectMemberWithDetails[]> {
    const result = await db
      .select({
        id: projectMembers.id,
        projectId: projectMembers.projectId,
        userId: projectMembers.userId,
        role: projectMembers.role,
        createdAt: projectMembers.createdAt,
        projectName: projects.name,
        userHandle: users.handle,
        userEmail: users.email,
      })
      .from(projectMembers)
      .innerJoin(projects, eq(projectMembers.projectId, projects.id))
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.userId, userId))

    return result as ProjectMemberWithDetails[]
  },

  /**
   * Find all members of a project
   */
  async findByProjectId(projectId: string): Promise<ProjectMember[]> {
    return await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId))
  },

  /**
   * Find all members of a project with user details
   */
  async findByProjectIdWithUsers(
    projectId: string
  ): Promise<ProjectMemberWithDetails[]> {
    const result = await db
      .select({
        id: projectMembers.id,
        projectId: projectMembers.projectId,
        userId: projectMembers.userId,
        role: projectMembers.role,
        createdAt: projectMembers.createdAt,
        projectName: projects.name,
        userHandle: users.handle,
        userEmail: users.email,
      })
      .from(projectMembers)
      .innerJoin(projects, eq(projectMembers.projectId, projects.id))
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, projectId))

    return result as ProjectMemberWithDetails[]
  },

  /**
   * Update a membership (typically to change the role)
   */
  async update(
    id: string,
    data: Partial<Pick<ProjectMember, 'role'>>
  ): Promise<void> {
    await db.update(projectMembers).set(data).where(eq(projectMembers.id, id))
  },

  /**
   * Delete a membership
   */
  async delete(id: string): Promise<void> {
    await db.delete(projectMembers).where(eq(projectMembers.id, id))
  },

  /**
   * Delete a membership by project and user
   */
  async deleteByProjectAndUser(
    projectId: string,
    userId: string
  ): Promise<void> {
    await db
      .delete(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, userId)
        )
      )
  },
}
