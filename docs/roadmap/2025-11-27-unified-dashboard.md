# Unified Dashboard Architecture

**Date:** 2025-11-27
**Status:** Planned
**Category:** Architecture & UI
**Parent:** [User Management & RBAC](./2025-11-27-user-management-rbac.md)

## Overview

This document details the unified dashboard architecture that merges the Expert Dashboard (`/expert`), Admin Dashboard (`/admin`), and Client Portal (`/portal`) into a single `/dashboard` route with permission-based UI rendering.

---

## Design Principles

1. **Single entry point** - All users access `/dashboard`
2. **Permission-based visibility** - UI adapts to user's permissions; unauthorized items are hidden completely
3. **Project-scoped data** - Users see data from projects they're members of
4. **Consistent experience** - Same components, different data/capabilities based on project role
5. **Context switching** - Users with multiple project roles can switch between project contexts

---

## Route Structure

```
src/routes/
├── __root.tsx                    # Root layout (theme, base HTML)
├── index.tsx                     # Public landing page
├── dashboard.tsx                 # Dashboard layout with AuthProvider + Sidebar
├── dashboard/
│   ├── login.tsx                 # Email/password login (public)
│   ├── register.tsx              # New user registration (public)
│   ├── invite.$code.tsx          # Invitation acceptance (public)
│   ├── _authenticated.tsx        # Auth guard layout (pathless)
│   └── _authenticated/
│       ├── index.tsx             # Dashboard home/overview
│       ├── projects.tsx          # Projects list (user's memberships)
│       ├── projects.$id.tsx      # Project detail + nested routes
│       ├── projects.$id/
│       │   ├── time-entries.tsx  # Project time entries
│       │   ├── time-sheets.tsx   # Project time sheets
│       │   └── members.tsx       # Project members
│       ├── contacts.tsx          # Contact book
│       ├── contacts.$id.tsx      # Contact detail
│       ├── organisations.tsx     # Organisations (admin only)
│       ├── organisations.$id.tsx # Organisation detail
│       ├── users.tsx             # User management (admin only)
│       ├── users.$id.tsx         # User detail
│       └── settings.tsx          # User settings/profile
```

---

## Route Migration Mapping

| Old Route | New Route | Visible To |
|-----------|-----------|------------|
| `/expert` | `/dashboard` | All authenticated users |
| `/expert/time-entries` | `/dashboard/projects/$id/time-entries` | Project members |
| `/expert/time-sheets` | `/dashboard/projects/$id/time-sheets` | Project members |
| `/expert/projects` | `/dashboard/projects` | All (filtered by membership) |
| `/expert/organisations` | `/dashboard/organisations` | admin, super_admin |
| `/expert/accounts` | `/dashboard/contacts` | All (personal contact book) |
| `/admin/users` | `/dashboard/users` | admin, super_admin |
| `/portal` | `/dashboard` | Removed - all users use unified dashboard |

---

## Navigation Configuration

### Data-Driven Sidebar Schema

```typescript
// src/lib/navigation.ts
import type { LucideIcon } from 'lucide-react'
import type { SystemPermission } from './permissions'

export interface NavItem {
  id: string
  label: string
  href: string
  icon: LucideIcon
  systemPermissions?: SystemPermission[]  // Show if user has ANY of these (admin routes)
  requiresProjects?: boolean               // Show if user has any project memberships
  children?: NavItem[]
}

export interface NavGroup {
  id: string
  label: string
  items: NavItem[]
  systemPermissions?: SystemPermission[]
  requiresProjects?: boolean
}
```

### Navigation Configuration

```typescript
// src/lib/navigation.ts
import {
  FolderKanban,
  Building2,
  Users,
  UserCog,
  Settings,
  Contact,
} from 'lucide-react'

export const navigationConfig: NavGroup[] = [
  {
    id: 'work',
    label: 'Work',
    requiresProjects: true,
    items: [
      {
        id: 'projects',
        label: 'Projects',
        href: '/dashboard/projects',
        icon: FolderKanban,
        requiresProjects: true,
      },
    ],
  },
  {
    id: 'people',
    label: 'People',
    items: [
      {
        id: 'contacts',
        label: 'Contacts',
        href: '/dashboard/contacts',
        icon: Contact,
      },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    systemPermissions: ['users:view', 'organisations:view'],
    items: [
      {
        id: 'organisations',
        label: 'Organisations',
        href: '/dashboard/organisations',
        icon: Building2,
        systemPermissions: ['organisations:view'],
      },
      {
        id: 'users',
        label: 'Users',
        href: '/dashboard/users',
        icon: UserCog,
        systemPermissions: ['users:view'],
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
  },
]
```

