import { createContext, useCallback, type ReactNode } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  hasSystemPermission,
  hasProjectPermission,
  type SystemPermission,
  type ProjectPermission,
} from '@/lib/permissions'
import { logoutFn } from '@/lib/auth-server'
import type {
  AuthContextValue,
  AuthenticatedUser,
  ProjectMembership,
} from '@/lib/auth'

export const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
  initialUser: AuthenticatedUser | null
  initialMemberships: ProjectMembership[]
}

export function AuthProvider({
  children,
  initialUser,
  initialMemberships,
}: AuthProviderProps) {
  const router = useRouter()
  const logoutServerFn = useServerFn(logoutFn)

  const user = initialUser
  const projectMemberships = initialMemberships

  const isSystemAdmin = user?.role === 'super_admin' || user?.role === 'admin'

  const canSystem = useCallback(
    (permission: SystemPermission) => {
      if (!user) return false
      return hasSystemPermission(user, permission)
    },
    [user]
  )

  const getProjectMembership = useCallback(
    (projectId: string) => {
      return projectMemberships.find((m) => m.projectId === projectId) ?? null
    },
    [projectMemberships]
  )

  const getProjectRole = useCallback(
    (projectId: string) => {
      return getProjectMembership(projectId)?.role ?? null
    },
    [getProjectMembership]
  )

  const canOnProject = useCallback(
    (projectId: string, permission: ProjectPermission) => {
      // System admins can do anything
      if (isSystemAdmin) return true

      const membership = getProjectMembership(projectId)
      if (!membership) return false
      return hasProjectPermission(membership, permission)
    },
    [isSystemAdmin, getProjectMembership]
  )

  const canAnyOnProject = useCallback(
    (projectId: string, permissions: ProjectPermission[]) => {
      return permissions.some((p) => canOnProject(projectId, p))
    },
    [canOnProject]
  )

  const logout = useCallback(async () => {
    await logoutServerFn()
    router.navigate({ to: '/login' })
  }, [logoutServerFn, router])

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading: false,
    isSystemAdmin,
    projectMemberships,
    canSystem,
    canOnProject,
    canAnyOnProject,
    getProjectRole,
    getProjectMembership,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
