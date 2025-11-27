# Unified Dashboard Architecture

**Date:** 2025-11-27
**Status:** Planned
**Category:** Architecture & UI
**Parent:** [User Management & RBAC](./2025-11-27-user-management-rbac.md)

## Overview

This document details the unified dashboard architecture that merges the Expert Dashboard (`/expert`), Admin Dashboard (`/admin`), and Client Portal (`/portal`) into a single `/dashboard` route with permission-based UI rendering.

---

## Design Principles

1. **Single entry point** - All users (internal and clients) access `/dashboard`
2. **Permission-based visibility** - UI adapts to user's permissions; unauthorized items are hidden completely
3. **Data scoping** - Clients only see their organisation's data; internal users see all
4. **Consistent experience** - Same components, different data/capabilities based on role

---

## Route Structure

```
src/routes/
├── __root.tsx                    # Root layout (theme, base HTML)
├── index.tsx                     # Public landing page
├── dashboard.tsx                 # Dashboard layout with AuthProvider + Sidebar
├── dashboard/
│   ├── login.tsx                 # Email/password login (public)
│   ├── invite.$code.tsx          # Client invitation acceptance (public)
│   ├── _authenticated.tsx        # Auth guard layout (pathless)
│   └── _authenticated/
│       ├── index.tsx             # Dashboard home/overview
│       ├── time-entries.tsx      # Time entries list
│       ├── time-entries.$id.tsx  # Time entry detail
│       ├── time-sheets.tsx       # Time sheets list
│       ├── time-sheets.$id.tsx   # Time sheet detail
│       ├── projects.tsx          # Projects list
│       ├── projects.$id.tsx      # Project detail
│       ├── organisations.tsx     # Organisations list
│       ├── organisations.$id.tsx # Organisation detail
│       ├── accounts.tsx          # Accounts list
│       ├── accounts.$id.tsx      # Account detail
│       ├── users.tsx             # User management
│       ├── users.$id.tsx         # User detail
│       └── settings.tsx          # User settings/profile
```

---

## Route Migration Mapping

| Old Route | New Route | Visible To |
|-----------|-----------|------------|
| `/expert` | `/dashboard` | All authenticated users |
| `/expert/time-entries` | `/dashboard/time-entries` | All (scoped for clients) |
| `/expert/time-sheets` | `/dashboard/time-sheets` | All (scoped for clients) |
| `/expert/projects` | `/dashboard/projects` | All (scoped for clients) |
| `/expert/organisations` | `/dashboard/organisations` | admin, super_admin |
| `/expert/accounts` | `/dashboard/accounts` | admin, super_admin |
| `/admin/users` | `/dashboard/users` | admin, super_admin |
| `/portal` | `/dashboard` (client login) | Removed - clients use unified dashboard |

---

## Navigation Configuration

### Data-Driven Sidebar Schema

```typescript
// src/lib/navigation.ts
import type { LucideIcon } from 'lucide-react'
import type { Permission } from './permissions'

export interface NavItem {
  id: string
  label: string
  href: string
  icon: LucideIcon
  requiredPermissions?: Permission[]  // Show if user has ANY of these
  children?: NavItem[]
}

export interface NavGroup {
  id: string
  label: string
  items: NavItem[]
  requiredPermissions?: Permission[]  // Show group if user has ANY of these
}
```

### Navigation Configuration

```typescript
// src/lib/navigation.ts
import {
  Clock,
  FileText,
  FolderKanban,
  Building2,
  Users,
  UserCog,
  Settings,
} from 'lucide-react'

export const navigationConfig: NavGroup[] = [
  {
    id: 'time-tracking',
    label: 'Time Tracking',
    items: [
      {
        id: 'time-entries',
        label: 'Time Entries',
        href: '/dashboard/time-entries',
        icon: Clock,
        requiredPermissions: ['time-entries:view'],
      },
      {
        id: 'time-sheets',
        label: 'Time Sheets',
        href: '/dashboard/time-sheets',
        icon: FileText,
        requiredPermissions: ['time-sheets:view'],
      },
    ],
  },
  {
    id: 'management',
    label: 'Management',
    requiredPermissions: ['projects:view'],
    items: [
      {
        id: 'projects',
        label: 'Projects',
        href: '/dashboard/projects',
        icon: FolderKanban,
        requiredPermissions: ['projects:view'],
      },
      {
        id: 'organisations',
        label: 'Organisations',
        href: '/dashboard/organisations',
        icon: Building2,
        requiredPermissions: ['organisations:view'],
      },
      {
        id: 'accounts',
        label: 'Accounts',
        href: '/dashboard/accounts',
        icon: Users,
        requiredPermissions: ['accounts:view'],
      },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    requiredPermissions: ['users:view'],
    items: [
      {
        id: 'users',
        label: 'Users',
        href: '/dashboard/users',
        icon: UserCog,
        requiredPermissions: ['users:view'],
      },
    ],
  },
]

export const footerNavigation: NavItem[] = [
  {
    id: 'settings',
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    requiredPermissions: ['settings:view'],
  },
]
```