---

## useNavigation Hook

```typescript
// src/hooks/useNavigation.ts
import { useMemo } from 'react'
import { useAuth } from './useAuth'
import { hasSystemPermission } from '@/lib/permissions'
import {
  navigationConfig,
  footerNavigation,
  type NavGroup,
  type NavItem,
} from '@/lib/navigation'

export function useNavigation() {
  const { user, projectMemberships } = useAuth()
  const hasProjects = projectMemberships.length > 0

  const filteredNavigation = useMemo(() => {
    const filterItems = (items: NavItem[]): NavItem[] => {
      return items
        .filter(item => {
          // Check system permissions (admin routes)
          if (item.systemPermissions) {
            return item.systemPermissions.some(p =>
              hasSystemPermission(user ?? {}, p)
            )
          }
          // Check if requires project memberships
          if (item.requiresProjects && !hasProjects) {
            return false
          }
          return true
        })
        .map(item => ({
          ...item,
          children: item.children ? filterItems(item.children) : undefined,
        }))
    }

    const filterGroups = (groups: NavGroup[]): NavGroup[] => {
      return groups
        .filter(group => {
          if (group.systemPermissions) {
            return group.systemPermissions.some(p =>
              hasSystemPermission(user ?? {}, p)
            )
          }
          if (group.requiresProjects && !hasProjects) {
            return false
          }
          return true
        })
        .map(group => ({
          ...group,
          items: filterItems(group.items),
        }))
        .filter(group => group.items.length > 0)
    }

    return filterGroups(navigationConfig)
  }, [user, hasProjects])

  const filteredFooter = useMemo(() => {
    return footerNavigation.filter(item => {
      if (item.systemPermissions) {
        return item.systemPermissions.some(p =>
          hasSystemPermission(user ?? {}, p)
        )
      }
      return true
    })
  }, [user])

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
import type { SystemPermission, ProjectPermission } from '../permissions'

export interface AuthenticatedUser {
  id: string
  handle: string
  email: string
  role: 'super_admin' | 'admin' | null  // Optional system role
  pii?: {
    name?: string
  }
}

export interface ProjectMembership {
  projectId: string
  projectName: string
  organisationId: string
  organisationName: string
  role: 'owner' | 'expert' | 'reviewer' | 'client' | 'viewer'
}

export interface AuthContextValue {
  user: AuthenticatedUser | null
  isAuthenticated: boolean
  isLoading: boolean
  isSystemAdmin: boolean  // Has super_admin or admin role
  projectMemberships: ProjectMembership[]

  // System permission helpers
  canSystem: (permission: SystemPermission) => boolean

  // Project permission helpers
  canOnProject: (projectId: string, permission: ProjectPermission) => boolean
  canAnyOnProject: (projectId: string, permissions: ProjectPermission[]) => boolean
  getProjectRole: (projectId: string) => string | null
  getProjectMembership: (projectId: string) => ProjectMembership | null

  // Actions
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}
```

### AuthProvider Component

