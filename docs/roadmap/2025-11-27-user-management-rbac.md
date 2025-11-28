# User Management & Role-Based Access Control (RBAC)

**Date:** 2025-11-27
**Status:** Completed
**Category:** Security & Authentication
**Completed:** 2025-11-28
**Context:** Implementing authentication, authorization, and a unified dashboard with permission-based UI rendering

## Related Documents

- [Permission System](./2025-11-27-permission-system.md) - Detailed permissions, role mappings, utilities
- [Unified Dashboard](./2025-11-27-unified-dashboard.md) - Route structure, navigation, UI components
- [Account & Contact Features](./2025-11-27-account-contact-features.md) - Invitation flow, time sheet approval
- [GDPR Data Model](../gdpr-data-model.md) - PII separation and data deletion compliance

## Overview

The application currently has no authentication for the Expert Dashboard (`/expert/*`) or Admin (`/admin/*`) routes. The Client Portal (`/portal`) has access-code authentication but sessions are stored in-memory and lost on page refresh.

This roadmap defines a unified dashboard architecture with role-based access control (RBAC) that:

1. **Merges all interfaces** into a single `/dashboard` route
2. **Implements permission-based UI rendering** - menu items and actions are hidden (not disabled) based on user permissions
3. **Uses unified identity model** - single `users` table with project-scoped access via `projectMembers`
4. **Uses granular permissions** - ~25 individual permissions mapped to project roles
5. **Protects routes** via TanStack Start middleware (`beforeLoad`)
6. **GDPR compliant** - PII separated into dedicated table for right-to-erasure support

### Platform Model

> **Key Insight:** This is a **freelancer platform** where:
> - Projects are the central connecting entity
> - The same person can be an expert on one project and a client on another
> - Access is primarily **project-scoped**, not role-scoped
> - People maintain a contact book of business connections
> - Paid organisation accounts unlock org-level admin capabilities

---

## Current State Analysis

### Existing Data Model

**Users Table** (Current - no authentication):
```typescript
users {
  id: string (primary key)
  handle: string (unique)
  email: string (unique)
  createdAt: ISO string
}
```

**Accounts Table** (Current - client contacts):
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

> **Note:** The current `accounts` table will be replaced by a `contacts` table. The `role` field will move to `projectMembers` to enable project-scoped access.

### Current Authentication Gaps

| Area | Current State | Risk Level |
|------|---------------|------------|
| Expert Dashboard (`/expert/*`) | No authentication | **CRITICAL** |
| Admin Dashboard (`/admin/*`) | No authentication | **CRITICAL** |
| Client Portal (`/portal`) | Access code, in-memory session | Medium |
| API/Server Functions | No authorization checks | High |

---

## Role Architecture

### Unified Identity Model

All people in the system are in the `users` table. Access is determined by:

1. **System role** (optional) - For platform-level admin capabilities
2. **Project membership** - Role within specific projects

```
System Roles (users.role - optional)
├── super_admin    # Full platform access, manage everything
├── admin          # User management, all organisations
└── (none)         # Regular user, access via project membership only

Project Roles (projectMembers.role)
├── owner          # Full project control, can invite others
├── expert         # Log time, manage entries, view project
├── reviewer       # Approve time sheets for project
├── client         # View project data, receive reports
└── viewer         # Read-only access
```

### How Roles Work Together

A user can have:
- **Zero or one** system role (for platform admins)
- **Multiple** project memberships with different roles per project

**Example scenarios:**

| Person | System Role | Project A Role | Project B Role |
|--------|-------------|----------------|----------------|
| Alice (Freelancer) | - | owner | expert |
| Bob (Client) | - | client | - |
| Carol (Platform Admin) | admin | - | - |
| Dave (Multi-role) | - | expert | client |

### System Role Definitions

| Role | Description | Use Case |
|------|-------------|----------|
| `super_admin` | Full platform access | Platform owner |
| `admin` | Manage users, orgs, projects | Operations staff |
| (none) | Access via projects only | Freelancers, clients |

### Project Role Definitions

| Role | Description | Typical User |
|------|-------------|--------------|
| `owner` | Full control, invite members, delete project | Project creator |
| `expert` | Log time, edit own entries, view project | Freelancer working on project |
| `reviewer` | Approve time sheets, view all entries | Client PM, Finance |
| `client` | View project data, receive reports | Client stakeholder |
| `viewer` | Read-only access | External viewer |

---

## Data Model Changes

