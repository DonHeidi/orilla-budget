# Better Auth Migration

**Date:** 2025-12-02
**Status:** Planned
**Category:** Security & Authentication

## Overview

Migration from custom authentication (Argon2id sessions, manual RBAC) to Better Auth framework with:
- Organization plugin with Teams for hierarchical RBAC
- Admin plugin for system-level roles (super_admin, admin)
- TanStack Start integration
- Backwards-compatible Argon2id password hashing
- Portal access codes remain unchanged (out of scope)

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
| `accounts` (portal) | Keep as-is | Out of scope for this migration |

### Key Design Decisions

1. **Hierarchy**: Organisations → Organizations, Projects → Teams
2. **Sessions**: Invalidate all existing sessions (clean migration)
3. **Passwords**: Keep Argon2id hashing for backwards compatibility
4. **Portal**: Keep as-is (out of scope for this migration)
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
- [ ] Install `better-auth` package
- [ ] Add environment variables (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`)
- [ ] Create `src/lib/better-auth.ts` - Better Auth server instance
- [ ] Create `src/lib/auth-client.ts` - Better Auth React client
- [ ] Create `src/routes/api/auth/$.ts` - API route handler

### Phase 2: Permission System Migration
- [ ] Update `src/lib/permissions.ts` for `teamMember.projectRole` field
- [ ] Update type imports to use Better Auth user type
- [ ] Verify contextual permission functions work with new data model

### Phase 3: Database Schema Migration
- [ ] Generate Better Auth schema with CLI
- [ ] Create migration script `scripts/migrate-to-better-auth.ts`
- [ ] Migrate users (preserve IDs for FK references)
- [ ] Migrate organisations → organization
- [ ] Migrate projects → team
- [ ] Migrate projectMembers → teamMember

### Phase 4: Route Protection Updates
- [ ] Update `src/routes/dashboard.tsx` to use Better Auth session
- [ ] Update `src/routes/login.tsx` to use Better Auth client

### Phase 5: Component & Repository Updates
- [ ] Update `src/components/auth-provider.tsx` for Better Auth hooks
- [ ] Update `src/repositories/user.repository.ts` for Better Auth tables
- [ ] Update `src/repositories/organisation.repository.ts` for `organization` table
- [ ] Update `src/repositories/project.repository.ts` for `team` table
- [ ] Update `src/repositories/projectMember.repository.ts` for `teamMember` table

### Phase 6: Testing & Verification
- [ ] User registration works
- [ ] User login works (existing Argon2id passwords)
- [ ] Session management works
- [ ] Organization membership is correct
- [ ] Role-based permissions work
- [ ] Admin functions work
- [ ] Route protection works
- [ ] Logout works
- [ ] Approval workflow permissions still work

### Phase 7: Cleanup
- [ ] Remove old auth files (`src/lib/auth.ts`, `src/lib/auth.shared.ts`, etc.)
- [ ] Backup and drop old tables

---

## Files Overview

### New Files to Create

| File | Purpose |
|------|---------|
| `src/lib/better-auth.ts` | Better Auth server instance |
| `src/lib/auth-client.ts` | Better Auth React client |
| `src/routes/api/auth/$.ts` | Better Auth API route handler |
| `scripts/migrate-to-better-auth.ts` | Data migration script |

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/permissions.ts` | Update for `teamMember.projectRole` checks |
| `src/routes/login.tsx` | Use Better Auth signIn |
| `src/routes/dashboard.tsx` | Use Better Auth session |
| `src/components/auth-provider.tsx` | Use Better Auth hooks |
| `src/db/schema.ts` | Add Better Auth table definitions |
| `src/repositories/*.repository.ts` | Update to query new table names |
| `.env` | Add `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` |

### Files to Remove (after migration verified)

| File | Reason |
|------|--------|
| `src/lib/auth.ts` | Replaced by `better-auth.ts` |
| `src/lib/auth.shared.ts` | Cookie config handled by Better Auth |
| `src/lib/auth/session.server.ts` | Better Auth handles sessions |
| `src/lib/auth/types.ts` | Types inferred from Better Auth |
| `src/server/auth.server.ts` | Better Auth handles login |
| `src/repositories/session.repository.ts` | Better Auth handles sessions |

---

## Technical Considerations

### Password Compatibility

Existing Argon2id hashes work directly with Better Auth's custom hash/verify functions. No password reset required for existing users.

### Session Invalidation

All existing sessions will be invalidated during migration. Users will need to re-login.

### Portal (Out of Scope)

Portal access codes remain unchanged for this migration. The `accounts` table and `src/routes/portal.tsx` will continue to use the existing access code authentication system.

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

## Next Steps

1. Install Better Auth: `bun add better-auth`
2. Begin Phase 1 implementation
