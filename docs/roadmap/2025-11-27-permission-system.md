# Permission System

**Date:** 2025-11-27
**Status:** Planned
**Category:** Security & Authorization
**Parent:** [User Management & RBAC](./2025-11-27-user-management-rbac.md)

## Overview

This document details the granular permission system for Orilla Budget. The system defines ~25 individual permissions that are mapped to 7 roles (4 internal, 3 client).

---

## Permission Definitions

```typescript
// src/lib/permissions.ts
export const PERMISSIONS = {
  // Time Entries
  'time-entries:view': 'View time entries',
  'time-entries:view-all': 'View all time entries (cross-org)',
  'time-entries:create': 'Create time entries',
  'time-entries:edit': 'Edit time entries',
  'time-entries:delete': 'Delete time entries',
  'time-entries:approve': 'Approve time entries',

  // Time Sheets
  'time-sheets:view': 'View time sheets',
  'time-sheets:create': 'Create time sheets',
  'time-sheets:edit': 'Edit time sheets',
  'time-sheets:submit': 'Submit time sheets for approval',
  'time-sheets:approve': 'Approve/reject time sheets',

  // Projects
  'projects:view': 'View projects',
  'projects:view-all': 'View all projects (cross-org)',
  'projects:create': 'Create projects',
  'projects:edit': 'Edit projects',
  'projects:delete': 'Delete projects',

  // Organisations
  'organisations:view': 'View organisations',
  'organisations:create': 'Create organisations',
  'organisations:edit': 'Edit organisations',
  'organisations:delete': 'Delete organisations',

  // Accounts
  'accounts:view': 'View accounts',
  'accounts:create': 'Create accounts',
  'accounts:edit': 'Edit accounts',
  'accounts:delete': 'Delete accounts',
  'accounts:invite': 'Send account invitations',

  // Users (internal)
  'users:view': 'View users',
  'users:create': 'Create users',
  'users:edit': 'Edit users',
  'users:delete': 'Delete users',

  // Settings
  'settings:view': 'View own settings',
  'settings:edit': 'Edit own settings',
} as const

export type Permission = keyof typeof PERMISSIONS
```

---

## Role-to-Permission Mapping

### Internal Roles

```typescript
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  super_admin: Object.keys(PERMISSIONS) as Permission[],  // All permissions

  admin: [
    // Time Entries - full access
    'time-entries:view', 'time-entries:view-all', 'time-entries:create',
    'time-entries:edit', 'time-entries:delete', 'time-entries:approve',
    // Time Sheets - full access
    'time-sheets:view', 'time-sheets:create', 'time-sheets:edit',
    'time-sheets:submit', 'time-sheets:approve',
    // Projects - full access
    'projects:view', 'projects:view-all', 'projects:create',
    'projects:edit', 'projects:delete',
    // Organisations - full access
    'organisations:view', 'organisations:create',
    'organisations:edit', 'organisations:delete',
    // Accounts - full access
    'accounts:view', 'accounts:create', 'accounts:edit',
    'accounts:delete', 'accounts:invite',
    // Users - can manage but not delete
    'users:view', 'users:create', 'users:edit',
    // Settings
    'settings:view', 'settings:edit',
  ],

  expert: [
    // Time Entries - CRUD, no approve
    'time-entries:view', 'time-entries:view-all', 'time-entries:create',
    'time-entries:edit', 'time-entries:delete',
    // Time Sheets - CRUD, no approve
    'time-sheets:view', 'time-sheets:create', 'time-sheets:edit',
    'time-sheets:submit',
    // Projects - view all, create, edit (no delete)
    'projects:view', 'projects:view-all', 'projects:create',
    'projects:edit',
    // Organisations - view only
    'organisations:view',
    // Accounts - view only
    'accounts:view',
    // Settings
    'settings:view', 'settings:edit',
  ],

  viewer: [
    // Read-only access
    'time-entries:view', 'time-entries:view-all',
    'time-sheets:view',
    'projects:view', 'projects:view-all',
    'organisations:view',
    'settings:view',
  ],
}
```

### Client Roles

Client roles are scoped to their organisation - they only see data for their org.

```typescript
// Client roles (continued in ROLE_PERMISSIONS)
{
  project_manager: [
    // Time Entries - CRUD within their org
    'time-entries:view', 'time-entries:create', 'time-entries:edit',
    // Time Sheets - CRUD, submit within their org
    'time-sheets:view', 'time-sheets:create', 'time-sheets:edit',
    'time-sheets:submit',
    // Projects - view only
    'projects:view',
    // Settings
    'settings:view', 'settings:edit',
  ],

  finance: [
    // Time Entries - view only
    'time-entries:view',
    // Time Sheets - view and approve
    'time-sheets:view', 'time-sheets:approve',
    // Projects - view only
    'projects:view',
    // Settings
    'settings:view',
  ],

  contact: [
    // Minimal read-only access
    'time-entries:view',
    'time-sheets:view',
    'projects:view',
    'settings:view',
  ],
}
```