> See [GDPR Data Model](../gdpr-data-model.md) for complete rationale on PII separation.

### PII Table (Personal Data - Deletable)

```typescript
export const pii = sqliteTable('pii', {
  id: text('id').primaryKey(),
  name: text('name'),
  phone: text('phone'),
  address: text('address'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
```

### Users Table (Unified Identity)

All authenticated people are in the `users` table. System role is optional.

```typescript
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  piiId: text('pii_id').references(() => pii.id, { onDelete: 'set null' }),
  handle: text('handle').unique().notNull(),
  email: text('email').unique().notNull(),  // Retained: legitimate interest
  passwordHash: text('password_hash'),
  role: text('role', { enum: ['super_admin', 'admin'] }),  // Optional system role
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastLoginAt: text('last_login_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
```

### Contacts Table (Address Book)

Personal contact book for each user. Links to users if contact has an account.

```typescript
export const contacts = sqliteTable('contacts', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').references(() => users.id).notNull(),  // Who owns this contact
  userId: text('user_id').references(() => users.id),  // If contact is also a user
  piiId: text('pii_id').references(() => pii.id, { onDelete: 'set null' }),  // Only if NOT linked to user
  email: text('email').notNull(),  // For invitations
  organisationId: text('organisation_id').references(() => organisations.id),
  createdAt: text('created_at').notNull(),
})
```

### Project Members Table (Project-Scoped Access)

```typescript
export const projectMembers = sqliteTable('project_members', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: text('role', { enum: ['owner', 'expert', 'reviewer', 'client', 'viewer'] }).notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  uniqueMembership: unique().on(table.projectId, table.userId),
}))
```

### Sessions Table

```typescript
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').unique().notNull(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
})
```

### Invitations Table

```typescript
export const invitations = sqliteTable('invitations', {
  id: text('id').primaryKey(),
  contactId: text('contact_id').references(() => contacts.id).notNull(),
  invitedByUserId: text('invited_by_user_id').references(() => users.id).notNull(),
  projectId: text('project_id').references(() => projects.id),  // Optional: invite to project
  code: text('code').unique().notNull(),
  expiresAt: text('expires_at').notNull(),
  status: text('status', { enum: ['pending', 'accepted', 'expired'] }).notNull().default('pending'),
  createdAt: text('created_at').notNull(),
})
```

---

## Invitation Flow

### User-to-User Invitation

The invitation flow connects people to projects. Either party can initiate:

```
1. User creates/selects a contact
   - From contact book or new email address
   - Contact may or may not have an account yet

2. User invites contact to a project
   - Selects project and role (expert, reviewer, client, viewer)
   - System generates unique invitation code
   - System sends invitation email

3. Contact receives invitation
   - If no account: /dashboard/invite/{code} → create account + join project
   - If has account: /dashboard/invite/{code} → login + join project

4. Contact is now a project member
   - Sees project in their dashboard
   - Has permissions based on assigned role
```

### Invitation Scenarios

| Inviter | Invitee | Scenario |
|---------|---------|----------|
| Freelancer | Client | Invite client to view project progress |
| Client | Freelancer | Invite expert to work on project |
| Admin | Anyone | Platform-level invitation |

### Account Creation via Invitation

```
/dashboard/invite/{code}

1. Validate invitation code (not expired, pending status)
2. If user already authenticated:
   - Add to project with specified role
   - Mark invitation as accepted
   - Redirect to project
3. If not authenticated:
   - Show registration/login form
   - On registration: create user + pii records
   - Add to project with specified role
   - Redirect to project
```

---

## Implementation Phases

### Phase 1: Authentication Foundation ✅

**Goal:** Basic login and session management
**Status:** Completed 2025-11-28

1. **Database changes** ✅
   - Create `pii` table
   - Add auth fields to `users` table (`piiId`, `passwordHash`, `role`)
   - Create `sessions` table
   - Generate and apply migration

2. **Auth utilities** ✅
   - Create `src/lib/auth.ts` (password hashing with Argon2id)
   - Create `src/lib/permissions.ts` (permission utilities)

3. **Repository layer** ✅
   - Create `src/repositories/session.repository.ts`
   - Create `src/repositories/pii.repository.ts`
   - Update user repository with auth methods

4. **Login page** ✅
   - Create `/dashboard/login` route
   - Cookie-based session (httpOnly, secure)

5. **Route protection** ✅
   - Create `_authenticated.tsx` layout
   - Implement `beforeLoad` redirect

### Phase 2: Permission-Based UI ✅

