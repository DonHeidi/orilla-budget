# User Management & Role-Based Access Control (RBAC)

**Date:** 2025-11-27
**Status:** Planned
**Category:** Security & Authentication
**Context:** Implementing proper authentication and authorization for the Expert Dashboard and Admin areas

## Overview

The application currently has no authentication for the Expert Dashboard (`/expert/*`) or Admin (`/admin/*`) routes - anyone can access them. The Client Portal has access-code authentication but sessions are stored in-memory and lost on page refresh.

This roadmap defines a role-based access control (RBAC) system that:
1. Protects the Expert Dashboard with user authentication
2. Implements role-based permissions for different user types
3. Uses TanStack Start middleware patterns for route protection
4. Improves Client Portal session persistence

---

## Current State Analysis

### Existing Data Model

**Users Table** (Expert/Admin users):
```typescript
users {
  id: string (primary key)
  handle: string (unique)
  email: string (unique)
  createdAt: ISO string
}
```

**Accounts Table** (Client Portal users):
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

### Existing Role Schema

The `accounts` table already has a `role` enum with three values:
- `contact` - Basic client contact (view only)
- `project_manager` - Project oversight
- `finance` - Financial/billing access

These roles were designed for **client portal users**, not expert dashboard users.

---

## Proposed Role Architecture

### Role Hierarchy

```
super_admin
    │
    ├── admin
    │       │
    │       ├── expert (default dashboard user)
    │       │
    │       └── viewer (read-only dashboard access)
    │
    └── [Client Portal Roles - separate system]
            ├── project_manager
            ├── finance
            └── contact
```

### Role Definitions

#### 1. Super Admin (`super_admin`)
- **Access:** Full system access
- **Permissions:**
  - All admin capabilities
  - Manage other admins and super admins
  - System configuration
  - View audit logs
- **Scope:** Global (all organisations)

#### 2. Admin (`admin`)
- **Access:** Expert Dashboard + Admin area
- **Permissions:**
  - Manage users (create, edit, delete)
  - Manage organisations
  - Manage all projects and time entries
  - Approve/reject time sheets
- **Scope:** Global or assigned organisations

#### 3. Expert (`expert`)
- **Access:** Expert Dashboard (standard)
- **Permissions:**
  - CRUD on organisations, projects, accounts
  - CRUD on time entries and time sheets
  - Cannot manage users
- **Scope:** Assigned organisations or all

#### 4. Viewer (`viewer`)
- **Access:** Expert Dashboard (read-only)
- **Permissions:**
  - View all data in Expert Dashboard
  - Cannot create, edit, or delete
- **Scope:** Assigned organisations or all

#### Client Portal Roles (Unchanged)
- **project_manager** - View projects, time entries, budgets for their organisation
- **finance** - View financial data, approved time sheets, invoicing
- **contact** - Basic view access to organisation data

---

## Data Model Changes

### Option A: Extend Users Table (Recommended)

Add role and authentication fields to existing `users` table:

```typescript
// src/db/schema.ts
export const userRoleEnum = ['super_admin', 'admin', 'expert', 'viewer'] as const

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  handle: text('handle').unique().notNull(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),           // NEW
  role: text('role', { enum: userRoleEnum }).notNull()     // NEW
    .default('expert'),
  isActive: integer('is_active', { mode: 'boolean' })      // NEW
    .notNull().default(true),
  lastLoginAt: text('last_login_at'),                      // NEW
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),                 // NEW
})
```

### Option B: Separate Roles Table (More Flexible)

For future permission granularity:

```typescript
export const roles = sqliteTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').unique().notNull(),
  description: text('description'),
  permissions: text('permissions', { mode: 'json' }),  // JSON array of permission strings
  createdAt: text('created_at').notNull(),
})

export const userRoles = sqliteTable('user_roles', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  roleId: text('role_id').references(() => roles.id, { onDelete: 'cascade' }),
  organisationId: text('organisation_id').references(() => organisations.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
})
```

**Recommendation:** Start with **Option A** for simplicity. Migrate to Option B if granular permissions become necessary.

### Sessions Table