---

## useNavigation Hook

```typescript
// src/hooks/useNavigation.ts
import { useMemo } from 'react'
import { useAuth } from './useAuth'
import {
  navigationConfig,
  footerNavigation,
  type NavGroup,
  type NavItem,
} from '@/lib/navigation'

export function useNavigation() {
  const { canAny } = useAuth()

  const filteredNavigation = useMemo(() => {
    const filterItems = (items: NavItem[]): NavItem[] => {
      return items
        .filter(item => {
          if (!item.requiredPermissions) return true
          return canAny(item.requiredPermissions)
        })
        .map(item => ({
          ...item,
          children: item.children ? filterItems(item.children) : undefined,
        }))
    }

    const filterGroups = (groups: NavGroup[]): NavGroup[] => {
      return groups
        .filter(group => {
          if (!group.requiredPermissions) return true
          return canAny(group.requiredPermissions)
        })
        .map(group => ({
          ...group,
          items: filterItems(group.items),
        }))
        .filter(group => group.items.length > 0)
    }

    return filterGroups(navigationConfig)
  }, [canAny])

  const filteredFooter = useMemo(() => {
    return footerNavigation.filter(item => {
      if (!item.requiredPermissions) return true
      return canAny(item.requiredPermissions)
    })
  }, [canAny])

  return {
    navigation: filteredNavigation,
    footer: filteredFooter,
  }
}
```

---

## Authentication Context

### Auth Types

```typescript
// src/lib/auth/types.ts
import type { Permission } from '../permissions'

export type UserType = 'internal' | 'client'

export interface InternalUser {
  id: string
  type: 'internal'
  handle: string
  email: string
  role: 'super_admin' | 'admin' | 'expert' | 'viewer'
}

export interface ClientUser {
  id: string
  type: 'client'
  name: string
  email: string
  role: 'contact' | 'project_manager' | 'finance'
  organisationId: string
  organisationName: string
}

export type AuthenticatedUser = InternalUser | ClientUser

export interface AuthContextValue {
  user: AuthenticatedUser | null
  isAuthenticated: boolean
  isLoading: boolean
  isInternal: boolean
  isClient: boolean
  organisationScope: string | null  // Client's org ID, or null for internal

  // Permission helpers
  can: (permission: Permission) => boolean
  canAny: (permissions: Permission[]) => boolean
  canAll: (permissions: Permission[]) => boolean

  // Actions
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}
```

### AuthProvider Component

```typescript
// src/components/auth-provider.tsx
import { createContext, useContext, useState, useCallback } from 'react'
import { hasPermission, hasAnyPermission, hasAllPermissions } from '@/lib/permissions'
import type { AuthContextValue, AuthenticatedUser, Permission } from '@/lib/auth/types'

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: React.ReactNode
  initialUser: AuthenticatedUser | null
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const [user, setUser] = useState<AuthenticatedUser | null>(initialUser)
  const [isLoading, setIsLoading] = useState(false)

  const can = useCallback((permission: Permission) => {
    if (!user) return false
    return hasPermission(user, permission)
  }, [user])

  const canAny = useCallback((permissions: Permission[]) => {
    if (!user) return false
    return hasAnyPermission(user, permissions)
  }, [user])

  const canAll = useCallback((permissions: Permission[]) => {
    if (!user) return false
    return hasAllPermissions(user, permissions)
  }, [user])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const result = await loginFn({ data: { email, password } })
      setUser(result.user)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    await logoutFn()
    setUser(null)
  }, [])

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isInternal: user?.type === 'internal',
    isClient: user?.type === 'client',
    organisationScope: user?.type === 'client' ? user.organisationId : null,
    can,
    canAny,
    canAll,
    login,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

---

## UI Components

### PermissionGate Component

Conditionally renders children based on user permissions.

```typescript
// src/components/PermissionGate.tsx
import type { Permission } from '@/lib/permissions'
import { useAuth } from '@/hooks/useAuth'

