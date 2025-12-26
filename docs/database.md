# Database Guide

Simple guide for working with the database.

## What We Use

- SQLite (small file database, lives in `data.db`)
- Drizzle ORM (helps us talk to database)
- Migrations (track changes over time)

## The Schema File

File: `src/db/schema.ts`

This file defines all tables:

- users
- organisations
- accounts
- projects
- time_entries

When you change this file, you need to create a migration.

## How to Change Database

### Step by step

1. **Edit the schema**
   - Open `src/db/schema.ts`
   - Add/remove/change fields
   - Save file

2. **Generate migration**

   ```bash
   bun run db:generate
   ```

   - Creates new file in `drizzle/` folder
   - File name like `0001_something.sql`
   - Contains SQL commands

3. **Check the SQL**
   - Open the new file in `drizzle/`
   - Make sure SQL looks correct
   - This is what will run on database

4. **Run migration**

   ```bash
   bun run db:migrate
   ```

   - Applies the SQL to database
   - Database now has your changes

5. **Commit to git**
   - Add the new migration file
   - Commit it
   - Migrations must be in git

### Example

Want to add phone number to organisations?

```typescript
// In src/db/schema.ts
export const organisations = sqliteTable('organisations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'), // <- Add this line
  // ... other fields
})
```

Then:

```bash
bun run db:generate  # Creates migration
bun run db:migrate   # Applies it
git add drizzle/     # Stage new migration
git commit          # Commit it
```

## Two Ways to Update Database

### Method 1: Migrations (PRODUCTION)

- Use: `bun run db:generate` then `bun run db:migrate`
- Safe for production
- Tracks history
- Can apply to any database
- **Always use this for real changes**

### Method 2: Push (LOCAL ONLY)

- Use: `bun run db:push`
- Quick and dirty
- Skips migration files
- Only for temporary local testing
- **Never use for production**

## Common Commands

```bash
# Normal workflow
bun run db:generate    # Make migration from schema changes
bun run db:migrate     # Run pending migrations

# Development only
bun run db:push        # Force schema to database (no migration)
bun run db:studio      # Open visual database browser
```

## Understanding Migrations

Migrations are like git commits for your database.

Each migration file:

- Has number (0000, 0001, 0002, etc)
- Contains SQL commands
- Applied in order
- Tracked in special table `__drizzle_migrations`

Database remembers which migrations already ran.

When you deploy:

- Production database has migrations 0000-0005
- You add migration 0006 locally
- Push code to production
- Run `bun run db:migrate` on production
- It only runs migration 0006
- Production database now up to date

## File Locations

```
project/
├── data.db                    # Database file (not in git)
├── src/db/schema.ts          # Table definitions
├── drizzle/                  # Migrations folder (in git)
│   ├── 0000_initial.sql      # First migration
│   ├── 0001_add_phone.sql    # Second migration
│   └── meta/                 # Migration metadata
└── drizzle.config.ts         # Drizzle configuration
```

## What Goes in Git

✅ Commit these:

- `drizzle/` folder (all migrations)
- `src/db/schema.ts`
- `drizzle.config.ts`

❌ Never commit:

- `data.db` (your local database)
- `data.db-*` (database temp files)

## Troubleshooting

### Migration fails

- Check if migration SQL is valid
- Check if column/table already exists
- Look at error message carefully

### Lost sync between schema and database

- In development: delete `data.db` and run `bun run db:migrate`
- In production: never delete database, fix with new migration

### Want to undo migration

- Create new migration that reverses the change
- Never delete migration files after they're committed

## Tips

- Review generated SQL before running migrate
- Test migrations on copy of production data first
- Keep migrations small and focused
- One logical change per migration
- Commit migrations immediately after creating them
- Never edit old migration files

---

## Schema Changes: Complete Workflow

When modifying the database schema, multiple files need to be updated in sync. Follow this comprehensive workflow:

### Step-by-Step Schema Change Workflow