```typescript
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').unique().notNull(),
  expiresAt: text('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: text('created_at').notNull(),
})
```

---

## TanStack Start Middleware Integration

### Middleware Architecture

TanStack Start supports two middleware patterns:
1. **Global Request Middleware** - Runs before every request (SSR, server functions)
2. **Route `beforeLoad`** - Runs before specific routes load

### Implementation Strategy

#### 1. Global Request Middleware (`src/start.ts`)

```typescript
import { createStart, createMiddleware } from '@tanstack/start'

const authMiddleware = createMiddleware()
  .server(async ({ request, next }) => {
    const sessionToken = getCookie(request, 'session_token')
    const user = sessionToken ? await validateSession(sessionToken) : null

    // Attach user to request context
    return next({
      context: { user }
    })
  })

export default createStart({
  requestMiddleware: [authMiddleware],
})
```

#### 2. Protected Route Layout (`src/routes/_authed.tsx`)

Using TanStack Router's pathless layout pattern:

```typescript
// src/routes/_authed.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login', search: { redirect: location.pathname } })
    }
    return { user: context.user }
  },
})
```

#### 3. Role-Protected Routes

```typescript
// src/routes/_authed/admin.tsx
export const Route = createFileRoute('/_authed/admin')({
  beforeLoad: async ({ context }) => {
    const allowedRoles = ['super_admin', 'admin']
    if (!allowedRoles.includes(context.user.role)) {
      throw redirect({ to: '/expert' })  // or show 403
    }
  },
})
```

### Route Structure After Implementation

```
src/routes/
├── __root.tsx              # Root layout (loads user from session)
├── index.tsx               # Public landing page
├── login.tsx               # Login page (public)
├── _authed.tsx             # Auth guard layout (pathless)
│   ├── expert.tsx          # Expert dashboard layout
│   │   ├── index.tsx
│   │   ├── organisations.tsx
│   │   ├── projects.tsx
│   │   ├── time-entries.tsx
│   │   └── time-sheets.tsx
│   └── admin.tsx           # Admin layout (role: admin+)
│       ├── index.tsx
│       └── users.tsx
└── portal.tsx              # Client portal (separate auth)
```

---

## Authentication Flow

### Expert Dashboard Login

```
1. User navigates to /expert
2. _authed.tsx beforeLoad checks session cookie
3. No valid session → redirect to /login?redirect=/expert
4. User enters email + password
5. Server validates credentials
6. Server creates session, sets httpOnly cookie
7. Redirect to original destination (/expert)
8. Subsequent requests include session cookie
9. Middleware validates session, attaches user to context
```

### Session Management

```typescript
// Server function for login
const loginFn = createServerFn({ method: 'POST' })
  .validator(loginSchema)
  .handler(async ({ data }) => {
    const user = await userRepository.findByEmail(data.email)
    if (!user || !await verifyPassword(data.password, user.passwordHash)) {
      throw new Error('Invalid credentials')
    }

    const session = await sessionRepository.create({
      userId: user.id,
      token: generateSecureToken(),
      expiresAt: addDays(new Date(), 7).toISOString(),
    })

    // Set httpOnly cookie
    setCookie('session_token', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return { success: true }
  })
```

### Password Handling

Use `bcrypt` or `argon2` for password hashing:

```typescript
import { hash, verify } from '@node-rs/argon2'  // or bcrypt

// On registration/password change
const passwordHash = await hash(plainPassword)

// On login
const isValid = await verify(user.passwordHash, plainPassword)
```

---

## Permission Matrix