```typescript
// src/components/auth-provider.tsx
import { createContext, useContext, useState, useCallback } from 'react'
import {
  hasSystemPermission,
  hasProjectPermission,
  PROJECT_ROLE_PERMISSIONS,
} from '@/lib/permissions'
import type {
  AuthContextValue,
  AuthenticatedUser,
  ProjectMembership,
  SystemPermission,
  ProjectPermission,
} from '@/lib/auth/types'

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: React.ReactNode
  initialUser: AuthenticatedUser | null
  initialMemberships: ProjectMembership[]
}

export function AuthProvider({
  children,
  initialUser,
  initialMemberships,
}: AuthProviderProps) {
  const [user, setUser] = useState<AuthenticatedUser | null>(initialUser)
  const [projectMemberships, setProjectMemberships] = useState(initialMemberships)
  const [isLoading, setIsLoading] = useState(false)

  const isSystemAdmin = user?.role === 'super_admin' || user?.role === 'admin'

  const canSystem = useCallback((permission: SystemPermission) => {
    if (!user) return false
    return hasSystemPermission(user, permission)
  }, [user])

  const getProjectMembership = useCallback((projectId: string) => {
    return projectMemberships.find(m => m.projectId === projectId) ?? null
  }, [projectMemberships])

  const getProjectRole = useCallback((projectId: string) => {
    return getProjectMembership(projectId)?.role ?? null
  }, [getProjectMembership])

  const canOnProject = useCallback((projectId: string, permission: ProjectPermission) => {
    // System admins can do anything
    if (isSystemAdmin) return true

    const membership = getProjectMembership(projectId)
    if (!membership) return false
    return hasProjectPermission(membership, permission)
  }, [isSystemAdmin, getProjectMembership])

  const canAnyOnProject = useCallback((projectId: string, permissions: ProjectPermission[]) => {
    return permissions.some(p => canOnProject(projectId, p))
  }, [canOnProject])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const result = await loginFn({ data: { email, password } })
      setUser(result.user)
      setProjectMemberships(result.projectMemberships)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    await logoutFn()
    setUser(null)
    setProjectMemberships([])
  }, [])

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isSystemAdmin,
    projectMemberships,
    canSystem,
    canOnProject,
    canAnyOnProject,
    getProjectRole,
    getProjectMembership,
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

### PermissionGate Components

Two gate components: one for system permissions, one for project permissions.

```typescript
// src/components/SystemPermissionGate.tsx
import type { SystemPermission } from '@/lib/permissions'
import { useAuth } from '@/hooks/useAuth'

interface SystemPermissionGateProps {
  permissions: SystemPermission | SystemPermission[]
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function SystemPermissionGate({
  permissions,
  fallback = null,
  children,
}: SystemPermissionGateProps) {
  const { canSystem } = useAuth()

  const perms = Array.isArray(permissions) ? permissions : [permissions]
  const hasAccess = perms.some(p => canSystem(p))

  return hasAccess ? <>{children}</> : <>{fallback}</>
}
```

```typescript
// src/components/ProjectPermissionGate.tsx
import type { ProjectPermission } from '@/lib/permissions'
import { useAuth } from '@/hooks/useAuth'

interface ProjectPermissionGateProps {
  projectId: string
  permissions: ProjectPermission | ProjectPermission[]
  mode?: 'any' | 'all'
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function ProjectPermissionGate({
  projectId,
  permissions,
  mode = 'any',
  fallback = null,
  children,
}: ProjectPermissionGateProps) {
  const { canOnProject, canAnyOnProject } = useAuth()

  const perms = Array.isArray(permissions) ? permissions : [permissions]
  const hasAccess = mode === 'all'
    ? perms.every(p => canOnProject(projectId, p))
    : canAnyOnProject(projectId, perms)

  return hasAccess ? <>{children}</> : <>{fallback}</>
}
```

**Usage Examples:**

```tsx
// System permission (admin routes)
<SystemPermissionGate permissions="users:create">
  <Button>Add User</Button>
</SystemPermissionGate>

// Project permission
<ProjectPermissionGate projectId={projectId} permissions="time-entries:create">
  <Button>New Time Entry</Button>
</ProjectPermissionGate>

// Multiple project permissions (any)
<ProjectPermissionGate
  projectId={projectId}
  permissions={['time-sheets:approve', 'project:manage-members']}
>
  <Button>Manage</Button>
</ProjectPermissionGate>

// With fallback
<ProjectPermissionGate
  projectId={projectId}
  permissions="project:edit"
  fallback={<span className="text-muted-foreground">View only</span>}
>
  <Button>Edit Project</Button>
</ProjectPermissionGate>
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
  const { user, projectMemberships, logout } = useAuth()
  const location = useLocation()

