import { getRequest } from '@tanstack/react-start/server'
import { auth } from '@/lib/better-auth'
import type { AuthenticatedUser } from './types'

/**
 * Get the current authenticated user from Better Auth session
 * For use inside server functions that need user context
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const request = getRequest()
  const session = await auth.api.getSession({
    headers: request.headers,
  })

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
