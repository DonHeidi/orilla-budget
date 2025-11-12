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
