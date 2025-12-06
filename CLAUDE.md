# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Orilla Budget is a time tracking and budget management application built with TanStack Start (React), Bun, Drizzle ORM, and SQLite. The app provides both an expert interface for managing organisations, projects, and time entries, as well as a client portal for viewing budget information.

**Note**: The expert interface uses the `/expert` route. All expert pages are under `/expert/*`.

## Setup

### Environment Management (mise)

This project uses **[mise](https://mise.jdx.dev/)** for runtime version management. Mise ensures the correct version of Bun is automatically used when working with this project.

#### Installing mise

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

#### Activating mise for this project

After cloning the repository:

```bash
# 1. Install the required Bun version
mise install

# 2. Verify Bun is available
bun --version
```

**IMPORTANT**: The project's `mise.toml` file specifies `bun = "latest"`. Mise will automatically download and use the correct Bun version when you're in the project directory.

**Note**: For this project, `mise trust` is not required since the configuration only specifies tool versions. The trust command is only needed for configs with environment variables, templates, or path plugins.

#### How mise works

- When you `cd` into the project directory, mise automatically activates the correct Bun version
- The configuration is defined in `mise.toml` at the project root
- Each worktree inherits the same mise configuration
- No need to manually switch versions or manage runtime installations

#### Troubleshooting

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

- ✅ Zod validation schemas (business rules)
- ✅ Repository layer (database operations)
- ✅ Utility functions
- ✅ Custom React hooks

**What we DON'T test with unit tests:**

- ❌ UI Components (we use Storybook for component documentation and visual testing)
- ❌ Routes (integration/E2E tests would be more appropriate)

**See [docs/testing.md](docs/testing.md) for comprehensive testing guide.**

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

**Migration files live in `drizzle/` and MUST be committed to git.** See `docs/database.md` for more details.

### Schema Changes

When modifying the database schema, multiple files need to be updated in sync. Follow this comprehensive workflow:

#### Step-by-Step Schema Change Workflow

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

#### Files to Update for Schema Changes

| Change Type | Files to Update |
|-------------|-----------------|
| New table | `schema.ts`, `schemas.ts`, new `*.repository.ts`, `seed-test-data.ts` |
| New column | `schema.ts`, `schemas.ts`, possibly `*.repository.ts` |
| Column rename | `schema.ts`, `schemas.ts`, `*.repository.ts`, `seed-test-data.ts` |
| New enum value | `schema.ts`, `schemas.ts` |
| Foreign key | `schema.ts`, possibly `*.repository.ts` for joins |

#### Example: Adding a New Column

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

#### Example: Adding a New Table

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

#### Seeding the Database

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

#### Common Pitfalls

1. **Forgetting to update Zod schemas** - TypeScript won't catch mismatches between Drizzle and Zod schemas at compile time
2. **Not reviewing generated SQL** - Always check the migration before applying; Drizzle might generate unexpected changes
3. **Using `db:push` instead of migrations** - Only use `db:push` for throwaway local experiments
4. **Forgetting to update seed script** - New required columns will cause seed script to fail
5. **Not running tests** - Schema changes can break repository queries silently

## Git Workflow

### Commit Convention

This project follows **Conventional Commits** with the **Angular preset**.

**Note**: Keep commit messages concise. Do not include Claude Code attribution footers or Co-Authored-By tags.

#### Format

```
<type>(<scope>): <subject>

<body>
```

#### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (formatting, whitespace, etc.)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools

#### Examples

```bash
# Bug fix
fix(theme): prevent flash of unstyled content on page load

# New feature
feat(dashboard): add bulk delete for time entries

# Performance improvement
perf(db): add index on project queries
```

### Atomic Commits

This project strives for **atomic commits** - each commit should represent a single, complete, logical change.

#### Principles

1. **One concern per commit**: Each commit should address exactly one thing (one bug fix, one feature, one refactor). If you find yourself using "and" in your commit message, consider splitting it.

2. **Complete and working**: Every commit should leave the codebase in a working state. Tests should pass, build should succeed.

3. **Self-contained**: A commit should include all related changes - code, tests, types, and documentation updates for that specific change.

4. **Reviewable**: Each commit should be small enough to review and understand in isolation.

#### What belongs in a single commit

| Scenario | Single Commit? |
|----------|----------------|
| Fix a bug + add test for it | ✅ Yes |
| Add feature + update types + add tests | ✅ Yes |
| Fix bug A + fix unrelated bug B | ❌ No - split into two commits |
| Refactor + add new feature using refactor | ❌ No - refactor first, then feature |
| Update dependencies + fix breaking changes | ✅ Yes (if tightly coupled) |
| Format code + fix bug | ❌ No - format separately |

#### Commit Workflow

```bash
# 1. Make changes for ONE logical unit of work
# 2. Review what you're committing
git diff --staged

# 3. Commit with clear message
git commit -m "fix(auth): handle expired session redirect"

# 4. Repeat for next logical change
```

#### Splitting Large Changes

If you've made multiple unrelated changes, use interactive staging:

```bash
# Stage specific files
git add src/lib/auth.ts src/routes/login.tsx

# Or stage specific hunks within a file
git add -p

# Commit the first logical change
git commit -m "fix(auth): handle expired session redirect"

# Stage and commit the next change
git add src/components/Button.tsx
git commit -m "style(button): update hover states"
```

#### Why Atomic Commits Matter

- **Easier code review**: Reviewers can understand each change in isolation
- **Simpler debugging**: `git bisect` can pinpoint exactly which change introduced a bug
- **Clean history**: `git log` tells a clear story of how the codebase evolved
- **Safe reverts**: Can revert a single change without losing unrelated work
- **Better collaboration**: Team members can cherry-pick specific changes

### Git Worktree Workflow

This project **requires git worktrees** for all development work. The main branch should always remain clean and stable. All features, fixes, and experiments MUST be developed in worktrees.

#### Mandatory Worktree Policy

**CRITICAL**: Claude Code MUST create a worktree before making any code changes. Never commit directly to main.

**When to create a worktree** - ALWAYS, for any work including:

1. **New Features** - Any `feat(*)` work that adds functionality
2. **Database Changes** - Schema modifications, migrations, or data model changes
3. **Bug Fixes** - Any `fix(*)` work
4. **Refactoring** - Any `refactor(*)` work
5. **Documentation changes** - Any `docs(*)` work that modifies code-related docs
6. **Experiments** - Exploratory work that might be discarded

**The only exceptions** (no worktree needed):
- Trivial typo fixes in markdown files
- Updating the roadmap document table in CLAUDE.md

**Detection Logic for Claude Code**:

```
IF user requests any code change or feature work:
  1. STOP - Do not make changes in main
  2. Check current branch (git branch --show-current)
  3. If on main:
     a. Check for uncommitted changes (git status)
     b. If uncommitted changes exist, ask user to commit or stash first
     c. Create worktree with conventional branch name
     d. Navigate to worktree and set up environment
  4. If already in a worktree, proceed with work
```

#### Creating a Worktree

**Standard Workflow**:

```bash
# 1. Create worktree with conventional branch name
git worktree add ../feature-user-dashboard feature/user-dashboard
# or: ../fix-time-entry-validation fix/time-entry-validation
# or: ../db-add-expenses db/add-expenses

# 2. Navigate to worktree
cd ../feature-user-dashboard

# 3. Install dependencies (if package.json differs from main)
bun install

# 4. CRITICAL: Isolate database
cp ../orilla-budget/data.db ./data.db

# 5. Apply any existing migrations
bun run db:migrate

# 6. Start development
bun run dev  # Note: Use different port if main repo is also running
```

**Branch Naming Convention**:

- `feature/*` - New features
- `fix/*` - Bug fixes
- `db/*` - Database schema changes
- `refactor/*` - Refactoring work
- `exp/*` - Experiments (throwaway)

#### Database Isolation (CRITICAL)

**ALWAYS isolate the database in worktrees**. Each worktree MUST have its own `data.db` file:

```bash
# After creating worktree, ALWAYS copy the database
cp ../orilla-budget/data.db ./data.db
```

**Why This Matters**:

- Schema changes in worktree don't affect main repo
- Migration testing is isolated and safe
- Data corruption in one worktree doesn't affect others
- Each branch can have different schema versions

**Database Migration Workflow in Worktrees**:

```bash
# In your worktree
1. Edit src/db/schema.ts
2. bun run db:generate        # Creates migration in drizzle/
3. Review drizzle/*.sql       # Check generated SQL
4. bun run db:migrate         # Applies to worktree's data.db
5. git add drizzle/           # Migrations ARE committed
6. git commit -m "feat(db): add expense tracking table"
```

Migrations are portable - they're committed to git and will apply cleanly when merged to main.

#### Dependency Management

**Smart Detection for node_modules**:

- **If package.json is unchanged**: Can symlink to save disk space (manual: `ln -s ../orilla-budget/node_modules ./node_modules`)
- **If package.json differs**: Run `bun install` in worktree for isolated dependencies
- **If unsure**: Always run `bun install` (safer, uses ~500MB disk per worktree)

**Claude Code Detection**:

- Before suggesting `bun install`, check if package.json differs from main
- If identical, mention: "Dependencies should be compatible, but run `bun install` if you encounter issues"
- If different, require: "Run `bun install` to install dependencies"

#### Development Server Port Conflicts

If running dev servers in multiple worktrees simultaneously:

```bash
# Main repo
bun run dev  # Uses port 3000

# In worktree, use different port
PORT=3001 bun run dev
```

#### Cleanup After Merge

**When feature is complete and merged**:

```bash
# 1. Switch back to main repo
cd /home/sebastian_heitmann/code/orilla-budget

# 2. Remove worktree (also deletes directory)
git worktree remove ../feature-user-dashboard

# 3. Delete local branch (if merged)
git branch -d feature/user-dashboard

# 4. Delete remote branch (if applicable)
git push origin --delete feature/user-dashboard
```

**Claude Code Reminder**: After suggesting a worktree, remind user to clean it up after merging.

#### Listing Active Worktrees

```bash
git worktree list
# Shows all worktrees with their paths and branches
```

#### Common Issues and Solutions

**Issue**: Port 3000 already in use

- **Solution**: Use `PORT=3001 bun run dev` in worktree

**Issue**: Database changes appear in main repo

- **Solution**: Verify you copied `data.db` to worktree (should be separate file)

**Issue**: node_modules conflicts after package.json change

- **Solution**: Run `bun install` in worktree to create isolated dependencies

**Issue**: Migration applied twice or conflicts

- **Solution**: Each worktree has isolated `data.db`, migrations only affect that database

**Issue**: Can't switch branches (uncommitted changes)

- **Solution**: This is why worktrees exist - create worktree instead of switching

#### Example Claude Code Workflow

```
User: "Add a new expense tracking feature"

Claude: I'll create a worktree for this feature. Let me check the current state first.

[Runs: git branch --show-current]
Output: main

[Runs: git status]
Output: nothing to commit, working tree clean

Claude: Creating the worktree now:

[Runs commands:]
git worktree add ../feature-expense-tracking feature/expense-tracking
cd ../feature-expense-tracking
bun install
cp ../orilla-budget/data.db ./data.db
bun run db:migrate

Claude: Worktree ready. Now implementing the feature...

[Proceeds with implementation in worktree]

Claude: Feature complete! The changes are committed in the feature/expense-tracking branch.

To merge:
1. Push branch: git push -u origin feature/expense-tracking
2. Create PR on GitHub
3. After merge, clean up: git worktree remove ../feature-expense-tracking
```

```
User: "Fix the login bug"

Claude: I need to create a worktree first.

[Runs: git branch --show-current]
Output: main

[Runs: git status]
Output: modified: src/components/Button.tsx

Claude: You have uncommitted changes on main. Please commit or stash them first:
- To commit: git add . && git commit -m "wip: describe changes"
- To stash: git stash

User: git stash

Claude: Changes stashed. Now creating the worktree:

[Creates worktree and proceeds...]
```

## Architecture

### Tech Stack

- **Runtime**: Bun
- **Framework**: TanStack Start (React-based full-stack framework)
- **Routing**: TanStack Router with file-based routing
- **Database**: SQLite with Drizzle ORM
- **Validation**: Zod schemas
- **Forms**: TanStack Form with Zod adapter
- **Styling**: Tailwind CSS 4.0 with Radix UI components
- **UI Components**: Custom components in `src/components/ui/` based on shadcn/ui

### Project Structure

#### Database Layer (`src/db/`)

- `schema.ts`: Drizzle schema definitions for organisations, accounts, projects, and time entries
- `index.ts`: Database connection using Bun SQLite driver
- Database file: `data.db` at project root

#### Repository Layer (`src/repositories/`)

Repository pattern for data access:

- `organisation.repository.ts`: Organisation CRUD operations
- `account.repository.ts`: Account management including access code lookup
- `project.repository.ts`: Project management
- `timeEntry.repository.ts`: Time entry tracking

#### Routes (`src/routes/`)

File-based routing with TanStack Start:

- `__root.tsx`: Root layout with theme provider and HTML structure
- `index.tsx`: Landing/home page
- `login.tsx`: Login page with authentication
- `dashboard.tsx`: Main dashboard layout with sidebar navigation and auth protection
  - `dashboard/index.tsx`: Dashboard welcome page
  - `dashboard/_orgs.tsx`: Layout for organisations and accounts with shared data loader
  - `dashboard/_orgs.organisations.tsx`: Organisations list with add functionality
  - `dashboard/_orgs.organisations.$id.tsx`: Organisation detail sheet with click-to-edit
  - `dashboard/_orgs.accounts.tsx`: Accounts list with add functionality
  - `dashboard/_orgs.accounts.$id.tsx`: Account detail sheet with click-to-edit
  - `dashboard/projects.tsx`: Projects list with add functionality
  - `dashboard/projects.$id.tsx`: Project detail sheet with click-to-edit
  - `dashboard/time-entries.tsx`: Time entries list with add functionality
  - `dashboard/time-entries.$id.tsx`: Time entry detail sheet with click-to-edit
  - `dashboard/time-sheets.tsx`: Time sheets management
  - `dashboard/users.tsx`: User management (requires admin permissions)
  - `dashboard/users.$id.tsx`: User detail sheet
- `portal.tsx`: Client portal with access code authentication

#### Types and Schemas

- `src/types.ts`: TypeScript interfaces for domain models and view models
- `src/schemas.ts`: Zod validation schemas for all entities, including special `quickTimeEntrySchema` for rapid data entry

### Key Concepts

#### Server Functions

Routes use `createServerFn()` from TanStack Start to define server-side logic that can be called from client components. These functions handle database operations via repositories.

**Understanding Static Imports in TanStack Start**:

Static imports of server-only code (like repositories) at the top of route files are **completely safe** and the recommended pattern. TanStack Start's build process ensures that:

1. Code imported and used **only inside `createServerFn()` handlers** is automatically excluded from client bundles
2. The import itself does not cause server code to leak to the client
3. No dynamic imports or special handling is needed

**The only time you'll get an error** is if you use a server-only import (like a repository) **outside** of a server function—for example, directly in a React component's render body or in a client-side event handler that doesn't go through a server function.

```typescript
// ✅ Correct: Static import used inside server function
import { userRepository } from '@/repositories/user.repository'

const getUsersFn = createServerFn({ method: 'GET' }).handler(async () => {
  const users = await userRepository.findAll()
  return { users }
})

function UsersPage() {
  // ✅ This is fine - calling the server function, not the repository directly
  const users = useServerFn(getUsersFn)

  // ❌ This would fail - using repository directly in component
  // const users = userRepository.findAll() // DON'T DO THIS
}
```

**Common Misconception**: Coding agents often suspect static imports as the cause of client/server errors. The import itself is never the problem—it's only problematic if the imported code is **used outside a server function** in client-side code.

**Parameters & Validation**: Server functions accept a single `data` parameter. Use `.inputValidator()` for type safety and runtime validation:

```typescript
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

// Basic parameters with inline validation
export const greetUserFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { name: string }) => data)
  .handler(async ({ data }) => {
    return `Hello, ${data.name}!`
  })

// Validation with Zod (recommended)
const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})

export const createUserFn = createServerFn({ method: 'POST' })
  .inputValidator(CreateUserSchema)
  .handler(async ({ data }) => {
    // data is fully typed and validated
    return userRepository.create(data)
  })

// Calling with parameters - ALWAYS use { data: ... } wrapper
await greetUserFn({ data: { name: 'John' } })
await createUserFn({ data: { name: 'Jane', email: 'jane@example.com' } })
```

**Where to Call Server Functions**:

1. **Route Loaders** - Perfect for data fetching
2. **Components** - Use with `useServerFn()` hook
3. **Other server functions** - Compose server logic
4. **Event handlers** - Handle form submissions, clicks, etc.

```typescript
// ✅ Method 1: Route loader (preferred for initial data)
export const Route = createFileRoute('/users')({
  component: UsersPage,
  loader: () => getUsersFn(),
})

// ✅ Method 2: useServerFn hook in components (RECOMMENDED)
import { useServerFn } from '@tanstack/react-start'

function UsersPage() {
  const getUsers = useServerFn(getUsersFn)
  const createUser = useServerFn(createUserFn)

  const { data } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
  })

  const createMutation = useMutation({
    mutationFn: (userData: CreateUser) => createUser({ data: userData }),
    onSuccess: () => {
      router.invalidate()
    },
  })

  const handleCreate = () => {
    createMutation.mutate({ name: 'New User', email: 'new@example.com' })
  }
}

// ⚠️ Direct calls work but useServerFn is preferred in components
const handleCreateDirect = async () => {
  await createUserFn({ data: { name: 'User', email: 'user@example.com' } })
  router.invalidate()
}
```

**Accessing Request Context**: To access cookies, headers, etc., use the helper functions from `@tanstack/react-start/server`:

```typescript
import { createServerFn } from '@tanstack/react-start'
import { getCookie, getRequest, getRequestHeader } from '@tanstack/react-start/server'

const getSessionFn = createServerFn({ method: 'GET' }).handler(async () => {
  // Use getCookie for simple cookie access
  const token = getCookie('session-token')

  // Or use getRequest() for full request access
  const request = getRequest()
  const authHeader = request.headers.get('authorization')

  // Validate session...
  return { user }
})
```

**Note on Serialization**: Since all date fields in our schemas use `z.string().datetime()` (ISO strings, not Date objects), data from repositories is already serializable. There's no need to use `JSON.parse(JSON.stringify())` for serialization.

#### Repository Pattern

**All external dependencies** (database, APIs, authentication libraries, third-party services) are accessed through repository modules. Server functions should never directly call external code—they delegate to repositories instead.

**Why This Pattern**:

1. **Testability**: Repositories can be mocked for unit tests
2. **Abstraction**: Implementation details are hidden behind a consistent interface
3. **Single Responsibility**: Server functions handle request/response; repositories handle external interactions
4. **Replaceability**: Swap implementations (e.g., change auth library) without touching server functions

**Repository Types**:

| Type | Purpose | Example |
|------|---------|---------|
| Data Repository | Database CRUD via Drizzle ORM | `user.repository.ts` |
| Auth Repository | Authentication library interactions | `auth.repository.ts` |
| API Repository | External API calls | `stripe.repository.ts` |
| Service Repository | Complex business logic with multiple dependencies | `billing.repository.ts` |

**Example: Database Repository**

```typescript
// src/repositories/user.repository.ts
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const userRepository = {
  findAll: () => db.select().from(users),
  findById: (id: string) => db.select().from(users).where(eq(users.id, id)).get(),
  create: (data: NewUser) => db.insert(users).values(data).returning().get(),
  update: (id: string, data: Partial<User>) =>
    db.update(users).set(data).where(eq(users.id, id)).returning().get(),
  delete: (id: string) => db.delete(users).where(eq(users.id, id)),
}
```

**Example: Auth Repository (wrapping Better Auth)**

```typescript
// src/repositories/auth.repository.ts
import { auth } from '@/lib/auth'

export const authRepository = {
  getSession: (headers: Headers) => auth.api.getSession({ headers }),
  signIn: (email: string, password: string) =>
    auth.api.signInEmail({ body: { email, password } }),
  signOut: (headers: Headers) => auth.api.signOut({ headers }),
  createUser: (data: { email: string; password: string; name: string }) =>
    auth.api.signUpEmail({ body: data }),
}
```

**Example: External API Repository**

```typescript
// src/repositories/notification.repository.ts
export const notificationRepository = {
  sendEmail: async (to: string, subject: string, body: string) => {
    const response = await fetch('https://api.email-service.com/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.EMAIL_API_KEY}` },
      body: JSON.stringify({ to, subject, body }),
    })
    return response.json()
  },
}
```

**Using Repositories in Server Functions**:

```typescript
// In a route file
import { userRepository } from '@/repositories/user.repository'
import { authRepository } from '@/repositories/auth.repository'

