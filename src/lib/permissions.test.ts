import { describe, it, expect } from 'bun:test'
import {
  SYSTEM_PERMISSIONS,
  PROJECT_PERMISSIONS,
  SYSTEM_ROLE_PERMISSIONS,
  PROJECT_ROLE_PERMISSIONS,
  hasSystemPermission,
  hasProjectPermission,
  canOnProject,
  hasAnyProjectPermission,
  isSystemRole,
  getProjectPermissionsForRole,
  canAccessSystemRoute,
  canAccessProjectRoutes,
  type SystemPermission,
  type ProjectPermission,
} from './permissions'

describe('permissions', () => {
  describe('SYSTEM_ROLE_PERMISSIONS', () => {
    it('super_admin has all system permissions', () => {
      const allSystemPermissions = Object.keys(SYSTEM_PERMISSIONS) as SystemPermission[]
      expect(SYSTEM_ROLE_PERMISSIONS.super_admin).toEqual(allSystemPermissions)
    })

    it('admin has limited permissions (no users:delete, no platform:manage)', () => {
      const adminPerms = SYSTEM_ROLE_PERMISSIONS.admin
      expect(adminPerms).toContain('users:view')
      expect(adminPerms).toContain('users:create')
      expect(adminPerms).toContain('users:edit')
      expect(adminPerms).not.toContain('users:delete')
      expect(adminPerms).not.toContain('platform:manage')
    })
  })

  describe('PROJECT_ROLE_PERMISSIONS', () => {
    it('owner has all project permissions', () => {
      const ownerPerms = PROJECT_ROLE_PERMISSIONS.owner
      expect(ownerPerms).toContain('project:view')
      expect(ownerPerms).toContain('project:edit')
      expect(ownerPerms).toContain('project:delete')
      expect(ownerPerms).toContain('project:invite')
      expect(ownerPerms).toContain('project:manage-members')
      expect(ownerPerms).toContain('time-entries:edit-all')
      expect(ownerPerms).toContain('time-sheets:approve')
    })

    it('expert can create and edit own entries but not edit all', () => {
      const expertPerms = PROJECT_ROLE_PERMISSIONS.expert
      expect(expertPerms).toContain('time-entries:create')
      expect(expertPerms).toContain('time-entries:edit-own')
      expect(expertPerms).not.toContain('time-entries:edit-all')
      expect(expertPerms).toContain('time-sheets:submit')
      expect(expertPerms).not.toContain('time-sheets:approve')
    })

    it('reviewer can approve time sheets but not create entries', () => {
      const reviewerPerms = PROJECT_ROLE_PERMISSIONS.reviewer
      expect(reviewerPerms).toContain('time-sheets:approve')
      expect(reviewerPerms).toContain('time-entries:view')
      expect(reviewerPerms).not.toContain('time-entries:create')
      expect(reviewerPerms).not.toContain('time-sheets:submit')
    })

    it('client has view access and can invite contacts', () => {
      const clientPerms = PROJECT_ROLE_PERMISSIONS.client
      expect(clientPerms).toContain('project:view')
      expect(clientPerms).toContain('time-entries:view')
      expect(clientPerms).toContain('contacts:invite')
      expect(clientPerms).not.toContain('time-entries:create')
      expect(clientPerms).not.toContain('project:edit')
    })

    it('viewer has minimal read-only access', () => {
      const viewerPerms = PROJECT_ROLE_PERMISSIONS.viewer
      expect(viewerPerms).toEqual(['project:view', 'time-entries:view', 'time-sheets:view'])
    })
  })

  describe('hasSystemPermission', () => {
    it('returns true for super_admin with any system permission', () => {
      const user = { role: 'super_admin' as const }
      expect(hasSystemPermission(user, 'users:view')).toBe(true)
      expect(hasSystemPermission(user, 'users:delete')).toBe(true)
      expect(hasSystemPermission(user, 'platform:manage')).toBe(true)
    })

    it('returns true for admin with allowed permissions', () => {
      const user = { role: 'admin' as const }
      expect(hasSystemPermission(user, 'users:view')).toBe(true)
      expect(hasSystemPermission(user, 'users:create')).toBe(true)
      expect(hasSystemPermission(user, 'organisations:edit')).toBe(true)
    })

    it('returns false for admin with restricted permissions', () => {
      const user = { role: 'admin' as const }
      expect(hasSystemPermission(user, 'users:delete')).toBe(false)
      expect(hasSystemPermission(user, 'platform:manage')).toBe(false)
    })

    it('returns false for user with no role', () => {
      expect(hasSystemPermission({ role: null }, 'users:view')).toBe(false)
      expect(hasSystemPermission({ role: undefined }, 'users:view')).toBe(false)
      expect(hasSystemPermission({}, 'users:view')).toBe(false)
    })
  })

  describe('hasProjectPermission', () => {
    it('returns true for owner with any project permission', () => {
      const membership = { role: 'owner' as const }
      expect(hasProjectPermission(membership, 'project:delete')).toBe(true)
      expect(hasProjectPermission(membership, 'time-entries:edit-all')).toBe(true)
      expect(hasProjectPermission(membership, 'time-sheets:approve')).toBe(true)
    })

    it('returns true for expert with allowed permissions', () => {
      const membership = { role: 'expert' as const }
      expect(hasProjectPermission(membership, 'time-entries:create')).toBe(true)
      expect(hasProjectPermission(membership, 'time-entries:edit-own')).toBe(true)
      expect(hasProjectPermission(membership, 'time-sheets:submit')).toBe(true)
    })

    it('returns false for expert with restricted permissions', () => {
      const membership = { role: 'expert' as const }
      expect(hasProjectPermission(membership, 'time-entries:edit-all')).toBe(false)
      expect(hasProjectPermission(membership, 'project:delete')).toBe(false)
      expect(hasProjectPermission(membership, 'time-sheets:approve')).toBe(false)
    })

    it('returns false for viewer with write permissions', () => {
      const membership = { role: 'viewer' as const }
      expect(hasProjectPermission(membership, 'time-entries:create')).toBe(false)
      expect(hasProjectPermission(membership, 'project:edit')).toBe(false)
    })
  })

  describe('canOnProject', () => {
    it('returns true for super_admin regardless of membership', () => {
      const user = { role: 'super_admin' as const }
      expect(canOnProject(user, null, 'project:delete')).toBe(true)
      expect(canOnProject(user, { role: 'viewer' }, 'time-entries:edit-all')).toBe(true)
    })

    it('returns true for admin regardless of membership', () => {
      const user = { role: 'admin' as const }
      expect(canOnProject(user, null, 'project:delete')).toBe(true)
    })

    it('returns false for regular user with no membership', () => {
      const user = { role: null }
      expect(canOnProject(user, null, 'project:view')).toBe(false)
    })

    it('returns result based on membership for regular users', () => {
      const user = { role: null }
      expect(canOnProject(user, { role: 'owner' }, 'project:delete')).toBe(true)
      expect(canOnProject(user, { role: 'expert' }, 'project:delete')).toBe(false)
      expect(canOnProject(user, { role: 'expert' }, 'time-entries:create')).toBe(true)
    })
  })

  describe('hasAnyProjectPermission', () => {
    it('returns true if membership has at least one permission', () => {
      const membership = { role: 'viewer' as const }
      expect(hasAnyProjectPermission(membership, ['project:view', 'project:edit'])).toBe(true)
    })

    it('returns false if membership has none of the permissions', () => {
      const membership = { role: 'viewer' as const }
      expect(hasAnyProjectPermission(membership, ['project:edit', 'project:delete'])).toBe(false)
    })

    it('returns true for owner with any combination', () => {
      const membership = { role: 'owner' as const }
      expect(hasAnyProjectPermission(membership, ['project:delete', 'time-sheets:approve'])).toBe(true)
    })
  })

  describe('isSystemRole', () => {
    it('returns true for super_admin', () => {
      expect(isSystemRole('super_admin')).toBe(true)
    })

    it('returns true for admin', () => {
      expect(isSystemRole('admin')).toBe(true)
    })

    it('returns false for null/undefined', () => {
      expect(isSystemRole(null)).toBe(false)
      expect(isSystemRole(undefined)).toBe(false)
    })

    it('returns false for project roles', () => {
      expect(isSystemRole('owner')).toBe(false)
      expect(isSystemRole('expert')).toBe(false)
    })
  })

  describe('getProjectPermissionsForRole', () => {
    it('returns all permissions for owner', () => {
      const perms = getProjectPermissionsForRole('owner')
      expect(perms.length).toBeGreaterThan(10)
      expect(perms).toContain('project:delete')
    })

    it('returns limited permissions for viewer', () => {
      const perms = getProjectPermissionsForRole('viewer')
      expect(perms).toHaveLength(3)
    })

    it('returns correct permissions for each role', () => {
      expect(getProjectPermissionsForRole('expert')).toContain('time-entries:create')
      expect(getProjectPermissionsForRole('reviewer')).toContain('time-sheets:approve')
      expect(getProjectPermissionsForRole('client')).toContain('contacts:invite')
    })
  })

  describe('canAccessSystemRoute', () => {
    it('returns true for super_admin on any system route', () => {
      const user = { role: 'super_admin' as const }
      expect(canAccessSystemRoute(user, '/dashboard/users')).toBe(true)
      expect(canAccessSystemRoute(user, '/dashboard/organisations')).toBe(true)
    })

    it('returns true for admin on user routes', () => {
      const user = { role: 'admin' as const }
      expect(canAccessSystemRoute(user, '/dashboard/users')).toBe(true)
    })

    it('returns false for user with no role on system routes', () => {
      const user = { role: null }
      expect(canAccessSystemRoute(user, '/dashboard/users')).toBe(false)
      expect(canAccessSystemRoute(user, '/dashboard/organisations')).toBe(false)
    })

    it('returns true for any user on non-system routes', () => {
      expect(canAccessSystemRoute({ role: null }, '/dashboard/projects')).toBe(true)
      expect(canAccessSystemRoute({ role: null }, '/dashboard/time-entries')).toBe(true)
    })
  })

  describe('canAccessProjectRoutes', () => {
    it('returns true if user has at least one project membership', () => {
      const memberships = [{ projectId: 'p1', role: 'viewer' as const }]
      expect(canAccessProjectRoutes(memberships)).toBe(true)
    })

    it('returns true with multiple memberships', () => {
      const memberships = [
        { projectId: 'p1', role: 'owner' as const },
        { projectId: 'p2', role: 'expert' as const },
      ]
      expect(canAccessProjectRoutes(memberships)).toBe(true)
    })

    it('returns false if user has no project memberships', () => {
      expect(canAccessProjectRoutes([])).toBe(false)
    })
  })

  describe('permission hierarchy consistency', () => {
    it('owner has all permissions that expert has', () => {
      const ownerPerms = new Set(PROJECT_ROLE_PERMISSIONS.owner)
      const expertPerms = PROJECT_ROLE_PERMISSIONS.expert

      // Expert perms that owner should also have (excluding -own variants replaced by -all)
      const expertPermsOwnerShouldHave = expertPerms.filter(
        p => !p.endsWith('-own') || !ownerPerms.has(p.replace('-own', '-all') as ProjectPermission)
      )

      for (const perm of expertPermsOwnerShouldHave) {
        if (!perm.endsWith('-own')) {
          expect(ownerPerms.has(perm)).toBe(true)
        }
      }
    })

    it('reviewer has project:view permission', () => {
      expect(PROJECT_ROLE_PERMISSIONS.reviewer).toContain('project:view')
    })

    it('all roles have at least project:view', () => {
      const roles = ['owner', 'expert', 'reviewer', 'client', 'viewer'] as const
      for (const role of roles) {
        expect(PROJECT_ROLE_PERMISSIONS[role]).toContain('project:view')
      }
    })
  })
})