| Action | super_admin | admin | expert | viewer |
|--------|-------------|-------|--------|--------|
| **Users** |
| View users | ✅ | ✅ | ❌ | ❌ |
| Create users | ✅ | ✅ | ❌ | ❌ |
| Edit users | ✅ | ✅ | ❌ | ❌ |
| Delete users | ✅ | ❌ | ❌ | ❌ |
| Manage admins | ✅ | ❌ | ❌ | ❌ |
| **Organisations** |
| View | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ✅ | ❌ |
| Edit | ✅ | ✅ | ✅ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ |
| **Projects** |
| View | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ✅ | ❌ |
| Edit | ✅ | ✅ | ✅ | ❌ |
| Delete | ✅ | ✅ | ✅ | ❌ |
| **Time Entries** |
| View | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ✅ | ❌ |
| Edit | ✅ | ✅ | ✅ | ❌ |
| Delete | ✅ | ✅ | ✅ | ❌ |
| **Time Sheets** |
| View | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ✅ | ❌ |
| Submit | ✅ | ✅ | ✅ | ❌ |
| Approve/Reject | ✅ | ✅ | ❌ | ❌ |
| **Admin Area** |
| Access | ✅ | ✅ | ❌ | ❌ |

---

## Implementation Phases

### Phase 1: Authentication Foundation

**Goal:** Secure Expert Dashboard with basic login

1. **Database changes**
   - Add `passwordHash`, `role`, `isActive`, `updatedAt` to `users` table
   - Create `sessions` table
   - Generate migration

2. **Repository layer**
   - Create `src/repositories/session.repository.ts`
   - Update `src/repositories/user.repository.ts` with auth methods
   - Add `findByEmail`, `updatePassword`, `updateLastLogin`

3. **Auth utilities**
   - Create `src/lib/auth.ts` with password hashing
   - Create `src/lib/session.ts` with token generation/validation

4. **Login page**
   - Create `src/routes/login.tsx`
   - Login form with email/password
   - Server function for authentication
   - Cookie-based session

5. **Route protection**
   - Create `src/routes/_authed.tsx` layout
   - Move expert routes under `_authed`
   - Implement `beforeLoad` redirect

6. **Logout**
   - Add logout server function
   - Clear session cookie
   - Redirect to login

**Testing:**
- Login with valid/invalid credentials
- Session persistence across page refresh
- Redirect to login when accessing protected routes
- Logout clears session

### Phase 2: Role-Based Access Control

**Goal:** Implement role checks and permission enforcement

1. **Role utilities**
   - Create `src/lib/permissions.ts`
   - Define permission constants
   - Create `hasPermission(user, permission)` helper
   - Create `requireRole(allowedRoles)` middleware helper

2. **Route-level protection**
   - Add role checks to admin routes
   - Create `_authed/admin.tsx` with role guard

3. **Server function authorization**
   - Wrap mutation server functions with permission checks
   - Return 403 for unauthorized actions

4. **UI permission awareness**
   - Create `usePermissions()` hook
   - Hide/disable UI elements based on role
   - Show appropriate error messages

**Testing:**
- Role-based route access
- Permission-based UI visibility
- Server function authorization

### Phase 3: User Management UI

**Goal:** Admin interface for managing users

1. **User list view**
   - Update `/admin/users` route
   - DataTable with user list
   - Filter by role, status

2. **Create user**
   - Form with email, handle, password, role
   - Send welcome email (optional)

3. **Edit user**
   - Edit user details
   - Change role
   - Reset password
   - Activate/deactivate

4. **Self-service**
   - Profile page for logged-in user
   - Change own password
   - Update email/handle

**Testing:**
- CRUD operations on users
- Role assignment
- Password reset flow

### Phase 4: Client Portal Session Persistence

**Goal:** Improve portal authentication

1. **Cookie-based sessions**
   - Replace in-memory state with session cookie
   - Create portal-specific session handling

2. **Session validation**
   - Validate access code session on each request
   - Handle expired sessions gracefully

3. **Portal route protection**
   - Add `beforeLoad` to portal routes
   - Redirect to portal login if no valid session

**Testing:**
- Session survives page refresh
- Invalid session redirects to login
- Access code re-authentication

### Phase 5: Advanced Features (Future)

1. **Organisation scoping**
   - Assign users to specific organisations
   - Filter data based on user's organisation access

2. **Audit logging**
   - Log authentication events
   - Log sensitive operations (user changes, deletions)

3. **Two-factor authentication**
   - TOTP-based 2FA
   - Recovery codes

4. **Password policies**
   - Minimum length/complexity
   - Password expiration
   - Prevent password reuse

5. **OAuth integration**
   - Google/GitHub login
   - SSO support

