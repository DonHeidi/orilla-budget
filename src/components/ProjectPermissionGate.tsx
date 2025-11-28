import type { ReactNode } from 'react'
import type { ProjectPermission } from '@/lib/permissions'
import { useAuth } from '@/hooks/useAuth'

interface ProjectPermissionGateProps {
  /** The project to check permissions for */
  projectId: string
  /** Permission(s) required */
  permissions: ProjectPermission | ProjectPermission[]
  /** 'any' = user needs ANY permission, 'all' = user needs ALL permissions */
  mode?: 'any' | 'all'
  /** Content to render if user lacks permission */
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Conditionally render children based on project permissions.
 * By default, user needs ANY of the specified permissions.
 * Use mode="all" to require ALL permissions.
 */
export function ProjectPermissionGate({
  projectId,
  permissions,
  mode = 'any',
  fallback = null,
  children,
}: ProjectPermissionGateProps) {
  const { canOnProject, canAnyOnProject } = useAuth()

  const perms = Array.isArray(permissions) ? permissions : [permissions]
  const hasAccess =
    mode === 'all'
      ? perms.every((p) => canOnProject(projectId, p))
      : canAnyOnProject(projectId, perms)

  return hasAccess ? <>{children}</> : <>{fallback}</>
}
