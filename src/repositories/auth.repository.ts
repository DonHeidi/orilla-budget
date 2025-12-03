/**
 * Auth Repository
 *
 * Wraps all Better Auth API interactions following the repository pattern.
 * Server functions should delegate to this repository rather than calling
 * auth.api.* directly.
 *
 * Client-side auth (login forms, etc.) continues to use authClient directly
 * from @/lib/auth-client.
 */

import { auth } from '@/lib/auth'
import { getRequest } from '@tanstack/react-start/server'
import type { AuthenticatedUser } from '@/lib/auth'

// =============================================================================
// AUTH REPOSITORY
// =============================================================================

export const authRepository = {
  // ---------------------------------------------------------------------------
  // Session Management
  // ---------------------------------------------------------------------------

  /**
   * Get session from request headers
   */
  getSession: (headers: Headers) => auth.api.getSession({ headers }),

  /**
   * Sign out user (invalidate session)
   */
  signOut: (headers: Headers) => auth.api.signOut({ headers }),

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------

  /**
   * Sign up with email/password (used in invite flow)
   */
  signUpEmail: (data: { email: string; password: string; name: string }) =>
    auth.api.signUpEmail({ body: data }),

  // ---------------------------------------------------------------------------
  // User Management (Admin)
  // ---------------------------------------------------------------------------

  /**
   * List all users (admin action)
   */
  listUsers: (options?: { limit?: number; offset?: number; sortBy?: string; sortDirection?: 'asc' | 'desc' }) =>
    auth.api.listUsers({ query: options }),

  /**
   * Create a user (admin action - bypasses email verification)
   */
  createUser: (data: { email: string; password: string; name: string; role?: string }) =>
    auth.api.createUser({ body: data }),

  /**
   * Update a user (admin action)
   */
  updateUser: (userId: string, data: Record<string, unknown>) =>
    auth.api.updateUser({ body: { userId, ...data } }),

  /**
   * Set user password (admin action)
   */
  setUserPassword: (userId: string, newPassword: string) =>
    auth.api.setUserPassword({ body: { userId, newPassword } }),

  /**
   * Set user role (admin action)
   */
  setRole: (userId: string, role: string) =>
    auth.api.setRole({ body: { userId, role } }),

  /**
   * Ban a user (admin action)
   */
  banUser: (userId: string, banReason?: string, banExpiresIn?: number) =>
    auth.api.banUser({ body: { userId, banReason, banExpiresIn } }),

  /**
   * Unban a user (admin action)
   */
  unbanUser: (userId: string) =>
    auth.api.unbanUser({ body: { userId } }),

  /**
   * Remove a user (admin action - hard delete)
   */
  removeUser: (userId: string) =>
    auth.api.removeUser({ body: { userId } }),

  // ---------------------------------------------------------------------------
  // Organization Management
  // ---------------------------------------------------------------------------

  /**
   * Create a new organization
   */
  createOrganization: (data: { name: string; slug: string }) =>
    auth.api.createOrganization({ body: data }),

  /**
   * Update an organization
   */
  updateOrganization: (organizationId: string, data: Record<string, unknown>) =>
    auth.api.updateOrganization({ body: { organizationId, data } }),

  // ---------------------------------------------------------------------------
  // Team (Project) Management
  // ---------------------------------------------------------------------------

  /**
   * Create a new team (project)
   */
  createTeam: (data: { name: string; organizationId: string }) =>
    auth.api.createTeam({ body: data }),

  /**
   * Update a team (project)
   */
  updateTeam: (teamId: string, data: Record<string, unknown>) =>
    auth.api.updateTeam({ body: { teamId, data } }),

  /**
   * Remove a team (project)
   */
  removeTeam: (teamId: string) =>
    auth.api.removeTeam({ body: { teamId } }),

  // ---------------------------------------------------------------------------
  // Member Management
  // ---------------------------------------------------------------------------

  /**
   * Add a member to a team
   */
  addMember: (data: { userId: string; teamId: string; role?: string }) =>
    auth.api.addMember({ body: data }),
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get current authenticated user from request context
 * For use inside server functions that need user context
 * Returns null if not authenticated or user is inactive
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const request = getRequest()
  const session = await authRepository.getSession(request.headers)

  if (!session?.user) return null

  const user = session.user

  // Check if user is active
  if (user.isActive === false) return null

  return {
    id: user.id,
    handle: user.handle || user.name,
    email: user.email,
    role: user.role as 'super_admin' | 'admin' | null,
    pii: user.piiId ? { name: user.name } : undefined,
  }
}

/**
 * Check if user is a system admin (super_admin or admin)
 * Admins bypass project-level filtering and see all data
 */
export function isAdmin(user: AuthenticatedUser | null): boolean {
  return user?.role === 'super_admin' || user?.role === 'admin'
}