const getUsersFn = createServerFn({ method: 'GET' }).handler(async () => {
  // ✅ Delegate to repository
  return userRepository.findAll()
})

const loginFn = createServerFn({ method: 'POST' })
  .inputValidator(LoginSchema)
  .handler(async ({ data }) => {
    // ✅ Delegate to auth repository
    return authRepository.signIn(data.email, data.password)
  })
```

**Key Rules**:

- Repositories are **server-only** code
- Import repositories with static imports in server functions
- Keep repositories focused on a single external dependency
- Server functions should be thin—validate input, call repository, return response

#### Interface Architecture

- **Dashboard (`/dashboard`)**: Unified interface with sidebar navigation. Includes time tracking, projects, organisations, and admin features (admin sections only visible to users with appropriate permissions)
- **Portal (`/portal`)**: Read-only client view authenticated via access codes

#### Authentication & Authorization

The application uses **Project-Scoped RBAC** (Role-Based Access Control) with cookie-based sessions.

**See [docs/authentication.md](docs/authentication.md) for comprehensive documentation** including:
- System roles (`super_admin`, `admin`) and project roles (`owner`, `expert`, `reviewer`, `client`, `viewer`)
- Permission matrices and checking functions
- Route protection patterns
- Security analysis
- Developer guide for adding permissions/roles

#### Navigation & Permission-Based UI

**Key Principle**: Navigation and permission-based UI rendering should be handled inline within route layouts, not through a separate navigation domain or config system.

**Why This Approach**:

1. **Server-Side Resolution**: In TanStack Start, `beforeLoad` and `loader` run on the server. Authentication and permissions are resolved server-side and passed to components via route context.

2. **Colocated Logic**: Navigation structure lives in the same file as the route layout, making it easy to understand what a route does.

3. **No Unnecessary Abstraction**: A separate navigation config adds indirection without significant benefit for this codebase size.

4. **Type-Safe**: TanStack Router's type inference works naturally with route context.

**Implementation Pattern**:

```typescript
// In expert.tsx (or any layout route)
export const Route = createFileRoute('/expert')({
  component: ExpertDashboard,
  beforeLoad: async () => {
    // Auth resolved server-side
    const session = await getCurrentSessionFn()
    if (!session.user) {
      throw redirect({ to: '/login' })
    }
    return { auth: session }
  },
  loader: () => getAllDataFn(),
})

