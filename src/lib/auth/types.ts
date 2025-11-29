import type { SystemPermission, ProjectPermission } from '../permissions'

/**
 * Authenticated user from session
 */
export interface AuthenticatedUser {
  id: string
  handle: string
  email: string
  role: 'super_admin' | 'admin' | null
  pii?: {
    name?: string | null
  }
}

/**
 * Project membership with details
 * Organisation fields are nullable for projects without an organisation
 */
export interface ProjectMembership {
  projectId: string
  projectName: string
  organisationId: string | null
  organisationName: string | null
  role: 'owner' | 'expert' | 'reviewer' | 'client' | 'viewer'
}

/**
 * Session data returned from server
 */
export interface AuthSession {
  user: AuthenticatedUser | null
  projectMemberships: ProjectMembership[]
}

/**
 * Auth context value provided to components
 */
export interface AuthContextValue {
  user: AuthenticatedUser | null
  isAuthenticated: boolean
  isLoading: boolean
  isSystemAdmin: boolean

  projectMemberships: ProjectMembership[]

  // System permission helpers
  canSystem: (permission: SystemPermission) => boolean

  // Project permission helpers
  canOnProject: (projectId: string, permission: ProjectPermission) => boolean
  canAnyOnProject: (projectId: string, permissions: ProjectPermission[]) => boolean
  getProjectRole: (projectId: string) => string | null
  getProjectMembership: (projectId: string) => ProjectMembership | null

  // Actions
  logout: () => Promise<void>
}
