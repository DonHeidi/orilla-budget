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

### Git Worktree Workflow

This project uses **git worktrees** for parallel development. Worktrees allow multiple branches to be checked out simultaneously in separate directories, enabling isolated work on features, fixes, and experiments.

#### When Claude Code Should Suggest Worktrees

**IMPORTANT**: Claude Code should automatically detect when a worktree is appropriate and suggest creating one. Suggest worktrees for:

1. **New Features** - Any `feat(*)` work that adds functionality
2. **Database Changes** - Schema modifications, migrations, or data model changes
3. **Bug Fixes** - Any `fix(*)` work that needs isolation from ongoing development
4. **Experiments** - Exploratory work that might be discarded

**Detection Logic for Claude Code**:

```
IF user requests:
  - "I want to work on..."
  - "I'd like to work on..."
  - "Let's work on..."
  - "Can we work on..."
  - "I'm going to work on..."
  - "add a new feature..."
  - "implement X functionality..."
  - "create a new Y..."
  - "fix the Z bug..."
  - "change the database schema..."
  - "try implementing..."
  - "experiment with..."
THEN:
  1. Check for uncommitted changes (git status)
  2. If uncommitted changes exist:
     - Ask user: "You have uncommitted changes. Would you like to (a) commit them first, (b) stash them, or (c) create a worktree to preserve current state?"
  3. Suggest worktree with conventional branch name
  4. Provide complete setup commands
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

Claude: I'll create a worktree for this feature to keep it isolated from the main branch.

[Checks git status]
Claude: You have uncommitted changes. Would you like to commit them first, or should I create a worktree to preserve your current work state?

User: Create worktree

Claude: I'll set up a feature worktree:

[Provides commands:]
git worktree add ../feature-expense-tracking feature/expense-tracking
cd ../feature-expense-tracking
bun install
cp ../orilla-budget/data.db ./data.db
bun run db:migrate

[Proceeds with implementation in worktree]

Claude: Feature complete! When you're ready to merge:
1. Commit changes
2. Push branch
3. Create PR
4. After merge, run: git worktree remove ../feature-expense-tracking
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
- `dashboard.tsx`: Main layout with sidebar navigation
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
- `portal.tsx`: Client portal with access code authentication

#### Types and Schemas

- `src/types.ts`: TypeScript interfaces for domain models and view models
- `src/schemas.ts`: Zod validation schemas for all entities, including special `quickTimeEntrySchema` for rapid data entry

### Key Concepts

#### Server Functions

Routes use `createServerFn()` from TanStack Start to define server-side logic that can be called from client components. These functions handle database operations via repositories.

**IMPORTANT**: Server functions should use static imports at the top of the file, not dynamic imports inside the handler. TanStack Start's build process automatically handles code-splitting to ensure repository code only runs on the server.

```typescript
// ✅ Correct: Static import at top of file
import { userRepository } from '@/repositories/user.repository'

const getUsersFn = createServerFn({ method: 'GET' }).handler(async () => {
  const users = await userRepository.findAll()
  return { users } // No need for JSON.parse(JSON.stringify())
})

// ❌ Incorrect: Dynamic import inside handler
const getUsersFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { userRepository } = await import('@/repositories/user.repository')
  const users = await userRepository.findAll()
  return { users: JSON.parse(JSON.stringify(users)) } // Unnecessary
})
```

**Calling Server Functions**: Server functions should be called in one of these ways:

1. **In Route Loaders**: Use the loader option in `createFileRoute()` to fetch data during navigation
2. **From Client Components**: Use `useQuery` for data fetching or `useMutation` for mutations

```typescript
// ✅ Method 1: Route loader (preferred for data fetching)
export const Route = createFileRoute('/users')({
  component: UsersPage,
  loader: () => getUsersFn(),
})

// ✅ Method 2: Client-side queries with useQuery
function UsersPage() {
  const { data } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsersFn(),
  })

  // ✅ Method 3: Mutations with useMutation (recommended)
  const updateMutation = useMutation({
    mutationFn: (data: User) => updateUserFn({ data }),
    onSuccess: () => {
      router.invalidate() // Refresh cached data
    },
  })

  const handleUpdate = () => {
    updateMutation.mutate(updatedUser)
  }

  // ⚠️ Direct calls work but lack loading states and error handling
  const handleUpdateDirect = async () => {
    await updateUserFn({ data: updatedUser })
    router.invalidate() // Manual cache invalidation required
  }
}
```

**Note**: While server functions can be called directly (like `await updateUserFn(...)`), using `useMutation` is preferred as it provides loading states, error handling, and better integration with TanStack Query's caching system.

**Note on Serialization**: Since all date fields in our schemas use `z.string().datetime()` (ISO strings, not Date objects), data from repositories is already serializable. There's no need to use `JSON.parse(JSON.stringify())` for serialization.

#### Repository Pattern

All database access goes through repository modules that encapsulate Drizzle ORM queries. Repositories provide standard CRUD operations and domain-specific queries. Repositories are meant to be used on the server only and should be imported using static imports in server functions.

#### Dual Interface Architecture

- **Dashboard (`/expert`)**: Full CRUD interface with sidebar navigation organized by organisations, projects, and accounts
- **Portal (`/portal`)**: Read-only client view authenticated via access codes

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
| [User Management & RBAC](docs/roadmap/2025-11-27-user-management-rbac.md) | Planned | Authentication, authorization, unified identity model |
| [Permission System](docs/roadmap/2025-11-27-permission-system.md) | Planned | Granular permissions, role mappings |
| [Unified Dashboard](docs/roadmap/2025-11-27-unified-dashboard.md) | Planned | Merge expert/admin/portal into single dashboard |
| [Account & Contact Features](docs/roadmap/2025-11-27-account-contact-features.md) | Planned | Invitation flow, contact management |
| [Dashboard Improvements](docs/roadmap/2025-11-22-dashboard-improvements.md) | In Progress | Bug fixes, UI/UX improvements |
| [Focus Timer & Mindfulness](docs/roadmap/2025-11-25-focus-timer-mindfulness.md) | Planned | Focus timer feature |