function ExpertDashboard() {
  const routeContext = Route.useRouteContext() as { auth: AuthSession }
  const auth = routeContext.auth

  // Derive permissions from auth context (already resolved server-side)
  const canViewUsers = auth.user && hasSystemPermission(auth.user, 'users:view')
  const hasProjects = auth.projectMemberships.length > 0

  return (
    <Sidebar>
      {/* Standard navigation items */}
      <SidebarMenuItem>
        <Link to="/expert/time-entries">Time Entries</Link>
      </SidebarMenuItem>

      {/* Permission-gated sections */}
      {canViewUsers && (
        <SidebarMenuItem>
          <Link to="/admin/users">Users</Link>
        </SidebarMenuItem>
      )}
    </Sidebar>
  )
}
```

**When NOT to use this approach**:

- Very large apps with many different layouts sharing complex navigation
- Plugin systems where navigation is contributed from different modules
- When navigation needs to be modified at runtime from multiple places

See `docs/navigation.md` for detailed explanation.

#### Theme System

- Theme preference stored in cookies (`orilla-ui-theme`)
- Server-side theme detection in `__root.tsx` to prevent flash of unstyled content
- Supports dark/light/system modes via `ThemeProvider`

#### Time Entry Flexibility

The app supports both:

- Quick time entries (only title and hours required) via `quickTimeEntrySchema`
- Detailed time entries with project associations and descriptions via `createTimeEntrySchema`

Time entries can be associated with either a project or directly with an organisation.

#### Project Categories

Projects have a `category` field that can be either:

- **budget**: Time & Materials projects tracked by hours
- **fixed**: Fixed Price projects with predetermined costs

### Coding Patterns & Best Practices

#### Data Refresh Pattern

**ALWAYS use `router.invalidate()` instead of `window.location.reload()`** to refresh data after mutations. This provides a smoother UX by updating cached data without full page reload.

```typescript
import { useRouter } from '@tanstack/react-router'

