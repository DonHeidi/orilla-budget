/**
 * Auth Server Functions
 *
 * TanStack Start server functions for authentication.
 * These are used by routes and components via useServerFn().
 */

import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { authRepository } from '@/repositories/auth.repository'
import { projectMemberRepository } from '@/repositories/projectMember.repository'
import type { AuthSession, AuthenticatedUser, ProjectMembership } from './auth'

/**
 * Get the current session from Better Auth
 * Returns user data and project memberships if authenticated
 */
export const getCurrentSessionFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AuthSession> => {
    try {
      const request = getRequest()
      const session = await authRepository.getSession(request.headers)

      if (!session?.user) {
        return { user: null, projectMemberships: [] }
      }

      const user = session.user

      // Check if user is active
      if (user.isActive === false) {
        return { user: null, projectMemberships: [] }
      }

      // Get project memberships (teams) for the user
      const teamMemberships = await projectMemberRepository.findMembershipsForAuth(user.id)

      const authenticatedUser: AuthenticatedUser = {
        id: user.id,
        handle: user.handle || user.name,
        email: user.email,
        role: user.role as 'super_admin' | 'admin' | null,
        pii: user.piiId ? { name: user.name } : undefined,
      }

      const projectMemberships: ProjectMembership[] = teamMemberships.map(
        (m) => ({
          projectId: m.projectId,
          projectName: m.projectName,
          organisationId: m.organisationId,
          organisationName: m.organisationName,
          role: m.role as
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
    await authRepository.signOut(request.headers)
    return { success: true }
  } catch (error) {
    console.error('Error signing out:', error)
    return { success: false }
  }
})
