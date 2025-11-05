# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Orilla Budget is a time tracking and budget management application built with TanStack Start (React), Bun, Drizzle ORM, and SQLite. The app provides both an agent interface for managing organisations, projects, and time entries, as well as a client portal for viewing budget information.

**Note**: The agent interface uses the `/dashboard` route. All agent pages are under `/dashboard/*`.

## Commands

### Development
```bash
bun install          # Install dependencies
bun run dev          # Start development server (runs on port 3000)
bun run build        # Build for production
```

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
  return { users }  // No need for JSON.parse(JSON.stringify())
})

// ❌ Incorrect: Dynamic import inside handler
const getUsersFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { userRepository } = await import('@/repositories/user.repository')
  const users = await userRepository.findAll()
  return { users: JSON.parse(JSON.stringify(users)) }  // Unnecessary
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
- **Dashboard (`/dashboard`)**: Full CRUD interface with sidebar navigation organized by organisations, projects, and accounts
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
router.invalidate()  // ✅ Correct
window.location.reload()  // ❌ Never use this
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