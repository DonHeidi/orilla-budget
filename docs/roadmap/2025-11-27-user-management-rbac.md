# User Management & Role-Based Access Control (RBAC)

**Date:** 2025-11-27
**Status:** Planned
**Category:** Security & Authentication
**Context:** Implementing authentication, authorization, and a unified dashboard with permission-based UI rendering

## Related Documents

- [Permission System](./2025-11-27-permission-system.md) - Detailed permissions, role mappings, utilities
- [Unified Dashboard](./2025-11-27-unified-dashboard.md) - Route structure, navigation, UI components

## Overview

The application currently has no authentication for the Expert Dashboard (`/expert/*`) or Admin (`/admin/*`) routes. The Client Portal (`/portal`) has access-code authentication but sessions are stored in-memory and lost on page refresh.

This roadmap defines a unified dashboard architecture with role-based access control (RBAC) that:

1. **Merges all interfaces** into a single `/dashboard` route
2. **Implements permission-based UI rendering** - menu items and actions are hidden (not disabled) based on user permissions
3. **Integrates client portal users** - clients get real accounts via invitation flow
4. **Uses granular permissions** - ~25 individual permissions mapped to 7 roles
5. **Protects routes** via TanStack Start middleware (`beforeLoad`)

---

## Current State Analysis

### Existing Data Model

**Users Table** (Internal users):
```typescript
users {
  id: string (primary key)
  handle: string (unique)
  email: string (unique)
  createdAt: ISO string
}
```

**Accounts Table** (Client users):
```typescript
accounts {
  id: string (primary key)
  userId: string (FK to users, nullable)
  organisationId: string (FK to organisations)
  name: string
  email: string
  role: enum ['contact' | 'project_manager' | 'finance']
  accessCode: string (unique, 8 chars)
  createdAt: ISO string
}
```

### Current Authentication Gaps

| Area | Current State | Risk Level |
|------|---------------|------------|
| Expert Dashboard (`/expert/*`) | No authentication | **CRITICAL** |
| Admin Dashboard (`/admin/*`) | No authentication | **CRITICAL** |
| Client Portal (`/portal`) | Access code, in-memory session | Medium |
| API/Server Functions | No authorization checks | High |

---

## Role Architecture

### Unified Role Hierarchy

All roles (internal and client) share the same permission system:

```
super_admin          # Full system access
    │
    ├── admin        # User management, all orgs
    │   │
    │   ├── expert   # Standard internal user
    │   │
    │   └── viewer   # Read-only internal user
    │
    └── [Client Roles - scoped to their organisation]
        ├── project_manager  # Manage projects/time for their org
        ├── finance          # Financial data, approve time sheets
        └── contact          # Basic view access
```

### Role Definitions

#### Internal Roles (Users Table)

| Role | Description | Scope |
|------|-------------|-------|
| `super_admin` | Full system access, manage admins | Global |
| `admin` | Manage users, organisations, all data | Global |
| `expert` | Standard dashboard user, CRUD on time/projects, view-only on orgs/accounts | Global |
| `viewer` | Read-only access to dashboard | Global |

#### Client Roles (Accounts Table)

| Role | Description | Scope |
|------|-------------|-------|
| `project_manager` | Manage projects and time entries | Own organisation |
| `finance` | View financial data, approve time sheets | Own organisation |
| `contact` | Basic view-only access | Own organisation |

---

## Data Model Changes

### Users Table (Internal Users)

```typescript
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  handle: text('handle').unique().notNull(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['super_admin', 'admin', 'expert', 'viewer'] })
    .notNull().default('viewer'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastLoginAt: text('last_login_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
```

### Accounts Table (Client Users)

```typescript
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  organisationId: text('organisation_id').references(() => organisations.id).notNull(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  role: text('role', { enum: ['contact', 'project_manager', 'finance'] })
    .notNull().default('contact'),
  status: text('status', { enum: ['pending', 'active', 'disabled'] })
    .notNull().default('pending'),
  passwordHash: text('password_hash'),
  invitationCode: text('invitation_code').unique(),
  invitationExpiresAt: text('invitation_expires_at'),
  lastLoginAt: text('last_login_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
```

### Sessions Table

```typescript
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
  token: text('token').unique().notNull(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
})
// Note: Either userId OR accountId will be set, not both
```

---

## Client Onboarding Flow

### Invitation Process

```
1. Admin creates account in dashboard
   - Enters client's email, name, role, organisation
   - System generates unique invitation code
   - Account created with status: 'pending'

2. System sends invitation email
   - Contains link: /dashboard/invite/{code}
   - Link expires after 7 days

3. Client clicks invitation link
   - Sees account setup form
   - Sets their password
   - Account status changes to 'active'

4. Client can now login
   - Uses email + password at /dashboard/login
   - Sees dashboard filtered to their organisation
```

---

## Implementation Phases

### Phase 1: Authentication Foundation

**Goal:** Basic login and session management

1. **Database changes**
   - Add auth fields to `users` table
   - Add auth fields to `accounts` table
   - Create `sessions` table
   - Generate and apply migration

2. **Auth utilities**
   - Create `src/lib/auth.ts` (password hashing)
   - Create `src/lib/permissions.ts` (permission utilities)

