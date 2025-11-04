# Database Migrations Guide

This project uses Drizzle ORM with SQLite for database management.

## Migration Workflow

### Making Schema Changes

1. **Update the schema** in `src/db/schema.ts`
2. **Generate migration**: `bun run db:generate`
   - Creates a new migration file in `drizzle/` with timestamped SQL
   - Review the generated SQL to ensure it's correct
3. **Apply migration**: `bun run db:migrate`
   - Runs pending migrations against your database
4. **Commit migration files** to version control

### Important Commands

```bash
bun run db:generate  # Generate migration from schema changes
bun run db:migrate   # Apply pending migrations
bun run db:push      # Push schema directly (dev only - skips migrations!)
bun run db:studio    # Open Drizzle Studio to view/edit data
```

### Best Practices

- **Always use `db:generate` + `db:migrate`** for schema changes that will go to production
- **Never edit migration files manually** - they are auto-generated
- **Review generated SQL** before committing to catch unexpected changes
- **Use `db:push` only for rapid local development** - it bypasses migrations
- **Keep migrations in git** - they are the source of truth for schema evolution
- **Test migrations** on a copy of production data before deploying

### Migration Reset (Current Status)

The database was reset on 2025-11-04 with a fresh initial migration:
- `drizzle/0000_odd_masked_marvel.sql` - Initial schema with all 5 tables

All previous migration history was cleared to resolve inconsistencies.
