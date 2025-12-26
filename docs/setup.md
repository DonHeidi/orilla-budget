# Setup Guide

This document covers environment setup and common commands for the Orilla Budget project.

## Environment Management (mise)

This project uses **[mise](https://mise.jdx.dev/)** for runtime version management. Mise ensures the correct version of Bun is automatically used when working with this project.

### Installing mise

If you don't have mise installed:

```bash
# macOS/Linux
curl https://mise.run | sh

# Or via package managers:
# macOS: brew install mise
# Ubuntu/Debian: apt install mise
# Arch: yay -S mise
```

For other installation methods, see [mise documentation](https://mise.jdx.dev/getting-started.html).

### Activating mise for this project

After cloning the repository:

```bash
# 1. Install the required Bun version
mise install

# 2. Verify Bun is available
bun --version
```

**IMPORTANT**: The project's `mise.toml` file specifies `bun = "latest"`. Mise will automatically download and use the correct Bun version when you're in the project directory.

**Note**: For this project, `mise trust` is not required since the configuration only specifies tool versions. The trust command is only needed for configs with environment variables, templates, or path plugins.

### How mise works

- When you `cd` into the project directory, mise automatically activates the correct Bun version
- The configuration is defined in `mise.toml` at the project root
- Each worktree inherits the same mise configuration
- No need to manually switch versions or manage runtime installations

### Troubleshooting

**Issue**: `bun: command not found` after installing mise

- **Solution**: Ensure mise is activated in your shell. Add to your shell profile:

  ```bash
  # Bash: add to ~/.bashrc
  eval "$(mise activate bash)"

  # Zsh: add to ~/.zshrc
  eval "$(mise activate zsh)"

  # Fish: add to ~/.config/fish/config.fish
  mise activate fish | source
  ```

**Issue**: Wrong Bun version being used

- **Solution**: Run `mise install` to ensure the correct version is installed, then restart your shell

---

## Commands

### Development

```bash
bun install          # Install dependencies
bun run dev          # Start development server (runs on port 3000)
bun run build        # Build for production
```

### Testing

```bash
bun test             # Run all tests
bun test --watch     # Run tests in watch mode
bun test --coverage  # Run tests with coverage report
bun test <file>      # Run specific test file
```

**Testing Strategy:**

- We use **Bun's native test runner** for backend and core functionality
- **296 tests** covering schemas, repositories, hooks, and utilities
- **~97% code coverage** on tested modules
- Tests run in ~700-900ms for the full suite

**What we test:**

- Zod validation schemas (business rules)
- Repository layer (database operations)
- Utility functions
- Custom React hooks

**What we DON'T test with unit tests:**

- UI Components (we use Storybook for component documentation and visual testing)
- Routes (integration/E2E tests would be more appropriate)

**See [testing.md](testing.md) for the comprehensive testing guide.**

### Database Management

```bash
bun run db:generate  # Generate migration files from schema changes
bun run db:migrate   # Run migrations
bun run db:push      # Push schema changes directly to database (dev only - SKIPS MIGRATIONS!)
bun run db:studio    # Open Drizzle Studio for database visualization
```

**CRITICAL MIGRATION WORKFLOW:**
When making schema changes, ALWAYS follow this exact workflow:

1. Modify `src/db/schema.ts`
2. Run `bun run db:generate` to create migration
3. Review the generated SQL in `drizzle/` folder
4. Run `bun run db:migrate` to apply the migration
5. Commit migration files to git

**NEVER use `db:push` for changes going to production** - it bypasses migrations and won't work on production databases. Only use for throwaway local development.

**Migration files live in `drizzle/` and MUST be committed to git.** See [database.md](database.md) for more details.

### Seeding the Database

```bash
# Seed with test data (appends to existing data)
bun run scripts/seed-test-data.ts

# Clear database first, then seed fresh
bun run scripts/seed-test-data.ts --clear
```

The seed script creates:
- 3 users, 2 organisations, 7 accounts
- 6 projects (mix of budget/fixed)
- 13 time entries with various states
- 4 time sheets in different workflow stages