const router = useRouter()
// After a mutation:
router.invalidate() // ✅ Correct
window.location.reload() // ❌ Never use this
```

#### CRUD UI Pattern

All entity management follows this consistent pattern:

1. **List Page** (`entity.tsx`):
   - DataTable with entity list
   - "Add Entity" button (top-right) opens Sheet
   - Click row to navigate to detail page
   - Uses `<Outlet />` to render detail sheets

2. **Add Sheet**:
   - Opens via SheetTrigger button
   - TanStack Form with Zod validation
   - Cancel and Create buttons
   - Resets form on close

3. **Detail Page** (`entity.$id.tsx`):
   - Opens as Sheet overlay when row clicked
   - Click-to-edit fields (hover to see edit cursor)
   - Auto-saves on blur
   - Delete button with confirmation
   - Uses `router.invalidate()` after updates

#### Click-to-Edit Implementation

```typescript
const [editingField, setEditingField] = useState<string | null>(null)
const [editedValues, setEditedValues] = useState<Partial<Entity>>({})

const handleFieldClick = (fieldName: string) => setEditingField(fieldName)

const handleFieldBlur = async () => {
  if (Object.keys(editedValues).length > 0) {
    await updateEntityFn({ data: editedValues })
    router.invalidate()  // Refresh data
    setEditedValues({})
  }
  setEditingField(null)
}