```bash
# 1. Modify the Drizzle schema
#    Edit src/db/schema.ts with your table/column changes

# 2. Update Zod validation schemas
#    Edit src/schemas.ts to match the new schema structure

# 3. Update TypeScript types (if needed)
#    Edit src/types.ts for any view models or domain interfaces

# 4. Generate the migration
bun run db:generate

# 5. Review the generated SQL
#    Check drizzle/XXXX_*.sql - verify it does what you expect

# 6. Apply the migration to your local database
bun run db:migrate

# 7. Update repository layer (if needed)
#    Edit src/repositories/*.repository.ts for new queries/operations

# 8. Update seed script (if needed)
#    Edit scripts/seed-test-data.ts to include new fields/tables

# 9. Run tests to verify nothing broke
bun test

# 10. Commit all changes together
git add src/db/schema.ts src/schemas.ts drizzle/ src/repositories/ scripts/
git commit -m "feat(db): add new-feature table/column"
```

### Files to Update for Schema Changes

| Change Type | Files to Update |
|-------------|-----------------|
| New table | `schema.ts`, `schemas.ts`, new `*.repository.ts`, `seed-test-data.ts` |
| New column | `schema.ts`, `schemas.ts`, possibly `*.repository.ts` |
| Column rename | `schema.ts`, `schemas.ts`, `*.repository.ts`, `seed-test-data.ts` |
| New enum value | `schema.ts`, `schemas.ts` |
| Foreign key | `schema.ts`, possibly `*.repository.ts` for joins |

### Example: Adding a New Column

```typescript
// 1. src/db/schema.ts - Add column to table
export const projects = sqliteTable('projects', {
  // ... existing columns
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false), // NEW
})

// 2. src/schemas.ts - Update Zod schema
export const projectSchema = z.object({
  // ... existing fields
  archived: z.boolean().default(false), // NEW
})

// 3. Generate and apply migration
// bun run db:generate && bun run db:migrate
```

### Example: Adding a New Table

```typescript
// 1. src/db/schema.ts - Define new table
export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  amount: real('amount').notNull(),
  date: text('date').notNull(),
  createdAt: text('created_at').notNull(),
})

// 2. src/schemas.ts - Add Zod schemas
export const expenseSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid().nullable(),
  description: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  createdAt: z.string().datetime(),
})

export const createExpenseSchema = expenseSchema.omit({ id: true, createdAt: true })
export type Expense = z.infer<typeof expenseSchema>
export type CreateExpense = z.infer<typeof createExpenseSchema>

// 3. src/repositories/expense.repository.ts - Create repository
import { db } from '@/db'
import { expenses } from '@/db/schema'
import { eq } from 'drizzle-orm'
import type { Expense, CreateExpense } from '@/schemas'

export const expenseRepository = {
  findAll: () => db.select().from(expenses),
  findById: (id: string) => db.select().from(expenses).where(eq(expenses.id, id)).get(),
  create: (data: Expense) => db.insert(expenses).values(data).returning().get(),
  // ... other methods
}

// 4. scripts/seed-test-data.ts - Add test data
const testExpenses: Expense[] = [
  { id: 'exp-1', projectId: 'proj-1', description: 'Software license', amount: 99.99, date: '2024-01-15', createdAt: now() },
]

// 5. Generate migration, apply, and test
// bun run db:generate && bun run db:migrate && bun test
```

### Common Pitfalls

1. **Forgetting to update Zod schemas** - TypeScript won't catch mismatches between Drizzle and Zod schemas at compile time
2. **Not reviewing generated SQL** - Always check the migration before applying; Drizzle might generate unexpected changes
3. **Using `db:push` instead of migrations** - Only use `db:push` for throwaway local experiments
4. **Forgetting to update seed script** - New required columns will cause seed script to fail
5. **Not running tests** - Schema changes can break repository queries silently

## Example: Adding New Field

Want to add `budget_warning_threshold` to projects?

1. Edit schema:

```typescript
export const projects = sqliteTable('projects', {
  // existing fields...
  budgetWarningThreshold: real('budget_warning_threshold').default(0.8),
})
```

2. Generate:

```bash
bun run db:generate
```

Output: `Created drizzle/0002_add_budget_warning.sql`

3. Check the file:

```sql
ALTER TABLE `projects` ADD `budget_warning_threshold` real DEFAULT 0.8;
```

Looks good!

4. Apply:

```bash
bun run db:migrate
```

Output: `migrations applied successfully!`

5. Commit:

```bash
git add drizzle/0002_add_budget_warning.sql
git add drizzle/meta/
git add src/db/schema.ts
git commit -m "feat(db): add budget warning threshold to projects"
```

Done!

## Current State

Database reset on 2025-11-04.

Fresh start with single initial migration containing all tables.

All old messy migrations removed.

Clean slate going forward.
