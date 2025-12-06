# Project Ownership Model

**Date:** 2025-12-06
**Status:** Planned
**Category:** Data Model & Architecture

## Overview

Introduce a clean separation between authorization (Better Auth teams) and business data (projects). Every project is backed by a team for membership/roles, but project-specific data lives in a separate table. This keeps Better Auth focused on authorization while giving us full control over business logic.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Better Auth Layer                        │
│  ┌─────────────┐      ┌─────────────────┐                  │
│  │    team     │◄─────│   teamMember    │                  │
│  │  (auth)     │      │ (roles/access)  │                  │
│  └──────┬──────┘      └─────────────────┘                  │
│         │                                                   │
└─────────┼───────────────────────────────────────────────────┘
          │ 1:1
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Business Layer                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                     project                          │   │
│  │  - teamId (FK → team.id, unique)                    │   │
│  │  - createdBy (FK → user.id)                         │   │
│  │  - name, description, category, budgetHours         │   │
│  │  - organisationId (denormalized for queries)        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Key principle**: Teams handle WHO can access WHAT. Projects handle WHAT the thing IS.

---

## Current State

**Better Auth `team` table** - Managed by Better Auth:
- `id`, `name`, `organizationId`, `createdAt`, `updatedAt`
- Currently has `description`, `category`, `budgetHours` as additionalFields (to be migrated out)

**Better Auth `teamMember` table** - Managed by Better Auth:
- `id`, `teamId`, `userId`, `projectRole`, `createdAt`

---

## Proposed Changes

### 1. New `project` Table

```typescript
// src/db/schema.ts
export const project = sqliteTable('project', {
  id: text('id').primaryKey(),

  // Link to Better Auth team (1:1 relationship)
  teamId: text('team_id')
    .notNull()
    .unique()
    .references(() => betterAuth.team.id, { onDelete: 'cascade' }),

  // Creator tracking (immutable audit trail)
  createdBy: text('created_by')
    .references(() => betterAuth.user.id, { onDelete: 'set null' }),

  // Denormalized from team for easier queries
  organisationId: text('organisation_id')
    .references(() => betterAuth.organization.id, { onDelete: 'cascade' }),

  // Business data (moved from team additionalFields)
  name: text('name').notNull(),
  description: text('description').default(''),
  category: text('category', { enum: ['budget', 'fixed'] }).default('budget'),
  budgetHours: real('budget_hours'),

  // Timestamps
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
```

### 2. Better Auth Configuration (Simplified)

Remove business fields from team additionalFields:

```typescript
// src/lib/auth.ts
organization({
  teams: { enabled: true },
  schema: {
    team: {
      // No business additionalFields - just authorization
    },
    teamMember: {
      additionalFields: {
        projectRole: {
          type: 'string',
          required: true,
          defaultValue: 'viewer',
          input: true,
        },
      },
    },
  },
  organizationHooks: {
    afterCreateTeam: async ({ team, user }) => {
      // Create corresponding project record
      await db.insert(project).values({
        id: generateId(),
        teamId: team.id,
        createdBy: user.id,
        organisationId: team.organizationId,
        name: team.name,
        description: '',
        category: 'budget',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      // Add creator as owner
      await db.insert(betterAuth.teamMember).values({
        id: generateId(),
        teamId: team.id,
        userId: user.id,
        projectRole: 'owner',
        createdAt: new Date(),
      })
    },
  },
}),
```

### 3. Business Rules

| Rule | Implementation |
|------|----------------|
| **Creator is immutable** | `createdBy` set once in `afterCreateTeam`, never updated |
| **User-based reference** | FK to `user.id` with `onDelete: 'set null'` (GDPR-safe) |
| **Creator becomes owner** | Hook creates `teamMember` with `owner` role |
| **Minimum one owner** | Check in repository before removing owners |
| **1:1 team↔project** | `teamId` is unique, cascade delete |

### 4. Owner Permissions

Owners are project-scoped administrators with full control:

- Invite/remove project members
- Change member roles
- Modify project settings (name, description, category, budget)
- Configure approval workflow settings
- Delete the project
- All permissions of lower roles (expert, reviewer, etc.)

---

## Migration Strategy

Existing data in `team.description`, `team.category`, `team.budgetHours` needs migration:

```sql
-- 1. Create project table
CREATE TABLE project (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL UNIQUE REFERENCES team(id) ON DELETE CASCADE,
  created_by TEXT REFERENCES user(id) ON DELETE SET NULL,
  organisation_id TEXT REFERENCES organization(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'budget',
  budget_hours REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. Migrate existing data from team table
INSERT INTO project (id, team_id, organisation_id, name, description, category, budget_hours, created_at, updated_at)
SELECT
  lower(hex(randomblob(16))),  -- Generate new UUID
  id,
  organization_id,
  name,
  COALESCE(description, ''),
  COALESCE(category, 'budget'),
  budget_hours,
  datetime('now'),
  datetime('now')
FROM team;

-- 3. Set createdBy from existing owners (best effort)
UPDATE project
SET created_by = (
  SELECT user_id FROM team_member
  WHERE team_member.team_id = project.team_id
  AND team_member.project_role = 'owner'
  LIMIT 1
);
```

---

## Implementation Phases

### Phase 1: Schema & Migration
- [ ] Add `project` table to `src/db/schema.ts`
- [ ] Generate migration: `bun run db:generate`
- [ ] Write data migration script for existing teams
- [ ] Apply migration: `bun run db:migrate`

### Phase 2: Better Auth Config
- [ ] Remove business fields from team additionalFields
- [ ] Add `afterCreateTeam` hook for project creation + owner assignment
- [ ] Regenerate Better Auth schema: `bunx @better-auth/cli generate`

### Phase 3: Repository Layer
- [ ] Create/update `project.repository.ts` for business operations
- [ ] Update queries to use `project` table instead of `team` for business data
- [ ] Add `canRemoveOwner()` check
- [ ] Update time entry queries to join through project

### Phase 4: Zod Schemas
- [ ] Update `projectSchema` to reflect new structure
- [ ] Add `teamId` to schema
- [ ] Keep backwards-compatible API shape where possible

### Phase 5: Routes & UI
- [ ] Update project routes to use new repository
- [ ] Ensure project creation triggers Better Auth team creation
- [ ] Update forms if needed

### Phase 6: Cleanup & Testing
- [ ] Update seed script to create projects alongside teams
- [ ] Update tests
- [ ] Remove unused team additionalFields columns (optional, can leave for safety)

---

## Files Overview

### Files to Modify

| File | Changes |
|------|---------|
| `src/db/schema.ts` | Add `project` table definition |
| `src/lib/auth.ts` | Add hooks, simplify team schema |
| `src/schemas.ts` | Update project Zod schema |
| `src/repositories/project.repository.ts` | Query project table |
| `scripts/seed-test-data.ts` | Create projects alongside teams |

### Files to Create

| File | Purpose |
|------|---------|
| `scripts/migrate-team-to-project.ts` | One-time data migration |

---

## Query Patterns

### Get project with membership info

```typescript
const projectWithRole = await db
  .select({
    id: project.id,
    name: project.name,
    category: project.category,
    budgetHours: project.budgetHours,
    createdBy: project.createdBy,
    role: betterAuth.teamMember.projectRole,
  })
  .from(project)
  .innerJoin(betterAuth.teamMember, eq(project.teamId, betterAuth.teamMember.teamId))
  .where(and(
    eq(project.id, projectId),
    eq(betterAuth.teamMember.userId, userId)
  ))
  .get()
```

### Check owner count before removal

```typescript
const ownerCount = await db
  .select({ count: count() })
  .from(betterAuth.teamMember)
  .innerJoin(project, eq(project.teamId, betterAuth.teamMember.teamId))
  .where(and(
    eq(project.id, projectId),
    eq(betterAuth.teamMember.projectRole, 'owner')
  ))
  .get()

if (ownerCount.count <= 1) {
  throw new Error('Cannot remove last owner. Delete the project instead.')
}
```

---

## Benefits of This Approach

1. **Clean separation**: Auth layer stays focused on access control
2. **No Better Auth interference**: We own the project table entirely
3. **Future flexibility**: Teams can be used for other purposes (departments, working groups)
4. **Easier testing**: Can test business logic without mocking Better Auth
5. **Migration safety**: Existing Better Auth behavior unchanged
6. **Sync via hooks**: Data creation stays consistent through Better Auth events

---

## Future Considerations

- **Team reuse**: A team could potentially back multiple "things" (project, department, etc.)
- **Project types**: Could add a `type` field for different use cases
- **Audit log**: Project changes tracked separately from auth events
- **Attribute-based access**: Business rules in project layer, auth in team layer

---

## Next Steps

1. Review and approve this architecture
2. Implement in the `docs/project-ownership-model` worktree
3. Start with Phase 1 (schema & migration)