---

## Technical Considerations

### Cookie Security

```typescript
// Production cookie settings
setCookie('session_token', token, {
  httpOnly: true,       // Prevent XSS access
  secure: true,         // HTTPS only
  sameSite: 'lax',      // CSRF protection
  path: '/',            // Available on all routes
  maxAge: 60 * 60 * 24 * 7,  // 7 days
})
```

### Session Token Generation

```typescript
import { randomBytes } from 'crypto'

function generateSecureToken(): string {
  return randomBytes(32).toString('base64url')  // 256 bits of entropy
}
```

### Password Requirements

- Minimum 8 characters
- No maximum (allow passphrases)
- Check against common password lists (optional)
- Use Argon2id for hashing (preferred over bcrypt)

### Rate Limiting (Future)

Protect login endpoint from brute force:
- 5 failed attempts → 1 minute lockout
- 10 failed attempts → 15 minute lockout
- Consider CAPTCHA after 3 failures

---

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/lib/auth.ts` | Password hashing, token generation |
| `src/lib/session.ts` | Session validation utilities |
| `src/lib/permissions.ts` | Role/permission helpers |
| `src/repositories/session.repository.ts` | Session CRUD |
| `src/routes/login.tsx` | Login page |
| `src/routes/_authed.tsx` | Auth guard layout |
| `src/hooks/useAuth.ts` | Auth context hook |
| `src/hooks/usePermissions.ts` | Permission check hook |
| `drizzle/XXXX_add_auth_fields.sql` | Migration |

### Modified Files

| File | Changes |
|------|---------|
| `src/db/schema.ts` | Add auth fields to users, add sessions table |
| `src/schemas.ts` | Add login schema, session schema |
| `src/repositories/user.repository.ts` | Add auth methods |
| `src/routes/__root.tsx` | Load user from session |
| `src/routes/expert.tsx` | Move under `_authed` |
| `src/routes/admin.tsx` | Add role check |

---

## Questions & Decisions Needed

1. **Password vs. Passwordless:** Should we use traditional password auth or passwordless (magic links)?
   - **Recommendation:** Start with passwords for simplicity, add magic links later

2. **Session Duration:** How long should sessions last?
   - **Recommendation:** 7 days with sliding expiration

3. **Remember Me:** Should we offer a "remember me" option?
   - **Recommendation:** Yes, extend session to 30 days

4. **Multi-device Sessions:** Allow multiple active sessions per user?
   - **Recommendation:** Yes, with ability to view/revoke from profile

5. **Organisation Scoping:** Should expert/admin users be scoped to specific organisations?
   - **Recommendation:** Phase 5 feature, start with global access

6. **Hashing Algorithm:** bcrypt vs. Argon2?
   - **Recommendation:** Argon2id (more modern, resistant to GPU attacks)

7. **Email Verification:** Require email verification on signup?
   - **Recommendation:** Not for Phase 1, add in Phase 5

8. **First User Setup:** How is the first super_admin created?
   - **Recommendation:** Seed script or CLI command for initial setup

---

## Dependencies

### New Packages

```bash
bun add @node-rs/argon2   # Password hashing (or bcrypt)
bun add nanoid            # Token generation (alternative to crypto)
```

### Existing Packages (Already Available)

- `zod` - Validation schemas
- `drizzle-orm` - Database operations
- TanStack Start - Middleware, routing

---

## References

- [TanStack Start Middleware Documentation](https://tanstack.com/start/latest/docs/framework/react/middleware)
- [TanStack Router Authentication Guide](https://tanstack.com/router/v1/docs/framework/react/guide/authenticated-routes)
- [TanStack Start Authentication Guide](https://tanstack.com/start/latest/docs/framework/react/guide/authentication)
- [Protected Routes with beforeLoad](https://tanstack.com/router/v1/docs/framework/react/how-to/setup-authentication)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

## Next Steps

1. Review and approve this roadmap
2. Decide on open questions (password hashing, session duration, etc.)
3. Create database migration for Phase 1
4. Implement authentication foundation
5. Test thoroughly before moving to Phase 2
