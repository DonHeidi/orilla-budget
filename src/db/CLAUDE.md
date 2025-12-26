# Database Layer

This directory contains the database schema and connection for the Orilla Budget application.

## Files

- `schema.ts` - Drizzle schema definitions for all tables
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

- `users` - User accounts (Better Auth managed)
- `sessions` - Auth sessions (Better Auth managed)
- `accounts` - OAuth accounts (Better Auth managed)
- `verifications` - Email verification tokens (Better Auth managed)
- `organisations` - Client organisations
- `organisationAccounts` - Org account contacts
- `projects` - Projects within organisations
- `projectMembers` - User-project role assignments
- `timeEntries` - Time tracking entries
- `timeSheets` - Time sheet groupings
- `timeSheetEntries` - Junction table for sheets/entries
