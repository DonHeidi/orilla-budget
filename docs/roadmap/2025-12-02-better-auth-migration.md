# Better Auth Migration

**Date:** 2025-12-02
**Status:** Completed
**Category:** Security & Authentication
**Last Updated:** 2025-12-03

> **Note:** Core migration is complete. Remaining tasks (email integration, user-facing auth flows)
> have been moved to separate roadmap documents. See [Related Documents](#related-documents).

## Overview

Migration from custom authentication (Argon2id sessions, manual RBAC) to Better Auth framework with:
- Organization plugin with Teams for hierarchical RBAC
- Admin plugin for system-level roles (super_admin, admin)
- TanStack Start integration
- Backwards-compatible Argon2id password hashing
- Portal access code users converted to regular Better Auth users

---

## Current State Analysis

### Existing Authentication System

- Custom cookie-based sessions stored in `sessions` table
- Argon2id password hashing via Bun
- Manual RBAC with system roles (`super_admin`, `admin`) and project roles (`owner`, `expert`, `reviewer`, `client`, `viewer`)
- Portal access via `accounts` table with access codes
- Permission system in `src/lib/permissions.ts` with:
  - Basic permissions: `time-entries:*`, `time-sheets:*`, `project:*`, `contacts:*`
  - Entry-level approval: `entries:question`, `entries:approve`, `entries:change-status`
  - Messages: `messages:view`, `messages:create`, `messages:delete-own`, `messages:delete-all`
  - Approval settings: `approval-settings:view`, `approval-settings:edit`
  - Contextual permission functions: `canApproveTimeSheet()`, `canApproveEntry()`, etc.

### Current Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts with system roles |
| `sessions` | Cookie-based sessions |
| `organisations` | Client companies |
| `projects` | Projects within organisations |
| `projectMembers` | Project-specific role assignments |
| `accounts` | Portal access (access codes) |

---

## Proposed Solution

### Data Model Mapping

| Current | Better Auth | Notes |
|---------|-------------|-------|
| `organisations` | `organization` | Client companies |
| `projects` | `team` | Projects within organisations |
| `projectMembers` | `teamMember` + custom `projectRole` field | Project-specific roles |
| `users` | `user` | User accounts |
| `sessions` | `session` | Better Auth handles this |
| `accounts` (portal) | Convert to `user` | Portal users become regular users |

### Key Design Decisions

1. **Hierarchy**: Organisations → Organizations, Projects → Teams
2. **Sessions**: Invalidate all existing sessions (clean migration)
3. **Passwords**: Keep Argon2id hashing for backwards compatibility
4. **Portal**: Migrate to Better Auth (clients become regular users with viewer/client roles)
5. **Permissions**: Keep existing permission logic, only change data source

### Better Auth Configuration

```typescript
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite" }),
  emailAndPassword: {
    enabled: true,
    password: {
      hash: async (password) => Bun.password.hash(password, { algorithm: "argon2id" }),
      verify: async ({ hash, password }) => Bun.password.verify(password, hash),
    },
  },
  plugins: [
    admin({ adminRoles: ["super_admin", "admin"] }),
    organization({
      teams: { enabled: true },
      schema: {
        teamMember: {
          additionalFields: {
            projectRole: { type: "string", required: true, defaultValue: "viewer" },
          },
        },
      },
    }),
    tanstackStartCookies(),
  ],
})
```

---

## Implementation Phases

### Phase 1: Setup & Configuration
- [x] Install `better-auth` package
- [x] Add environment variables (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`)
- [x] Create `src/lib/auth.ts` - Better Auth server instance (consolidated)
- [x] Create `src/lib/auth-client.ts` - Better Auth React client
- [x] Create `src/routes/api/auth/$.ts` - API route handler

### Phase 2: Permission System Migration
- [x] Update `src/lib/permissions.ts` for `teamMember.projectRole` field
- [x] Update type imports to use Better Auth user type
- [x] Verify contextual permission functions work with new data model

### Phase 3: Database Schema Migration
- [x] Generate Better Auth schema with CLI
- [x] Create migration script `scripts/migrate-to-better-auth.ts`
- [x] Migrate users (preserve IDs for FK references)
- [x] Migrate organisations → organization
- [x] Migrate projects → team
- [x] Migrate projectMembers → teamMember
- [x] Convert portal accounts to users

### Phase 4: Route Protection Updates
- [x] Update `src/routes/dashboard.tsx` to use Better Auth session
- [x] Update `src/routes/login.tsx` to use Better Auth client
- [x] Update `src/routes/portal.tsx` to use Better Auth session

### Phase 5: Component & Repository Updates
- [x] Update `src/components/auth-provider.tsx` for Better Auth hooks
- [x] Update `src/repositories/user.repository.ts` for Better Auth tables
- [x] Update `src/repositories/organisation.repository.ts` for `organization` table
- [x] Update `src/repositories/project.repository.ts` for `team` table
- [x] Update `src/repositories/projectMember.repository.ts` for `teamMember` table

### Phase 6: Repository Pattern Alignment (NEW - 2025-12-03)
- [x] Create `src/repositories/auth.repository.ts` - wraps all Better Auth API calls
- [x] Consolidate auth files (from 7 to 4 files)
- [x] Make `user.repository.ts` the single entry point for user domain
- [x] Update route files to use repository pattern consistently
- [x] Add missing unit tests for `updatePiiId()` and `createPiiRecord()`

### Phase 7: Testing & Verification
- [x] User registration works
- [x] User login works (existing Argon2id passwords)
- [x] Session management works
- [x] Organization membership is correct
- [x] Role-based permissions work
- [x] Admin functions work
- [x] Route protection works
- [x] Logout works
- [x] Approval workflow permissions still work
- [x] Build passes
- [x] All 881 tests pass

### Phase 8: Cleanup
- [x] Remove old auth files (`src/lib/auth.shared.ts`, `src/lib/auth/` directory)
- [x] ~~Backup and drop old tables~~ (deferred - evaluate after production testing)

> **Note:** Remaining tasks moved to separate documents:
> - Password reset, email verification → [Email Integration](./2025-12-03-email-integration.md)
> - Signup UI, settings pages → [User Auth Flows](./2025-12-03-user-auth-flows.md)

---

## Repository Architecture (2025-12-03)

### Auth File Consolidation

Reduced from 7 auth files to 4:

| Before | After | Notes |
|--------|-------|-------|
| `src/lib/auth.ts` | `src/lib/auth.ts` | Consolidated Better Auth instance + helpers |
| `src/lib/auth.shared.ts` | *Deleted* | Merged into `auth.ts` |
| `src/lib/auth-client.ts` | `src/lib/auth-client.ts` | React client (unchanged) |
| `src/lib/auth-server.ts` | `src/lib/auth-server.ts` | Server-side exports |
| `src/lib/auth/better-auth-session.server.ts` | *Deleted* | Merged into `auth.ts` |
| `src/lib/auth/helpers.server.ts` | *Deleted* | Merged into `auth.ts` |
| `src/lib/auth/types.ts` | *Deleted* | Types now in `auth.ts` |

### Repository Pattern

```
Routes/Server Functions
        │
        ▼
┌─────────────────┐
│ userRepository  │◄── Single entry point for user domain
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────────┐
│Direct  │ │authRepository│
│DB Ops  │ │(Better Auth) │
└────────┘ └──────────────┘
```

### auth.repository.ts

Wraps all Better Auth API calls:

```typescript
export const authRepository = {
  // Session Management
  getSession: (headers) => auth.api.getSession({ headers }),
  signOut: (headers) => auth.api.signOut({ headers }),

  // Authentication
  signUpEmail: (data) => auth.api.signUpEmail({ body: data }),

  // User Management (Admin)
  listUsers: (options?) => auth.api.listUsers({ query: options }),
  createUser: (data) => auth.api.createUser({ body: data }),
  updateUser: (userId, data) => auth.api.updateUser({ body: { userId, ...data } }),
  setUserPassword: (userId, newPassword) => auth.api.setUserPassword({ body: { userId, newPassword } }),
  setRole: (userId, role) => auth.api.setRole({ body: { userId, role } }),
  banUser: (userId, banReason?, banExpiresIn?) => auth.api.banUser({ body: { userId, banReason, banExpiresIn } }),
  unbanUser: (userId) => auth.api.unbanUser({ body: { userId } }),
  removeUser: (userId) => auth.api.removeUser({ body: { userId } }),

  // Organization & Team Management
  createOrganization: (data) => auth.api.createOrganization({ body: data }),
  updateOrganization: (organizationId, data) => auth.api.updateOrganization({ body: { organizationId, data } }),
  createTeam: (data) => auth.api.createTeam({ body: data }),
  updateTeam: (teamId, data) => auth.api.updateTeam({ body: { teamId, data } }),
  removeTeam: (teamId) => auth.api.removeTeam({ body: { teamId } }),
  addMember: (data) => auth.api.addMember({ body: data }),
}
```

### user.repository.ts

Single entry point for all user domain operations:

| Category | Method | Implementation |
|----------|--------|----------------|
| **Read** | `findAll()`, `findById()`, `findByEmail()`, `findByHandle()`, `findByIdWithPii()`, `findActiveByEmail()` | Direct DB |
| **Create** | `signUp()` | → `authRepository.signUpEmail()` |
| **Create** | `create()` | → `authRepository.createUser()` |
| **Update** | `update()` | → `authRepository.updateUser()` |
| **Update** | `updateHandle()`, `updatePiiId()`, `updateLastLogin()` | Direct DB |
| **Update** | `setPassword()` | → `authRepository.setUserPassword()` |
| **Update** | `setRole()` | → `authRepository.setRole()` |
| **Ban** | `ban()`, `unban()` | → `authRepository.banUser()`, `unbanUser()` |
| **Delete** | `remove()` | → `authRepository.removeUser()` |
| **PII** | `createPiiRecord()` | Direct DB |

---

## Files Overview

### Current Auth Files

| File | Purpose |
|------|---------|
| `src/lib/auth.ts` | Better Auth server instance, helpers, types |
| `src/lib/auth-client.ts` | Better Auth React client |
| `src/lib/auth-server.ts` | Server-side exports |
| `src/repositories/auth.repository.ts` | Better Auth API wrapper |
| `src/repositories/user.repository.ts` | User domain entry point |

### Files Modified (Phase 6)

| File | Changes |
|------|---------|
| `src/routes/dashboard.tsx` | Use `authRepository` for session |
| `src/routes/dashboard/users.$id.tsx` | Use `userRepository.remove()` |
| `src/routes/invite.$code.tsx` | Use `userRepository.signUp()` |
| `src/repositories/user.repository.ts` | Delegate to `authRepository` |
| `src/repositories/user.repository.test.ts` | Added 6 new tests |

### Files Deleted (Phase 6)

| File | Reason |
|------|--------|
| `src/lib/auth.shared.ts` | Merged into `auth.ts` |
| `src/lib/auth/better-auth-session.server.ts` | Merged into `auth.ts` |
| `src/lib/auth/helpers.server.ts` | Merged into `auth.ts` |
| `src/lib/auth/types.ts` | Types now in `auth.ts` |

---

## Test Coverage

### User Repository Tests: 40 tests

| Test Suite | Count | Status |
|------------|-------|--------|
| `findAll` | 2 | ✅ |
| `findById` | 2 | ✅ |
| `findByEmail` | 3 | ✅ |
| `findByHandle` | 2 | ✅ |
| `findActiveByEmail` | 2 | ✅ |
| `findByIdWithPii` | 2 | ✅ |
| `create` | 2 | ✅ |
| `update` | 4 | ✅ |
| `delete` | 3 | ✅ |
| `createWithPassword` | 2 | ✅ |
| `verifyPassword` | 4 | ✅ |
| `updateLastLogin` | 1 | ✅ |
| `updatePassword` | 1 | ✅ |
| `updateRole` | 2 | ✅ |
| `deactivate` | 1 | ✅ |
| `activate` | 1 | ✅ |
| `updatePiiId` | 3 | ✅ (NEW) |
| `createPiiRecord` | 3 | ✅ (NEW) |

### Full Test Suite: 881 tests, 0 failures

---

## Technical Considerations

### Password Compatibility

Existing Argon2id hashes work directly with Better Auth's custom hash/verify functions. No password reset required for existing users.

### Session Invalidation

All existing sessions will be invalidated during migration. Users will need to re-login.

### Portal User Migration

Portal users (with access codes) will be converted to regular users:
1. Migration script creates user accounts
2. Users receive password reset emails
3. Portal route updated to use Better Auth session

### Approval Workflow Compatibility

The approval workflow (added 2025-12-01) uses contextual permission functions that rely on:
- `user.role` (system role) - now from Better Auth user
- `userMembership.role` (project role) - now from `teamMember.projectRole`

These functions will continue to work after migration with minimal changes.

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Password compatibility | Using Bun's Argon2id - existing hashes work directly |
| Data loss | Backup tables before dropping; migration script is idempotent |
| Session invalidation | Expected and confirmed - users will re-login |
| Permission gaps | Permission logic remains similar; only data source changes |
| Rollback | Git worktree for isolated changes; easy revert |

---

## Dependencies

```bash
bun add better-auth
```

---

## References

- [Better Auth Documentation](https://www.better-auth.com/)
- [Better Auth Organization Plugin](https://www.better-auth.com/docs/plugins/organization)
- [Better Auth Admin Plugin](https://www.better-auth.com/docs/plugins/admin)
- [Better Auth TanStack Start Integration](https://www.better-auth.com/docs/integrations/tanstack-start)

---

## Related Documents

- [Email Integration](./2025-12-03-email-integration.md) - Email service setup, password reset, verification
- [User Auth Flows](./2025-12-03-user-auth-flows.md) - Signup, password reset, account management UI

---

## Next Steps

1. ~~Create worktree: `git worktree add ../feature-better-auth-migration feature/better-auth-migration`~~
2. ~~Copy database: `cp data.db ../feature-better-auth-migration/`~~
3. ~~Install Better Auth: `bun add better-auth`~~
4. ~~Begin Phase 1-6 implementation~~
5. ~~Complete Phase 8: Cleanup~~
6. **Create PR for merge to main**
7. Continue with [Email Integration](./2025-12-03-email-integration.md)
8. Continue with [User Auth Flows](./2025-12-03-user-auth-flows.md)
