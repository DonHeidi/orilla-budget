import type { ReactNode } from 'react'
import type { SystemPermission } from '@/lib/permissions'
import { useAuth } from '@/hooks/useAuth'

interface SystemPermissionGateProps {
  /** Permission(s) required - user needs ANY of these */
  permissions: SystemPermission | SystemPermission[]
  /** Content to render if user lacks permission */
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Conditionally render children based on system permissions.
 * User needs ANY of the specified permissions.
 */
export function SystemPermissionGate({
  permissions,
  fallback = null,
  children,
}: SystemPermissionGateProps) {
  const { canSystem } = useAuth()

  const perms = Array.isArray(permissions) ? permissions : [permissions]
  const hasAccess = perms.some((p) => canSystem(p))

  return hasAccess ? <>{children}</> : <>{fallback}</>
}
