import { createServerFn } from '@tanstack/react-start'
import { getCookie, setCookie } from '@tanstack/react-start/server'
import { sessionRepository } from '@/repositories/session.repository'
import { projectMemberRepository } from '@/repositories/projectMember.repository'
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from '@/lib/auth.shared'
import type { AuthSession, AuthenticatedUser, ProjectMembership } from './types'

/**
 * Get the current session from the request cookie
 * Returns user data and project memberships if authenticated
 */
export const getCurrentSessionFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AuthSession> => {
    const token = getCookie(SESSION_COOKIE_NAME)

    if (!token) {
      return { user: null, projectMemberships: [] }
    }

    const sessionData = await sessionRepository.findValidWithUserAndPii(token)

    if (!sessionData) {
      return { user: null, projectMemberships: [] }
    }

    const { user, pii } = sessionData

    // Check if user is active
    if (!user.isActive) {
      return { user: null, projectMemberships: [] }
    }

    // Get project memberships
    const memberships = await projectMemberRepository.findMembershipsForAuth(
      user.id
    )

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      handle: user.handle,
      email: user.email,
      role: user.role,
      pii: pii ? { name: pii.name } : undefined,
    }

    const projectMemberships: ProjectMembership[] = memberships.map((m) => ({
      projectId: m.projectId,
      projectName: m.projectName,
      organisationId: m.organisationId,
      organisationName: m.organisationName,
      role: m.role,
    }))

    return {
      user: authenticatedUser,
      projectMemberships,
    }
  }
)

/**
 * Logout - delete the session and clear cookie
 */
export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const token = getCookie(SESSION_COOKIE_NAME)

  if (token) {
    await sessionRepository.deleteByToken(token)
  }

  // Clear the cookie by setting it with expired date
  setCookie(SESSION_COOKIE_NAME, '', {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 0,
  })

  return { success: true }
})
