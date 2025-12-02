import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '@/lib/better-auth'
import { db, betterAuth } from '@/db'
import { eq } from 'drizzle-orm'
import type { AuthSession, AuthenticatedUser, ProjectMembership } from './types'

/**
 * Get the current session from Better Auth
 * Returns user data and project memberships if authenticated
 */
export const getCurrentSessionFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AuthSession> => {
    try {
      const request = getRequest()
      const session = await auth.api.getSession({
        headers: request.headers,
      })

      if (!session?.user) {
        return { user: null, projectMemberships: [] }
      }

      const user = session.user

      // Check if user is active
      if (user.isActive === false) {
        return { user: null, projectMemberships: [] }
      }

      // Get project memberships (teams) for the user
      const teamMemberships = await db
        .select({
          teamId: betterAuth.teamMember.teamId,
          projectRole: betterAuth.teamMember.projectRole,
          teamName: betterAuth.team.name,
          teamDescription: betterAuth.team.description,
          organizationId: betterAuth.team.organizationId,
          organizationName: betterAuth.organization.name,
        })
        .from(betterAuth.teamMember)
        .innerJoin(
          betterAuth.team,
          eq(betterAuth.teamMember.teamId, betterAuth.team.id)
        )
        .innerJoin(
          betterAuth.organization,
          eq(betterAuth.team.organizationId, betterAuth.organization.id)
        )
        .where(eq(betterAuth.teamMember.userId, user.id))

      const authenticatedUser: AuthenticatedUser = {
        id: user.id,
        handle: user.handle || user.name,
        email: user.email,
        role: user.role as 'super_admin' | 'admin' | null,
        pii: user.piiId ? { name: user.name } : undefined,
      }

      const projectMemberships: ProjectMembership[] = teamMemberships.map(
        (m) => ({
          projectId: m.teamId,
          projectName: m.teamName,
          organisationId: m.organizationId,
          organisationName: m.organizationName,
          role: m.projectRole as
            | 'owner'
            | 'expert'
            | 'reviewer'
            | 'client'
            | 'viewer',
        })
      )

      return {
        user: authenticatedUser,
        projectMemberships,
      }
    } catch (error) {
      console.error('Error getting session:', error)
      return { user: null, projectMemberships: [] }
    }
  }
)

/**
 * Logout - uses Better Auth's signOut
 */
export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  try {
    const request = getRequest()
    await auth.api.signOut({
      headers: request.headers,
    })
    return { success: true }
  } catch (error) {
    console.error('Error signing out:', error)
    return { success: false }
  }
})
