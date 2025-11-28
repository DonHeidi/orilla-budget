# Permission System

**Date:** 2025-11-27
**Status:** Completed
**Category:** Security & Authorization
**Completed:** 2025-11-28
**Parent:** [User Management & RBAC](./2025-11-27-user-management-rbac.md)

## Overview

This document details the granular permission system for Orilla Budget. The system uses a two-tier model:

1. **System permissions** - For platform administration (optional, from `users.role`)
2. **Project permissions** - For project-specific access (from `projectMembers.role`)

Most users will only have project permissions. System permissions are reserved for platform administrators.

---

## Permission Definitions

### System Permissions (Platform-Level)

```typescript
// src/lib/permissions.ts

/**
 * System permissions - granted by users.role (super_admin, admin)
 * These are for platform administration, not project work.
 */
export const SYSTEM_PERMISSIONS = {
  // Users (platform-level)
  'users:view': 'View all platform users',
  'users:create': 'Create new users',
  'users:edit': 'Edit user accounts',
  'users:delete': 'Delete user accounts',

  // Organisations (platform-level)
  'organisations:view': 'View all organisations',
  'organisations:create': 'Create organisations',
  'organisations:edit': 'Edit organisations',
  'organisations:delete': 'Delete organisations',

  // Platform settings
  'platform:manage': 'Manage platform settings',
} as const

export type SystemPermission = keyof typeof SYSTEM_PERMISSIONS
```

### Project Permissions (Project-Level)

```typescript
/**
 * Project permissions - granted by projectMembers.role
 * Scoped to specific projects the user is a member of.
 */
export const PROJECT_PERMISSIONS = {
  // Time Entries (within project)
  'time-entries:view': 'View time entries',
  'time-entries:create': 'Create time entries',
  'time-entries:edit-own': 'Edit own time entries',
  'time-entries:edit-all': 'Edit any time entry',
  'time-entries:delete-own': 'Delete own time entries',
  'time-entries:delete-all': 'Delete any time entry',

  // Time Sheets (within project)
  'time-sheets:view': 'View time sheets',
  'time-sheets:create': 'Create time sheets',
  'time-sheets:edit': 'Edit time sheets',
  'time-sheets:submit': 'Submit time sheets for approval',
  'time-sheets:approve': 'Approve/reject time sheets',

  // Project management
  'project:view': 'View project details',
  'project:edit': 'Edit project settings',
  'project:delete': 'Delete the project',
  'project:invite': 'Invite members to project',
  'project:manage-members': 'Manage project membership',

  // Contacts (within project context)
  'contacts:view': 'View project contacts',
  'contacts:invite': 'Invite contacts to project',
} as const

export type ProjectPermission = keyof typeof PROJECT_PERMISSIONS

// Combined for convenience
export const PERMISSIONS = {
  ...SYSTEM_PERMISSIONS,
  ...PROJECT_PERMISSIONS,
} as const

export type Permission = keyof typeof PERMISSIONS
```

---

## Role-to-Permission Mapping

### System Roles (users.role)

System roles grant platform-wide permissions. Most users won't have a system role.

```typescript
export const SYSTEM_ROLE_PERMISSIONS: Record<string, SystemPermission[]> = {
  super_admin: Object.keys(SYSTEM_PERMISSIONS) as SystemPermission[],  // All system permissions

  admin: [
    // Users - can manage but not delete
    'users:view', 'users:create', 'users:edit',
    // Organisations - full access
    'organisations:view', 'organisations:create',
    'organisations:edit', 'organisations:delete',
  ],
}
```

### Project Roles (projectMembers.role)

Project roles grant permissions scoped to specific projects.

