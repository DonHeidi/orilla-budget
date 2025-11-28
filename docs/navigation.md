# Navigation & Permission-Based UI

This document explains the approach to navigation and permission-based UI rendering in TanStack Start applications.

## Core Principle

**Navigation and permission-based UI should be handled inline within route layouts, not through a separate navigation domain or config system.**

## Why Not a Navigation Config?

A common pattern in React applications is to define navigation as a separate configuration:

```typescript
// ❌ Avoid this pattern in TanStack Start
// src/lib/navigation.ts
export const navigationConfig = [
  { id: 'projects', href: '/projects', permissions: ['projects:view'] },
  { id: 'users', href: '/users', permissions: ['users:view'] },
]

// src/hooks/useNavigation.ts
export function useNavigation() {
  const { user } = useAuth()
  return navigationConfig.filter(item =>
    hasPermission(user, item.permissions)
  )
}
```

**Problems with this approach in TanStack Start**:

1. **Unnecessary client-side filtering**: The navigation config is defined statically, then filtered on the client based on auth state. This adds complexity and potential flicker.

2. **Indirection**: Navigation structure is separated from the route layout where it's rendered, making it harder to understand the full picture.

3. **Over-engineering**: For most applications, navigation is tightly coupled to a specific layout route. A separate abstraction adds cognitive overhead without proportional benefit.

4. **Stale data risk**: If the navigation config references permissions that changed, the filtering logic may become inconsistent.

## The TanStack Start Way

TanStack Start runs `beforeLoad` and `loader` on the server. This means:

1. **Authentication is resolved server-side** before the component renders
2. **Permissions are available immediately** via route context
3. **No loading states needed** for permission checks
4. **No client-side filtering** - the server already knows what to show

### Implementation Pattern

```typescript
// src/routes/expert.tsx
import { createFileRoute, redirect, Link, Outlet } from '@tanstack/react-router'
import { getCurrentSessionFn } from '@/lib/auth/session.server'
import { hasSystemPermission } from '@/lib/permissions'
import type { AuthSession } from '@/lib/auth/types'

export const Route = createFileRoute('/expert')({
  component: ExpertLayout,
  beforeLoad: async () => {
    // 1. Auth check runs on server
    const session = await getCurrentSessionFn()
    if (!session.user) {
      throw redirect({ to: '/login' })
    }
    // 2. Session passed to component via route context
    return { auth: session }
  },
  loader: () => getDataFn(),
})

function ExpertLayout() {
  // 3. Access auth from route context (already resolved)
  const { auth } = Route.useRouteContext() as { auth: AuthSession }

  // 4. Derive permissions - no async, no loading state
  const user = auth.user
  const canViewUsers = user && hasSystemPermission(user, 'users:view')
  const canViewOrgs = user && hasSystemPermission(user, 'organisations:view')
  const hasProjects = auth.projectMemberships.length > 0

  return (
    <div className="flex">
      <Sidebar>
        {/* Always visible */}
        <SidebarItem>
          <Link to="/expert/time-entries">Time Entries</Link>
        </SidebarItem>

        {/* Conditionally visible based on project membership */}
        {hasProjects && (
          <SidebarItem>
            <Link to="/expert/projects">Projects</Link>
          </SidebarItem>
        )}

        {/* Admin section - permission gated */}
        {(canViewUsers || canViewOrgs) && (
          <SidebarGroup label="Administration">
            {canViewUsers && (
              <SidebarItem>
                <Link to="/admin/users">Users</Link>
              </SidebarItem>
            )}
            {canViewOrgs && (
              <SidebarItem>
                <Link to="/admin/organisations">Organisations</Link>
              </SidebarItem>
            )}
          </SidebarGroup>
        )}
      </Sidebar>

      <main>
        <Outlet />
      </main>
    </div>
  )
}
```

## Benefits

### 1. Server-Side Resolution

The `beforeLoad` function runs on the server. By the time your component renders:
- User is authenticated (or redirected to login)
- Permissions are known
- No loading states or skeleton UI needed for nav

### 2. Colocation

Navigation lives in the layout route file. When you open `expert.tsx`, you see:
- What data is loaded
- What auth checks are performed
- What navigation items exist
- What permissions gate each item

This makes the code easier to understand and maintain.

### 3. Type Safety

TanStack Router provides excellent TypeScript support. Route context is typed, and you get autocomplete for route paths:

```typescript
// TypeScript knows auth exists because beforeLoad returns it
const { auth } = Route.useRouteContext()

// TypeScript validates the route path
<Link to="/expert/projects">Projects</Link>
```

### 4. Simplicity

No need for:
- Navigation config files
- useNavigation hooks
- Permission filtering utilities
- Separate sidebar components

Just standard React conditional rendering with data from route context.

## When to Consider a Navigation Config

The inline approach works well for most applications. Consider a separate navigation system if:

1. **Multiple layouts share identical navigation** - If 5+ layout routes render the exact same nav structure, a shared config reduces duplication.

2. **Plugin architecture** - If external modules contribute navigation items at runtime.

3. **Navigation from database** - If menu items are stored in a database and managed by admins.

4. **Very large applications** - 50+ navigation items with complex permission rules might benefit from a declarative config.

For Orilla Budget, none of these apply. The inline approach is simpler and more maintainable.

## Permission Helpers

While navigation is inline, permission checking utilities are still useful:

```typescript
// src/lib/permissions.ts
export type SystemPermission = 'users:view' | 'users:edit' | 'organisations:view' | ...

export function hasSystemPermission(
  user: { role: 'super_admin' | 'admin' | null },
  permission: SystemPermission
): boolean {
  // super_admin has all permissions
  if (user.role === 'super_admin') return true

  // admin has specific permissions
  if (user.role === 'admin') {
    return ADMIN_PERMISSIONS.includes(permission)
  }

  return false
}
```

These utilities are pure functions that take user data and return booleans. They don't manage state or side effects.

## Summary

| Aspect | Navigation Config | Inline Approach |
|--------|------------------|-----------------|
| Where nav defined | Separate file | Route layout |
| Permission filtering | Client-side hook | Render-time conditionals |
| Server integration | Manual sync needed | Natural via route context |
| Complexity | Higher | Lower |
| Best for | Large/plugin apps | Most applications |

For TanStack Start applications, **start with the inline approach**. Only introduce a navigation config when you have a clear need that justifies the added complexity.
