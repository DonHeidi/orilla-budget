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
bun run db:push      # Push schema changes directly to database (dev only)
bun run db:studio    # Open Drizzle Studio for database visualization
```

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

#### Server Layer (`src/server/repositories/`)
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

#### Repository Pattern
All database access goes through repository modules that encapsulate Drizzle ORM queries. Repositories provide standard CRUD operations and domain-specific queries.

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