---

## Permission Matrix

### Time Entries

| Permission | super_admin | admin | expert | viewer | project_manager | finance | contact |
|------------|-------------|-------|--------|--------|-----------------|---------|---------|
| view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| view-all | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| create | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| edit | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| delete | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| approve | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Time Sheets

| Permission | super_admin | admin | expert | viewer | project_manager | finance | contact |
|------------|-------------|-------|--------|--------|-----------------|---------|---------|
| view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| create | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| edit | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| submit | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| approve | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |

### Projects

| Permission | super_admin | admin | expert | viewer | project_manager | finance | contact |
|------------|-------------|-------|--------|--------|-----------------|---------|---------|
| view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| view-all | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| create | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| edit | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Organisations

| Permission | super_admin | admin | expert | viewer | project_manager | finance | contact |
|------------|-------------|-------|--------|--------|-----------------|---------|---------|
| view | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| create | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| edit | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Accounts

| Permission | super_admin | admin | expert | viewer | project_manager | finance | contact |
|------------|-------------|-------|--------|--------|-----------------|---------|---------|
| view | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| create | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| edit | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| invite | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Users

| Permission | super_admin | admin | expert | viewer | project_manager | finance | contact |
|------------|-------------|-------|--------|--------|-----------------|---------|---------|
| view | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| create | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| edit | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| delete | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Settings

| Permission | super_admin | admin | expert | viewer | project_manager | finance | contact |
|------------|-------------|-------|--------|--------|-----------------|---------|---------|
| view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| edit | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |

---

## Permission Utilities

### Core Functions

```typescript
// src/lib/permissions.ts

/**
 * Check if a user/account has a specific permission
 */
export function hasPermission(
  user: { role: string },
  permission: Permission
): boolean {
  const permissions = ROLE_PERMISSIONS[user.role] || []
  return permissions.includes(permission)
}

/**
 * Check if a user/account has ANY of the specified permissions
 */
export function hasAnyPermission(
  user: { role: string },
  permissions: Permission[]
): boolean {
  return permissions.some(p => hasPermission(user, p))
}

/**
 * Check if a user/account has ALL of the specified permissions
 */
export function hasAllPermissions(
  user: { role: string },
  permissions: Permission[]
): boolean {
  return permissions.every(p => hasPermission(user, p))
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: string): Permission[] {
  return ROLE_PERMISSIONS[role] || []
}

/**
 * Check if a role is an internal (user) role
 */
export function isInternalRole(role: string): boolean {
  return ['super_admin', 'admin', 'expert', 'viewer'].includes(role)
}

/**
 * Check if a role is a client (account) role
 */
export function isClientRole(role: string): boolean {
  return ['project_manager', 'finance', 'contact'].includes(role)
}
```

### Route Permission Mapping

```typescript
// src/lib/permissions.ts

/**
 * Maps routes to required permissions
 * User needs ANY of the listed permissions to access the route
 */
export const ROUTE_PERMISSIONS: Record<string, Permission[]> = {
  '/dashboard/time-entries': ['time-entries:view'],
  '/dashboard/time-sheets': ['time-sheets:view'],
  '/dashboard/projects': ['projects:view'],
  '/dashboard/organisations': ['organisations:view'],
  '/dashboard/accounts': ['accounts:view'],
  '/dashboard/users': ['users:view'],
  '/dashboard/settings': ['settings:view'],
}

/**
 * Check if a user can access a specific route
 */
export function canAccessRoute(
  user: { role: string },
  route: string
): boolean {
  const requiredPermissions = ROUTE_PERMISSIONS[route]
  if (!requiredPermissions) return true  // No restrictions defined
  return hasAnyPermission(user, requiredPermissions)
}
```

---

## Authentication Context Integration

### Auth Context Types

```typescript
// src/lib/auth/types.ts
import type { Permission } from '../permissions'

export interface AuthContextValue {
  user: AuthenticatedUser | null
  isAuthenticated: boolean

  // Permission helpers bound to current user
  can: (permission: Permission) => boolean
  canAny: (permissions: Permission[]) => boolean
  canAll: (permissions: Permission[]) => boolean
}
```

### useAuth Hook