```typescript
export const PROJECT_ROLE_PERMISSIONS: Record<string, ProjectPermission[]> = {
  owner: [
    // Full project control
    'project:view', 'project:edit', 'project:delete',
    'project:invite', 'project:manage-members',
    // Time entries - full access
    'time-entries:view', 'time-entries:create',
    'time-entries:edit-own', 'time-entries:edit-all',
    'time-entries:delete-own', 'time-entries:delete-all',
    // Time sheets - full access
    'time-sheets:view', 'time-sheets:create', 'time-sheets:edit',
    'time-sheets:submit', 'time-sheets:approve',
    // Contacts
    'contacts:view', 'contacts:invite',
  ],

  expert: [
    // Project - view only
    'project:view',
    // Time entries - CRUD own, view all
    'time-entries:view', 'time-entries:create',
    'time-entries:edit-own', 'time-entries:delete-own',
    // Time sheets - create and submit
    'time-sheets:view', 'time-sheets:create',
    'time-sheets:edit', 'time-sheets:submit',
    // Contacts - view only
    'contacts:view',
  ],

  reviewer: [
    // Project - view only
    'project:view',
    // Time entries - view only
    'time-entries:view',
    // Time sheets - view and approve
    'time-sheets:view', 'time-sheets:approve',
    // Contacts - view only
    'contacts:view',
  ],

  client: [
    // Project - view only
    'project:view',
    // Time entries - view only
    'time-entries:view',
    // Time sheets - view only
    'time-sheets:view',
    // Contacts - can invite others
    'contacts:view', 'contacts:invite',
  ],

  viewer: [
    // Minimal read-only access
    'project:view',
    'time-entries:view',
    'time-sheets:view',
  ],
}
```

---

## Permission Matrix

### System Permissions (by users.role)

| Permission | super_admin | admin |
|------------|-------------|-------|
| users:view | ✅ | ✅ |
| users:create | ✅ | ✅ |
| users:edit | ✅ | ✅ |
| users:delete | ✅ | ❌ |
| organisations:view | ✅ | ✅ |
| organisations:create | ✅ | ✅ |
| organisations:edit | ✅ | ✅ |
| organisations:delete | ✅ | ✅ |
| platform:manage | ✅ | ❌ |

### Project Permissions (by projectMembers.role)

#### Time Entries

| Permission | owner | expert | reviewer | client | viewer |
|------------|-------|--------|----------|--------|--------|
| view | ✅ | ✅ | ✅ | ✅ | ✅ |
| create | ✅ | ✅ | ❌ | ❌ | ❌ |
| edit-own | ✅ | ✅ | ❌ | ❌ | ❌ |
| edit-all | ✅ | ❌ | ❌ | ❌ | ❌ |
| delete-own | ✅ | ✅ | ❌ | ❌ | ❌ |
| delete-all | ✅ | ❌ | ❌ | ❌ | ❌ |

#### Time Sheets

| Permission | owner | expert | reviewer | client | viewer |
|------------|-------|--------|----------|--------|--------|
| view | ✅ | ✅ | ✅ | ✅ | ✅ |
| create | ✅ | ✅ | ❌ | ❌ | ❌ |
| edit | ✅ | ✅ | ❌ | ❌ | ❌ |
| submit | ✅ | ✅ | ❌ | ❌ | ❌ |
| approve | ✅ | ❌ | ✅ | ❌ | ❌ |

#### Project Management

| Permission | owner | expert | reviewer | client | viewer |
|------------|-------|--------|----------|--------|--------|
| project:view | ✅ | ✅ | ✅ | ✅ | ✅ |
| project:edit | ✅ | ❌ | ❌ | ❌ | ❌ |
| project:delete | ✅ | ❌ | ❌ | ❌ | ❌ |
| project:invite | ✅ | ❌ | ❌ | ❌ | ❌ |
| project:manage-members | ✅ | ❌ | ❌ | ❌ | ❌ |

#### Contacts

| Permission | owner | expert | reviewer | client | viewer |
|------------|-------|--------|----------|--------|--------|
| contacts:view | ✅ | ✅ | ✅ | ✅ | ❌ |
| contacts:invite | ✅ | ❌ | ❌ | ✅ | ❌ |