// In JSX:
{editingField === 'name' ? (
  <Input autoFocus value={currentValues.name} onBlur={handleFieldBlur} />
) : (
  <p onClick={() => handleFieldClick('name')} className="cursor-pointer">
    {currentValues.name}
  </p>
)}
```

### Path Aliases

TypeScript is configured with `@/*` path alias mapping to `./src/*` (see `tsconfig.json`).

### Code Generation

- `src/routeTree.gen.ts`: Auto-generated by TanStack Router, do not edit manually
- make commits as atomic as possible
- Repositories are meant to be used on the server only.

## Roadmap Documentation

Product roadmap and feature specifications are documented in `docs/roadmap/`. These documents serve as the source of truth for planned features and architectural decisions.

### Roadmap File Structure

```
docs/
├── roadmap/
│   ├── YYYY-MM-DD-feature-name.md      # Feature specifications
│   └── ...
├── database.md                          # Database documentation
├── testing.md                           # Testing guide
└── gdpr-data-model.md                   # GDPR compliance docs
```

### Roadmap Document Format

Each roadmap document follows this structure:

```markdown
# Feature Title

**Date:** YYYY-MM-DD
**Status:** Planned | In Progress | Completed
**Category:** Security & Authentication | Architecture & UI | etc.
**Parent:** [Parent Doc](./parent-doc.md)  (if this is a sub-document)
**Context:** Brief context about the feature

## Related Documents
- [Related Doc](./related-doc.md) - Description

## Overview
Brief description of the feature and its goals.

---

## Current State Analysis
What exists today and what gaps need to be addressed.

---

## Proposed Solution
Detailed technical specification including:
- Data model changes (with code examples)
- Implementation approach
- UI/UX considerations

---

## Implementation Phases
Numbered phases with clear deliverables.

---

## Files Overview
Tables showing:
- New files to create
- Files to modify
- Files to delete

---

## Technical Considerations
Security, performance, and other technical notes.

---

## Dependencies
New packages or tools required.

---

## References
External documentation links.

---

## Next Steps
Immediate action items.
```

### Roadmap Conventions

**Naming**: `YYYY-MM-DD-feature-name.md`
- Date is when the document was created
- Use kebab-case for feature name
- Examples: `2025-11-27-user-management-rbac.md`, `2025-11-22-dashboard-improvements.md`

**Status Values**:
- `Planned` - Specification complete, not yet started
- `In Progress` - Currently being implemented
- `Completed` - Fully implemented and merged

**Document Relationships**:
- Use **Parent** field to link to the main overview document
- Use **Related Documents** section to cross-reference related specs
- Large features should have a main overview doc with sub-documents for details

**Code Examples**: Include TypeScript code samples for:
- Database schema definitions (Drizzle)
- Zod validation schemas
- Repository methods
- React components and hooks

**Checklists**: Use markdown checkboxes for implementation tracking:
```markdown
### Phase 1: Foundation
- [ ] Create database tables
- [ ] Add repository methods
- [x] Write Zod schemas (completed)
```

### Working with Roadmap Documents

**Before implementing a feature**:
1. Read the relevant roadmap document(s)
2. Check the **Status** field - is it approved for implementation?
3. Review **Implementation Phases** for the recommended order
4. Check **Files Overview** for affected files
5. Follow the phase order unless there's a good reason to deviate

**During implementation**:
1. Update checkboxes in the roadmap doc as tasks complete
2. Update **Status** to "In Progress" when starting
3. Add resolution notes for completed items (see dashboard-improvements.md for examples)
4. Update **Last Updated** date if making significant changes

**After implementation**:
1. Update **Status** to "Completed"
2. Ensure all checkboxes are checked
3. Add any lessons learned or deviations from the plan

### Current Roadmap Documents

| Document | Status | Description |
|----------|--------|-------------|
| [User Management & RBAC](docs/roadmap/2025-11-27-user-management-rbac.md) | Completed | Authentication, authorization, unified identity model |
| [Permission System](docs/roadmap/2025-11-27-permission-system.md) | Completed | Granular permissions, role mappings |
| [Unified Dashboard](docs/roadmap/2025-11-27-unified-dashboard.md) | Completed | Merge expert/admin/portal into single dashboard |
| [Account & Contact Features](docs/roadmap/2025-11-27-account-contact-features.md) | Completed | Invitation flow, contact management |
| [User Management Enhancements](docs/roadmap/2025-11-28-user-management-enhancements.md) | Planned | Email integration, 2FA, OAuth, audit logging, GDPR |
| [Dashboard Improvements](docs/roadmap/2025-11-22-dashboard-improvements.md) | In Progress | Bug fixes, UI/UX improvements |
| [Focus Timer & Mindfulness](docs/roadmap/2025-11-25-focus-timer-mindfulness.md) | Planned | Focus timer feature |
| [Better Auth Migration](docs/roadmap/2025-12-02-better-auth-migration.md) | Completed | Migrate custom auth to Better Auth framework |
| [Email Integration](docs/roadmap/2025-12-03-email-integration.md) | Planned | GDPR-safe email service, password reset, verification |
| [User Auth Flows](docs/roadmap/2025-12-03-user-auth-flows.md) | Planned | Signup, password reset, settings, session management |
| [Project Ownership Model](docs/roadmap/2025-12-06-project-ownership-model.md) | Planned | Creator tracking, ownership rules, minimum owner enforcement |