**Goal:** Dynamic navigation and permission gates
**Status:** Completed 2025-11-28

1. **Auth context** ✅
   - Create `AuthProvider` component
   - Create `useAuth` hook with permission helpers

2. **Navigation system** ✅
   - Create navigation configuration
   - Create `useNavigation` hook (filters by permission)
   - Build `DashboardSidebar` component

3. **Permission gates** ✅
   - Create `PermissionGate` component
   - Apply to buttons/actions throughout dashboard

4. **Route-level permissions** ✅
   - Add permission checks to sensitive routes
   - Return 403 or redirect for unauthorized access

### Phase 3: Unified Dashboard Migration ✅

**Goal:** Merge expert/admin/portal into single dashboard
**Status:** Completed 2025-11-28

1. **Route migration** ✅
   - Create new `/dashboard/_authenticated/*` routes
   - Copy/adapt components from `/expert/*`
   - Apply permission gates to UI elements

2. **Project-scoped data** ✅
   - Create `projectMembers` table
   - Add scoped repository methods
   - Update server functions to filter by project membership

3. **Remove old routes** ✅
   - Delete `/expert/*` routes
   - Delete `/admin/*` routes
   - Delete `/portal` route

4. **Update navigation** ✅
   - Remove hardcoded sidebar
   - Use dynamic navigation everywhere

### Phase 4: Contacts & Invitations ✅

**Goal:** Enable user-to-user invitations
**Status:** Completed 2025-11-28

1. **Contacts system** ✅
   - Create `contacts` table
   - Create `invitations` table
   - Build contact management UI

2. **Invitation flow** ✅
   - Create invitation generation logic
   - Create `/dashboard/invite.$code` route
   - Handle new user registration + project join
   - "Invite User" flow creates contact + invitation with shareable link

3. **Email integration** (Deferred)
   - Email sending deferred to Phase 5
   - Admin manually shares invitation links for now
   - See [User Management Enhancements](./2025-11-28-user-management-enhancements.md) for email integration plans

### Phase 5: Advanced Features (Future)

See [User Management Enhancements](./2025-11-28-user-management-enhancements.md) for detailed specifications.

1. **Email Integration** - Invitation and password reset emails
2. **Organisation-level permissions** (paid accounts)
3. **Audit logging**
4. **Two-factor authentication**
5. **OAuth integration** (Google, GitHub)
6. **GDPR data export** (Article 20 compliance)
7. **PII deletion workflow**

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
| `src/repositories/pii.repository.ts` | PII CRUD, deletion |
| `src/repositories/contact.repository.ts` | Contact book management |
| `src/repositories/invitation.repository.ts` | Invitation CRUD |
| `src/repositories/projectMember.repository.ts` | Project membership |
| `src/routes/dashboard/login.tsx` | Login page |
| `src/routes/dashboard/invite.$code.tsx` | Invitation acceptance |
| `src/routes/dashboard/_authenticated.tsx` | Auth guard layout |
| `src/routes/dashboard/_authenticated/*.tsx` | Protected dashboard routes |

### Modified Files

| File | Changes |
|------|---------|
| `src/db/schema.ts` | Add pii, sessions, contacts, invitations, projectMembers tables; update users |
| `src/schemas.ts` | Add login, session, contact, invitation, projectMember schemas |
| `src/repositories/user.repository.ts` | Add auth methods, pii joins |
| `src/routes/dashboard.tsx` | Add AuthProvider, use DashboardSidebar |

### Files to Delete

| File | Reason |
|------|--------|
| `src/routes/expert.tsx` | Replaced by unified dashboard |
| `src/routes/expert/*` | Replaced by `/dashboard/_authenticated/*` |
| `src/routes/admin.tsx` | Merged into unified dashboard |
| `src/routes/admin/*` | Merged into `/dashboard/_authenticated/*` |
| `src/routes/portal.tsx` | Clients use unified dashboard |
| `src/repositories/account.repository.ts` | Replaced by contact.repository.ts |

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
- [GDPR Article 6 - Lawfulness of processing](https://gdpr-info.eu/art-6-gdpr/)
- [GDPR Article 17 - Right to erasure](https://gdpr-info.eu/art-17-gdpr/)

---

## Next Steps

1. Review and approve this roadmap
2. Create database migration for Phase 1 (pii, users auth fields, sessions)
3. Implement authentication foundation
4. Test login/logout flows
5. Proceed to Phase 2: Permission-based UI
6. Create projectMembers table and implement project-scoped access