---

## Permission Utilities

### Core Functions

```typescript
// src/lib/permissions.ts

/**
 * Check if a user has a system permission (via users.role)
 */
export function hasSystemPermission(
  user: { role?: string | null },
  permission: SystemPermission
): boolean {
  if (!user.role) return false
  const permissions = SYSTEM_ROLE_PERMISSIONS[user.role] || []
  return permissions.includes(permission)
}

/**
 * Check if a user has a project permission (via projectMembers.role)
 */
export function hasProjectPermission(
  membership: { role: string },
  permission: ProjectPermission
): boolean {
  const permissions = PROJECT_ROLE_PERMISSIONS[membership.role] || []
  return permissions.includes(permission)
}

/**
 * Check if user can perform action on a specific project
 * Combines system role check (admins can do anything) with project membership
 */
export function canOnProject(
  user: { role?: string | null },
  projectMembership: { role: string } | null,
  permission: ProjectPermission
): boolean {
  // System admins have full access
  if (user.role === 'super_admin' || user.role === 'admin') {
    return true
  }

  // Check project membership
  if (!projectMembership) return false
  return hasProjectPermission(projectMembership, permission)
}

/**
 * Check if user has ANY of the specified project permissions
 */
export function hasAnyProjectPermission(
  membership: { role: string },
  permissions: ProjectPermission[]
): boolean {
  return permissions.some(p => hasProjectPermission(membership, p))
}

/**
 * Check if a role is a system (admin) role
 */
export function isSystemRole(role: string | null | undefined): boolean {
  return role === 'super_admin' || role === 'admin'
}

/**
 * Get all project permissions for a role
 */
export function getProjectPermissionsForRole(role: string): ProjectPermission[] {
  return PROJECT_ROLE_PERMISSIONS[role] || []
}
```

### Route Permission Mapping

```typescript
// src/lib/permissions.ts

/**
 * System routes - require system permissions
 */
export const SYSTEM_ROUTE_PERMISSIONS: Record<string, SystemPermission[]> = {
  '/dashboard/users': ['users:view'],
  '/dashboard/organisations': ['organisations:view'],
}

/**
 * Check if user can access a system route
 */
export function canAccessSystemRoute(
  user: { role?: string | null },
  route: string
): boolean {
  const requiredPermissions = SYSTEM_ROUTE_PERMISSIONS[route]
  if (!requiredPermissions) return true  // Not a system route
  if (!user.role) return false
  return requiredPermissions.some(p => hasSystemPermission(user, p))
}

/**
 * Project routes - accessible if user has ANY project membership
 * Specific project access is checked at the data level
 */
export const PROJECT_ROUTES = [
  '/dashboard/projects',
  '/dashboard/time-entries',
  '/dashboard/time-sheets',
  '/dashboard/contacts',
]

/**
 * Check if user can access project routes (has any project membership)
 */
export function canAccessProjectRoutes(
  projectMemberships: { projectId: string; role: string }[]
): boolean {
  return projectMemberships.length > 0
}
```

---

## Authentication Context Integration

### Auth Context Types

```typescript
// src/lib/auth/types.ts
import type { SystemPermission, ProjectPermission } from '../permissions'

export interface ProjectMembership {
  projectId: string
  projectName: string
  role: 'owner' | 'expert' | 'reviewer' | 'client' | 'viewer'
}

export interface AuthContextValue {
  user: AuthenticatedUser | null
  isAuthenticated: boolean
  isSystemAdmin: boolean  // Has super_admin or admin role
  projectMemberships: ProjectMembership[]

  // System permission helpers
  canSystem: (permission: SystemPermission) => boolean

  // Project permission helpers (requires project context)
  canOnProject: (projectId: string, permission: ProjectPermission) => boolean
  canAnyOnProject: (projectId: string, permissions: ProjectPermission[]) => boolean

  // Get user's role on a specific project
  getProjectRole: (projectId: string) => string | null
}
```