interface PermissionGateProps {
  permissions: Permission | Permission[]
  mode?: 'any' | 'all'
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function PermissionGate({
  permissions,
  mode = 'any',
  fallback = null,
  children,
}: PermissionGateProps) {
  const { can, canAny, canAll } = useAuth()

  const perms = Array.isArray(permissions) ? permissions : [permissions]
  const hasAccess = mode === 'all' ? canAll(perms) : canAny(perms)

  return hasAccess ? <>{children}</> : <>{fallback}</>
}
```

**Usage Examples:**

```tsx
// Single permission
<PermissionGate permissions="users:create">
  <Button>Add User</Button>
</PermissionGate>

// Any of multiple permissions
<PermissionGate permissions={['time-sheets:approve', 'time-entries:approve']}>
  <Button>Approve</Button>
</PermissionGate>

// All permissions required
<PermissionGate permissions={['projects:edit', 'projects:delete']} mode="all">
  <Button variant="destructive">Delete Project</Button>
</PermissionGate>

// With fallback
<PermissionGate
  permissions="organisations:edit"
  fallback={<span className="text-muted-foreground">View only</span>}
>
  <Button>Edit Organisation</Button>
</PermissionGate>
```

### DashboardSidebar Component

```typescript
// src/components/DashboardSidebar.tsx
import { Link, useLocation } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth'
import { useNavigation } from '@/hooks/useNavigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { ThemeToggle } from '@/components/theme-toggle'
import { LogOut } from 'lucide-react'

export function DashboardSidebar() {
  const { navigation, footer } = useNavigation()
  const { user, isClient, logout } = useAuth()
  const location = useLocation()

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        {isClient ? (
          <div>
            <p className="font-medium">{user?.organisationName}</p>
            <p className="text-sm text-muted-foreground">{user?.name}</p>
          </div>
        ) : (
          <div>
            <p className="font-medium">Orilla Budget</p>
            <p className="text-sm text-muted-foreground">{user?.handle}</p>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {navigation.map(group => (
          <SidebarGroup key={group.id}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(item => {
                  const isActive = location.pathname.startsWith(item.href)
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link to={item.href}>
                          <item.icon className="mr-2 h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          {footer.map(item => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton asChild>
                <Link to={item.href}>
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <ThemeToggle />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
```

---

## Route Protection

### Auth Guard Layout

```typescript
// src/routes/dashboard/_authenticated.tsx
import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { getCurrentSessionFn } from '@/lib/auth/session'

export const Route = createFileRoute('/dashboard/_authenticated')({
  beforeLoad: async () => {
    const session = await getCurrentSessionFn()

    if (!session.user) {
      throw redirect({
        to: '/dashboard/login',
        search: { redirect: location.pathname },
      })
    }

    return { auth: session }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return <Outlet />
}
```

### Permission-Protected Route Example

```typescript
// src/routes/dashboard/_authenticated/users.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { hasPermission } from '@/lib/permissions'

export const Route = createFileRoute('/dashboard/_authenticated/users')({
  beforeLoad: async ({ context }) => {
    if (!hasPermission(context.auth.user, 'users:view')) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: UsersPage,
  loader: () => getUsersFn(),
})

function UsersPage() {
  const { users } = Route.useLoaderData()
  const { can } = useAuth()

  return (
    <div>
      <div className="flex justify-between">
        <h1>Users</h1>
        <PermissionGate permissions="users:create">
          <Button>Add User</Button>
        </PermissionGate>
      </div>

      <DataTable
        data={users}
        columns={columns}
        actions={(user) => (
          <>
            <PermissionGate permissions="users:edit">
              <Button variant="ghost" size="sm">Edit</Button>
            </PermissionGate>
            <PermissionGate permissions="users:delete">
              <Button variant="ghost" size="sm" className="text-destructive">
                Delete
              </Button>
            </PermissionGate>
          </>
        )}
      />
    </div>
  )
}
```

---

## Data Scoping

### Scoped Repository Methods

```typescript
// src/repositories/timeEntry.repository.ts
import { db } from '@/db'
import { timeEntries } from '@/db/schema'
import { eq } from 'drizzle-orm'

export interface QueryScope {
  organisationId?: string
}

export const timeEntryRepository = {
  /**
   * Find all time entries, optionally scoped to an organisation
   */
  async findAllScoped(scope: QueryScope = {}): Promise<TimeEntry[]> {
    if (scope.organisationId) {
      return db
        .select()
        .from(timeEntries)
        .where(eq(timeEntries.organisationId, scope.organisationId))
    }
    return db.select().from(timeEntries)
  },

  /**
   * Find time entry by ID, with optional scope check
   */
  async findByIdScoped(
    id: string,
    scope: QueryScope = {}
  ): Promise<TimeEntry | undefined> {
    const entry = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.id, id))
      .get()

    if (!entry) return undefined

    // If scoped, verify the entry belongs to the organisation
    if (scope.organisationId && entry.organisationId !== scope.organisationId) {
      return undefined  // Not found (for this user's scope)
    }

    return entry
  },
}
```

### Server Function with Scoping

```typescript
// src/routes/dashboard/_authenticated/time-entries.tsx
import { createServerFn } from '@tanstack/start'
import { getSessionFromContext } from '@/lib/auth/session'
import { timeEntryRepository } from '@/repositories/timeEntry.repository'
import { projectRepository } from '@/repositories/project.repository'

const getTimeEntriesDataFn = createServerFn({ method: 'GET' })
  .handler(async (ctx) => {
    const session = await getSessionFromContext(ctx)

    // Determine scope based on user type
    const scope = session.organisationId
      ? { organisationId: session.organisationId }
      : {}

    const [timeEntries, projects] = await Promise.all([
      timeEntryRepository.findAllScoped(scope),
      projectRepository.findAllScoped(scope),
    ])

    return { timeEntries, projects }
  })
```

---

## Dashboard Layout

```typescript
// src/routes/dashboard.tsx
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { DashboardSidebar } from '@/components/DashboardSidebar'
import { AuthProvider } from '@/components/auth-provider'
import { getCurrentSessionFn } from '@/lib/auth/session'

export const Route = createFileRoute('/dashboard')({
  loader: async () => {
    // Load session for AuthProvider initial state
    const session = await getCurrentSessionFn()
    return { initialUser: session.user }
  },
  component: DashboardLayout,
})

function DashboardLayout() {
  const { initialUser } = Route.useLoaderData()

  return (
    <AuthProvider initialUser={initialUser}>
      <SidebarProvider>
        <DashboardSidebar />
        <SidebarInset>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AuthProvider>
  )
}
```

---

## Login Page

```typescript
// src/routes/dashboard/login.tsx
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { z } from 'zod'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const Route = createFileRoute('/dashboard/login')({
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
  beforeLoad: async ({ context }) => {
    // If already authenticated, redirect to dashboard
    if (context.auth?.user) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { redirect: redirectTo } = Route.useSearch()
  const { login } = useAuth()

  const form = useForm({
    defaultValues: { email: '', password: '' },
    validatorAdapter: zodValidator(),
    validators: { onChange: loginSchema },
    onSubmit: async ({ value }) => {
      await login(value.email, value.password)
      navigate({ to: redirectTo || '/dashboard' })
    },
  })

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login to Orilla Budget</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
            className="space-y-4"
          >
            <form.Field name="email">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors && (
                    <p className="text-sm text-destructive">
                      {field.state.meta.errors.join(', ')}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="password">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors && (
                    <p className="text-sm text-destructive">
                      {field.state.meta.errors.join(', ')}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## Files to Delete After Migration

| File/Directory | Reason |
|----------------|--------|
| `src/routes/expert.tsx` | Replaced by `/dashboard` |
| `src/routes/expert/*` | Replaced by `/dashboard/_authenticated/*` |
| `src/routes/admin.tsx` | Merged into `/dashboard` |
| `src/routes/admin/*` | Merged into `/dashboard/_authenticated/*` |
| `src/routes/portal.tsx` | Clients use unified dashboard |

---

## Migration Checklist

- [ ] Create `src/lib/navigation.ts` with navigation config
- [ ] Create `src/hooks/useNavigation.ts`
- [ ] Create `src/components/auth-provider.tsx`
- [ ] Create `src/hooks/useAuth.ts`
- [ ] Create `src/components/PermissionGate.tsx`
- [ ] Create `src/components/DashboardSidebar.tsx`
- [ ] Create `src/routes/dashboard.tsx` layout
- [ ] Create `src/routes/dashboard/login.tsx`
- [ ] Create `src/routes/dashboard/invite.$code.tsx`
- [ ] Create `src/routes/dashboard/_authenticated.tsx`
- [ ] Migrate time-entries routes
- [ ] Migrate time-sheets routes
- [ ] Migrate projects routes
- [ ] Migrate organisations routes
- [ ] Migrate accounts routes
- [ ] Migrate users routes (from admin)
- [ ] Create settings route
- [ ] Add scoped repository methods
- [ ] Update server functions with scoping
- [ ] Test all permission combinations
- [ ] Delete old routes
- [ ] Update any internal links
