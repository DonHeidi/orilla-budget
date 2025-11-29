import { getCookie } from '@tanstack/react-start/server'
import { sessionRepository } from '@/repositories/session.repository'
import { SESSION_COOKIE_NAME } from '@/lib/auth.shared'
import type { AuthenticatedUser } from './types'

/**
 * Get the current authenticated user from the request cookie
 * For use inside server functions that need user context
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const token = getCookie(SESSION_COOKIE_NAME)
  if (!token) return null

  const sessionData = await sessionRepository.findValidWithUserAndPii(token)
  if (!sessionData || !sessionData.user.isActive) return null

  return {
    id: sessionData.user.id,
    handle: sessionData.user.handle,
    email: sessionData.user.email,
    role: sessionData.user.role,
    pii: sessionData.pii ? { name: sessionData.pii.name } : undefined,
  }
}

/**
 * Check if user is a system admin (super_admin or admin)
 * Admins bypass project-level filtering and see all data
 */
export function isAdmin(user: AuthenticatedUser | null): boolean {
  return user?.role === 'super_admin' || user?.role === 'admin'
}