### useAuth Hook

See [Unified Dashboard](./2025-11-27-unified-dashboard.md#authprovider-component) for the full `useAuth` implementation.

```typescript
// Usage in components:
function ProjectTimeEntries({ projectId }: { projectId: string }) {
  const { canOnProject, isSystemAdmin } = useAuth()

  return (
    <div>
      {/* System admins or project members with permission */}
      {canOnProject(projectId, 'time-entries:create') && (
        <Button>New Time Entry</Button>
      )}
      {canOnProject(projectId, 'time-sheets:approve') && (
        <Button>Approve Time Sheet</Button>
      )}
    </div>
  )
}

function AdminPanel() {
  const { canSystem } = useAuth()

  return (
    <div>
      {canSystem('users:create') && <Button>Add User</Button>}
    </div>
  )
}
```

---

## Server-Side Permission Checks

### Middleware Helper

```typescript
// src/lib/auth/middleware.ts
import { redirect } from '@tanstack/react-router'
import { hasSystemPermission, type SystemPermission } from '../permissions'

/**
 * Create a beforeLoad guard that requires system permissions
 */
export function requireSystemPermission(permission: SystemPermission) {
  return async ({ context }: { context: { auth: AuthSession } }) => {
    if (!context.auth.user) {
      throw redirect({ to: '/dashboard/login' })
    }

    if (!hasSystemPermission(context.auth.user, permission)) {
      throw redirect({ to: '/dashboard' })  // or throw 403
    }
  }
}

/**
 * Create a beforeLoad guard that requires any project membership
 */
export function requireAnyProjectMembership() {
  return async ({ context }: { context: { auth: AuthSession } }) => {
    if (!context.auth.user) {
      throw redirect({ to: '/dashboard/login' })
    }

    // System admins always have access
    if (context.auth.user.role === 'super_admin' || context.auth.user.role === 'admin') {
      return
    }

    if (context.auth.projectMemberships.length === 0) {
      throw redirect({ to: '/dashboard' })
    }
  }
}
```

### Server Function Authorization

```typescript
// Example: Protected server function with project-scoped permission
import { createServerFn } from '@tanstack/start'
import { canOnProject } from '@/lib/permissions'
import { getSessionFromContext } from '@/lib/auth'

const deleteTimeEntryFn = createServerFn({ method: 'POST' })
  .validator(z.object({ timeEntryId: z.string(), projectId: z.string() }))
  .handler(async ({ data, context }) => {
    const session = await getSessionFromContext(context)

    if (!session.user) {
      throw new Error('Unauthorized')
    }

    // Get user's membership for this project
    const membership = session.projectMemberships.find(
      m => m.projectId === data.projectId
    )

    // Check permission (admins bypass, otherwise check membership)
    if (!canOnProject(session.user, membership ?? null, 'time-entries:delete-all')) {
      // Check if they can at least delete their own
      const entry = await timeEntryRepository.findById(data.timeEntryId)
      if (entry?.userId !== session.user.id ||
          !canOnProject(session.user, membership ?? null, 'time-entries:delete-own')) {
        throw new Error('Forbidden: You do not have permission to delete this time entry')
      }
    }

    await timeEntryRepository.delete(data.timeEntryId)
    return { success: true }
  })
```

---

## Zod Schemas

```typescript
// src/schemas.ts

export const systemPermissionSchema = z.enum([
  'users:view',
  'users:create',
  'users:edit',
  'users:delete',
  'organisations:view',
  'organisations:create',
  'organisations:edit',
  'organisations:delete',
  'platform:manage',
])

export const projectPermissionSchema = z.enum([
  'time-entries:view',
  'time-entries:create',
  'time-entries:edit-own',
  'time-entries:edit-all',
  'time-entries:delete-own',
  'time-entries:delete-all',
  'time-sheets:view',
  'time-sheets:create',
  'time-sheets:edit',
  'time-sheets:submit',
  'time-sheets:approve',
  'project:view',
  'project:edit',
  'project:delete',
  'project:invite',
  'project:manage-members',
  'contacts:view',
  'contacts:invite',
])

export const systemRoleSchema = z.enum(['super_admin', 'admin'])
export const projectRoleSchema = z.enum(['owner', 'expert', 'reviewer', 'client', 'viewer'])

export type SystemPermission = z.infer<typeof systemPermissionSchema>
export type ProjectPermission = z.infer<typeof projectPermissionSchema>
export type SystemRole = z.infer<typeof systemRoleSchema>
export type ProjectRole = z.infer<typeof projectRoleSchema>
```

---

## Testing Utilities

```typescript
// src/test/permission-helpers.ts

/**
 * Create a mock user with optional system role
 */
export function createMockUser(role?: 'super_admin' | 'admin' | null) {
  return { id: 'test-user', role: role ?? null }
}

/**
 * Create a mock project membership
 */
export function createMockMembership(
  role: 'owner' | 'expert' | 'reviewer' | 'client' | 'viewer'
) {
  return { projectId: 'test-project', role }
}

/**
 * Test that a project role has expected permissions
 */
export function expectProjectRolePermissions(
  role: string,
  expectedPermissions: ProjectPermission[]
) {
  const membership = createMockMembership(role as any)
  for (const permission of expectedPermissions) {
    expect(hasProjectPermission(membership, permission)).toBe(true)
  }
}

/**
 * Test that a project role does NOT have certain permissions
 */
export function expectProjectRoleLacksPermissions(
  role: string,
  forbiddenPermissions: ProjectPermission[]
) {
  const membership = createMockMembership(role as any)
  for (const permission of forbiddenPermissions) {
    expect(hasProjectPermission(membership, permission)).toBe(false)
  }
}
```

---

## Future Considerations

### Custom Project Permissions (Phase 5+)

If granular per-member permission overrides become necessary:

```typescript
// Potential future schema
export const memberPermissionOverrides = sqliteTable('member_permission_overrides', {
  id: text('id').primaryKey(),
  projectMemberId: text('project_member_id').references(() => projectMembers.id),
  permission: text('permission').notNull(),
  granted: integer('granted', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
})

// Modified hasProjectPermission to check custom overrides
export async function hasProjectPermission(
  membership: { id: string; role: string },
  permission: ProjectPermission
) {
  // Check custom override first
  const override = await memberPermissionRepository.find(membership.id, permission)
  if (override) return override.granted

  // Fall back to role-based permission
  return PROJECT_ROLE_PERMISSIONS[membership.role]?.includes(permission) ?? false
}
```

### Organisation-Level Permissions (Paid Accounts)

For paid organisation accounts, org admins may have elevated permissions:

```typescript
// Organisation membership for paid accounts
export const organisationMembers = sqliteTable('organisation_members', {
  id: text('id').primaryKey(),
  organisationId: text('organisation_id').references(() => organisations.id),
  userId: text('user_id').references(() => users.id),
  role: text('role', { enum: ['owner', 'admin', 'member'] }).notNull(),
  createdAt: text('created_at').notNull(),
})

// Org admins can manage all projects within their org
export function canManageOrgProjects(
  user: { id: string },
  orgMembership: { role: string } | null
): boolean {
  return orgMembership?.role === 'owner' || orgMembership?.role === 'admin'
}
```

### Permission Groups

For easier UI/API management of related permissions:

```typescript
export const PROJECT_PERMISSION_GROUPS = {
  'time-tracking': [
    'time-entries:view', 'time-entries:create',
    'time-entries:edit-own', 'time-entries:delete-own',
    'time-sheets:view', 'time-sheets:create', 'time-sheets:edit',
  ],
  'approval': [
    'time-sheets:approve',
  ],
  'project-management': [
    'project:edit', 'project:delete',
    'project:invite', 'project:manage-members',
  ],
}
```