  // Get display name from PII or fall back to handle/email
  const displayName = user?.pii?.name || user?.handle || user?.email || 'User'

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <div>
          <p className="font-medium">Orilla Budget</p>
          <p className="text-sm text-muted-foreground">{displayName}</p>
          {projectMemberships.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {projectMemberships.length} project{projectMemberships.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
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

### Project-Scoped Repository Methods

Data is scoped by project membership, not organisation.

```typescript
// src/repositories/timeEntry.repository.ts
import { db } from '@/db'
import { timeEntries, projectMembers } from '@/db/schema'
import { eq, inArray } from 'drizzle-orm'

export const timeEntryRepository = {
  /**
   * Find all time entries for projects the user is a member of
   */
  async findByProjectIds(projectIds: string[]): Promise<TimeEntry[]> {
    if (projectIds.length === 0) return []
    return db
      .select()
      .from(timeEntries)
      .where(inArray(timeEntries.projectId, projectIds))
  },

  /**
   * Find time entries for a specific project
   */
  async findByProjectId(projectId: string): Promise<TimeEntry[]> {
    return db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.projectId, projectId))
  },

  /**
   * Find time entry by ID, with project access check
   */
  async findByIdWithAccess(
    id: string,
    allowedProjectIds: string[]
  ): Promise<TimeEntry | undefined> {
    const entry = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.id, id))
      .get()

    if (!entry) return undefined

    // Verify user has access to this project
    if (!allowedProjectIds.includes(entry.projectId)) {
      return undefined
    }

    return entry
  },
}
```

### Server Function with Project Scoping

```typescript
// src/routes/dashboard/_authenticated/projects.$id/time-entries.tsx
import { createServerFn } from '@tanstack/start'
import { getSessionFromContext } from '@/lib/auth/session'
import { timeEntryRepository } from '@/repositories/timeEntry.repository'
import { canOnProject } from '@/lib/permissions'

const getProjectTimeEntriesFn = createServerFn({ method: 'GET' })
  .validator(z.object({ projectId: z.string() }))
  .handler(async ({ data, context }) => {
    const session = await getSessionFromContext(context)

    // Check access: system admin or project member
    const membership = session.projectMemberships.find(
      m => m.projectId === data.projectId
    )

    if (!session.user.role && !membership) {
      throw new Error('Forbidden: No access to this project')
    }

    const timeEntries = await timeEntryRepository.findByProjectId(data.projectId)

    return { timeEntries }
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
    // Load session including project memberships
    const session = await getCurrentSessionFn()
    return {
      initialUser: session.user,
      initialMemberships: session.projectMemberships,
    }
  },
  component: DashboardLayout,
})

function DashboardLayout() {
  const { initialUser, initialMemberships } = Route.useLoaderData()

  return (
    <AuthProvider
      initialUser={initialUser}
      initialMemberships={initialMemberships}
    >
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
| `src/routes/portal.tsx` | Unified dashboard |
| `src/repositories/account.repository.ts` | Replaced by `contact.repository.ts` |

---

## Migration Checklist

### Phase 1: Authentication Foundation
- [ ] Create `pii` table
- [ ] Update `users` table with auth fields
- [ ] Create `sessions` table
- [ ] Create `src/lib/auth.ts` (password hashing)
- [ ] Create `src/repositories/session.repository.ts`
- [ ] Create `src/repositories/pii.repository.ts`
- [ ] Create `src/routes/dashboard/login.tsx`
- [ ] Create `src/routes/dashboard/_authenticated.tsx`

### Phase 2: Permission System
- [ ] Create `src/lib/permissions.ts`
- [ ] Create `src/lib/navigation.ts`
- [ ] Create `src/hooks/useNavigation.ts`
- [ ] Create `src/components/auth-provider.tsx`
- [ ] Create `src/hooks/useAuth.ts`
- [ ] Create `src/components/SystemPermissionGate.tsx`
- [ ] Create `src/components/ProjectPermissionGate.tsx`
- [ ] Create `src/components/DashboardSidebar.tsx`

### Phase 3: Dashboard Migration
- [ ] Create `projectMembers` table
- [ ] Create `src/repositories/projectMember.repository.ts`
- [ ] Create `src/routes/dashboard.tsx` layout
- [ ] Migrate projects routes (with nested time-entries/time-sheets)
- [ ] Migrate organisations routes (admin only)
- [ ] Migrate users routes (admin only)
- [ ] Create settings route
- [ ] Update server functions with project scoping
- [ ] Delete old routes

### Phase 4: Contacts & Invitations
- [ ] Create `contacts` table
- [ ] Create `invitations` table
- [ ] Create `src/repositories/contact.repository.ts`
- [ ] Create `src/repositories/invitation.repository.ts`
- [ ] Create `src/routes/dashboard/invite.$code.tsx`
- [ ] Create contacts management routes
- [ ] Set up email provider

### Testing
- [ ] Test all permission combinations
- [ ] Test project-scoped data access
- [ ] Test invitation flow (new user + existing user)
- [ ] Test PII deletion scenarios
- [ ] Update any internal links