See [Unified Dashboard](./2025-11-27-unified-dashboard.md#authprovider-component) for the full `useAuth` implementation.

```typescript
// Usage in components:
function MyComponent() {
  const { can, canAny } = useAuth()

  return (
    <div>
      {can('projects:create') && <Button>New Project</Button>}
      {canAny(['time-sheets:approve', 'time-entries:approve']) && (
        <Button>Approve</Button>
      )}
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
import { hasPermission, hasAnyPermission, type Permission } from '../permissions'

/**
 * Create a beforeLoad guard that requires specific permissions
 */
export function requirePermission(permission: Permission) {
  return async ({ context }: { context: { auth: AuthContext } }) => {
    if (!context.auth.user) {
      throw redirect({ to: '/dashboard/login' })
    }

    if (!hasPermission(context.auth.user, permission)) {
      throw redirect({ to: '/dashboard' })  // or throw 403
    }
  }
}

/**
 * Create a beforeLoad guard that requires any of the specified permissions
 */
export function requireAnyPermission(permissions: Permission[]) {
  return async ({ context }: { context: { auth: AuthContext } }) => {
    if (!context.auth.user) {
      throw redirect({ to: '/dashboard/login' })
    }

    if (!hasAnyPermission(context.auth.user, permissions)) {
      throw redirect({ to: '/dashboard' })
    }
  }
}
```

### Server Function Authorization

```typescript
// Example: Protected server function
import { createServerFn } from '@tanstack/start'
import { hasPermission } from '@/lib/permissions'
import { getSessionFromContext } from '@/lib/auth'

const deleteProjectFn = createServerFn({ method: 'POST' })
  .validator(z.object({ projectId: z.string() }))
  .handler(async ({ data, context }) => {
    const session = await getSessionFromContext(context)

    if (!session.user) {
      throw new Error('Unauthorized')
    }

    if (!hasPermission(session.user, 'projects:delete')) {
      throw new Error('Forbidden: You do not have permission to delete projects')
    }

    await projectRepository.delete(data.projectId)
    return { success: true }
  })
```

---

## Zod Schemas

```typescript
// src/schemas.ts

export const permissionSchema = z.enum([
  'time-entries:view',
  'time-entries:view-all',
  'time-entries:create',
  'time-entries:edit',
  'time-entries:delete',
  'time-entries:approve',
  'time-sheets:view',
  'time-sheets:create',
  'time-sheets:edit',
  'time-sheets:submit',
  'time-sheets:approve',
  'projects:view',
  'projects:view-all',
  'projects:create',
  'projects:edit',
  'projects:delete',
  'organisations:view',
  'organisations:create',
  'organisations:edit',
  'organisations:delete',
  'accounts:view',
  'accounts:create',
  'accounts:edit',
  'accounts:delete',
  'accounts:invite',
  'users:view',
  'users:create',
  'users:edit',
  'users:delete',
  'settings:view',
  'settings:edit',
])

export const internalRoleSchema = z.enum(['super_admin', 'admin', 'expert', 'viewer'])
export const clientRoleSchema = z.enum(['project_manager', 'finance', 'contact'])
export const roleSchema = z.union([internalRoleSchema, clientRoleSchema])

export type Permission = z.infer<typeof permissionSchema>
export type InternalRole = z.infer<typeof internalRoleSchema>
export type ClientRole = z.infer<typeof clientRoleSchema>
export type Role = z.infer<typeof roleSchema>
```

---

## Testing Utilities

```typescript
// src/test/permission-helpers.ts

/**
 * Create a mock user with a specific role for testing
 */
export function createMockUser(role: string) {
  return { role }
}

/**
 * Test that a role has expected permissions
 */
export function expectRolePermissions(
  role: string,
  expectedPermissions: Permission[]
) {
  const user = createMockUser(role)
  for (const permission of expectedPermissions) {
    expect(hasPermission(user, permission)).toBe(true)
  }
}

/**
 * Test that a role does NOT have certain permissions
 */
export function expectRoleLacksPermissions(
  role: string,
  forbiddenPermissions: Permission[]
) {
  const user = createMockUser(role)
  for (const permission of forbiddenPermissions) {
    expect(hasPermission(user, permission)).toBe(false)
  }
}
```

---

## Future Considerations

### Custom Permissions (Phase 5+)

If granular per-user permissions become necessary:

```typescript
// Potential future schema
export const userPermissions = sqliteTable('user_permissions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  permission: text('permission').notNull(),
  granted: integer('granted', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
})

// Modified hasPermission to check custom overrides
export async function hasPermission(userId: string, permission: Permission) {
  // Check custom override first
  const override = await userPermissionRepository.find(userId, permission)
  if (override) return override.granted

  // Fall back to role-based permission
  const user = await userRepository.findById(userId)
  return ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false
}
```

### Permission Groups

For easier management of related permissions:

```typescript
export const PERMISSION_GROUPS = {
  'time-tracking': [
    'time-entries:view', 'time-entries:create', 'time-entries:edit',
    'time-sheets:view', 'time-sheets:create', 'time-sheets:edit',
  ],
  'approval': [
    'time-entries:approve', 'time-sheets:approve',
  ],
  'administration': [
    'users:view', 'users:create', 'users:edit', 'users:delete',
    'accounts:view', 'accounts:create', 'accounts:edit', 'accounts:delete',
  ],
}
```
