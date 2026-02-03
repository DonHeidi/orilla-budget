# Database Layer

This directory contains the database schema and connection for the Orilla Budget application.

## Files

- `schema.ts` - Application-specific table definitions
- `better-auth-schema.ts` - Better Auth tables (user, session, organization, team, member)
- `index.ts` - Database connection using Bun SQLite driver

The database file `data.db` lives at the project root (not in this directory).

## Schema Patterns

### Table Definition

```typescript
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  organisationId: text('organisation_id')
    .references(() => organisations.id, { onDelete: 'cascade' }),
  budgetHours: real('budget_hours'),
  category: text('category', { enum: ['budget', 'fixed'] }).notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at'),
})
```

### Key Conventions

- **IDs**: Use `text('id').primaryKey()` with UUIDs
- **Timestamps**: Store as ISO strings via `text('created_at')`, not Date objects
- **Foreign Keys**: Always specify `onDelete` behavior (usually `cascade`)
- **Booleans**: Use `integer('field', { mode: 'boolean' })`
- **Enums**: Use `text('field', { enum: ['a', 'b'] })`

### SQLite-Specific Notes

- SQLite returns `null` for optional fields, not `undefined`
- Foreign key constraints are enabled in `index.ts`
- All timestamps are ISO 8601 strings (serialization-safe)

## Making Schema Changes

1. Edit `schema.ts`
2. Run `bun run db:generate` to create migration
3. Review SQL in `drizzle/` folder
4. Run `bun run db:migrate` to apply
5. Update `src/schemas.ts` (Zod) to match
6. Commit migration files

**See [docs/database.md](/docs/database.md) for the complete schema change workflow.**

## Current Tables

### Better Auth Tables (`better-auth-schema.ts`)

- `user` - User accounts
- `session` - Auth sessions
- `account` - OAuth provider accounts
- `verification` - Email verification tokens
- `organization` - Client organizations
- `team` - Teams/projects within organizations
- `teamMember` - User-team role assignments
- `member` - Organization membership
- `invitation` - Organization invitations

### Application Tables (`schema.ts`)

- `project` - Legacy project definitions
- `pii` - Personally identifiable information (GDPR)
- `accounts` - Organization member accounts
- `contacts` - External contacts
- `invitations` - Project invitations
- `timeEntries` - Time tracking entries
- `timeSheets` - Time sheet groupings
- `timeSheetEntries` - Junction: sheets ↔ entries
- `entryMessages` - Comments on time entries
- `projectApprovalSettings` - Approval workflow config
- `timeSheetApprovals` - Time sheet approval records