3. **Repository layer**
   - Create `src/repositories/session.repository.ts`
   - Update user/account repositories with auth methods

4. **Login page**
   - Create `/dashboard/login` route
   - Support both internal users and clients
   - Cookie-based session

5. **Route protection**
   - Create `_authenticated.tsx` layout
   - Implement `beforeLoad` redirect

### Phase 2: Permission-Based UI

**Goal:** Dynamic navigation and permission gates

1. **Auth context**
   - Create `AuthProvider` component
   - Create `useAuth` hook

2. **Navigation system**
   - Create navigation configuration
   - Create `useNavigation` hook
   - Build `DashboardSidebar` component

3. **Permission gates**
   - Create `PermissionGate` component
   - Apply to buttons/actions throughout dashboard

4. **Route-level permissions**
   - Add permission checks to sensitive routes
   - Return 403 or redirect for unauthorized access

### Phase 3: Unified Dashboard Migration

**Goal:** Merge expert/admin/portal into single dashboard

1. **Route migration**
   - Create new `/dashboard/_authenticated/*` routes
   - Copy/adapt components from `/expert/*`
   - Apply permission gates to UI elements

2. **Data scoping**
   - Add scoped repository methods
   - Update server functions to use scope

3. **Remove old routes**
   - Delete `/expert/*` routes
   - Delete `/admin/*` routes
   - Delete `/portal` route

4. **Update navigation**
   - Remove hardcoded sidebar
   - Use dynamic navigation everywhere

### Phase 4: Client Invitation Flow

**Goal:** Enable client onboarding

1. **Invitation system**
   - Add invitation fields to accounts
   - Create invitation generation logic
   - Create `/dashboard/invite.$code` route

2. **Account setup**
   - Build setup form (set password)
   - Activate account on completion

3. **Email integration** (optional)
   - Send invitation emails
   - Send password reset emails

### Phase 5: Advanced Features (Future)

1. **Organisation scoping for internal users**
2. **Audit logging**
3. **Two-factor authentication**
4. **OAuth integration** (Google, GitHub)
5. **Password policies**

---

## Files Overview

### New Files

| File | Purpose |
|------|---------|
| `src/lib/auth.ts` | Password hashing, token generation |
| `src/lib/permissions.ts` | Permission definitions and utilities |
| `src/lib/navigation.ts` | Navigation configuration |
| `src/components/auth-provider.tsx` | Auth context provider |
| `src/components/PermissionGate.tsx` | Conditional rendering by permission |
| `src/components/DashboardSidebar.tsx` | Dynamic sidebar |
| `src/hooks/useAuth.ts` | Auth context hook |
| `src/hooks/useNavigation.ts` | Filtered navigation hook |
| `src/repositories/session.repository.ts` | Session CRUD |
| `src/routes/dashboard/login.tsx` | Login page |
| `src/routes/dashboard/invite.$code.tsx` | Invitation acceptance |
| `src/routes/dashboard/_authenticated.tsx` | Auth guard layout |
| `src/routes/dashboard/_authenticated/*.tsx` | Protected dashboard routes |

### Modified Files

| File | Changes |
|------|---------|
| `src/db/schema.ts` | Add auth fields, sessions table |
| `src/schemas.ts` | Add login, session schemas |
| `src/repositories/user.repository.ts` | Add auth methods |
| `src/repositories/account.repository.ts` | Add auth methods, invitation |
| `src/routes/dashboard.tsx` | Add AuthProvider, use DashboardSidebar |

### Files to Delete

| File | Reason |
|------|--------|
| `src/routes/expert.tsx` | Replaced by unified dashboard |
| `src/routes/expert/*` | Replaced by `/dashboard/_authenticated/*` |
| `src/routes/admin.tsx` | Merged into unified dashboard |
| `src/routes/admin/*` | Merged into `/dashboard/_authenticated/*` |
| `src/routes/portal.tsx` | Clients use unified dashboard |

---

## Technical Considerations

### Cookie Security

```typescript
setCookie('session_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 7,  // 7 days
})
```

### Password Hashing

Use Argon2id (recommended over bcrypt):

```typescript
import { hash, verify } from '@node-rs/argon2'

const passwordHash = await hash(plainPassword)
const isValid = await verify(passwordHash, plainPassword)
```

### Session Token Generation

```typescript
import { randomBytes } from 'crypto'

function generateSecureToken(): string {
  return randomBytes(32).toString('base64url')
}
```

---

## Dependencies

### New Packages

```bash
bun add @node-rs/argon2   # Password hashing
```

### Existing Packages

- `zod` - Validation schemas
- `drizzle-orm` - Database operations
- TanStack Start - Middleware, routing
- Radix UI - Sidebar components

---

## References

- [TanStack Start Middleware](https://tanstack.com/start/latest/docs/framework/react/middleware)
- [TanStack Router Authentication](https://tanstack.com/router/v1/docs/framework/react/guide/authenticated-routes)
- [TanStack Start Authentication Guide](https://tanstack.com/start/latest/docs/framework/react/guide/authentication)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

## Next Steps

1. Review and approve this roadmap
2. Create database migration for Phase 1
3. Implement authentication foundation
4. Test login/logout flows
5. Proceed to Phase 2: Permission-based UI
