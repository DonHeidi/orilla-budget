# Architecture

This document covers the technical architecture, patterns, and coding conventions for the Orilla Budget project.

## Tech Stack

- **Runtime**: Bun
- **Framework**: TanStack Start (React-based full-stack framework)
- **Routing**: TanStack Router with file-based routing
- **Database**: SQLite with Drizzle ORM
- **Validation**: Zod schemas
- **Forms**: TanStack Form with Zod adapter
- **Styling**: Tailwind CSS 4.0 with Radix UI components
- **UI Components**: Custom components in `src/components/ui/` based on shadcn/ui

---

## Project Structure

### Database Layer (`src/db/`)

- `schema.ts`: Drizzle schema definitions for organisations, accounts, projects, and time entries
- `index.ts`: Database connection using Bun SQLite driver
- Database file: `data.db` at project root

### Repository Layer (`src/repositories/`)

Repository pattern for data access:

- `organisation.repository.ts`: Organisation CRUD operations
- `account.repository.ts`: Account management including access code lookup
- `project.repository.ts`: Project management
- `timeEntry.repository.ts`: Time entry tracking

### Routes (`src/routes/`)

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

### Types and Schemas

- `src/types.ts`: TypeScript interfaces for domain models and view models
- `src/schemas.ts`: Zod validation schemas for all entities, including special `quickTimeEntrySchema` for rapid data entry

---

## Key Concepts

### Server Functions

Routes use `createServerFn()` from TanStack Start to define server-side logic that can be called from client components. These functions handle database operations via repositories.

#### Understanding Static Imports in TanStack Start

Static imports of server-only code (like repositories) at the top of route files are **completely safe** and the recommended pattern. TanStack Start's build process ensures that:

1. Code imported and used **only inside `createServerFn()` handlers** is automatically excluded from client bundles
2. The import itself does not cause server code to leak to the client
3. No dynamic imports or special handling is needed

**The only time you'll get an error** is if you use a server-only import (like a repository) **outside** of a server function—for example, directly in a React component's render body or in a client-side event handler that doesn't go through a server function.

```typescript
// Correct: Static import used inside server function
import { userRepository } from '@/repositories/user.repository'

const getUsersFn = createServerFn({ method: 'GET' }).handler(async () => {
  const users = await userRepository.findAll()
  return { users }
})

function UsersPage() {
  // This is fine - calling the server function, not the repository directly
  const users = useServerFn(getUsersFn)

  // This would fail - using repository directly in component
  // const users = userRepository.findAll() // DON'T DO THIS
}
```

**Common Misconception**: Coding agents often suspect static imports as the cause of client/server errors. The import itself is never the problem—it's only problematic if the imported code is **used outside a server function** in client-side code.

#### Parameters & Validation

Server functions accept a single `data` parameter. Use `.inputValidator()` for type safety and runtime validation:

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

#### Where to Call Server Functions

1. **Route Loaders** - Perfect for data fetching
2. **Components** - Use with `useServerFn()` hook
3. **Other server functions** - Compose server logic
4. **Event handlers** - Handle form submissions, clicks, etc.

```typescript
// Method 1: Route loader (preferred for initial data)
export const Route = createFileRoute('/users')({
  component: UsersPage,
  loader: () => getUsersFn(),
})

// Method 2: useServerFn hook in components (RECOMMENDED)
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

// Direct calls work but useServerFn is preferred in components
const handleCreateDirect = async () => {
  await createUserFn({ data: { name: 'User', email: 'user@example.com' } })
  router.invalidate()
}
```

#### Accessing Request Context

To access cookies, headers, etc., use the helper functions from `@tanstack/react-start/server`:

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

---

### Repository Pattern

**All external dependencies** (database, APIs, authentication libraries, third-party services) are accessed through repository modules. Server functions should never directly call external code—they delegate to repositories instead.

#### Why This Pattern

1. **Testability**: Repositories can be mocked for unit tests
2. **Abstraction**: Implementation details are hidden behind a consistent interface
3. **Single Responsibility**: Server functions handle request/response; repositories handle external interactions
4. **Replaceability**: Swap implementations (e.g., change auth library) without touching server functions

#### Repository Types

| Type | Purpose | Example |
|------|---------|---------|
| Data Repository | Database CRUD via Drizzle ORM | `user.repository.ts` |
| Auth Repository | Authentication library interactions | `auth.repository.ts` |
| API Repository | External API calls | `stripe.repository.ts` |
| Service Repository | Complex business logic with multiple dependencies | `billing.repository.ts` |

#### Example: Database Repository

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

#### Example: Auth Repository (wrapping Better Auth)

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

#### Example: External API Repository

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

#### Using Repositories in Server Functions

```typescript
// In a route file
import { userRepository } from '@/repositories/user.repository'
import { authRepository } from '@/repositories/auth.repository'

const getUsersFn = createServerFn({ method: 'GET' }).handler(async () => {
  // Delegate to repository
  return userRepository.findAll()
})

const loginFn = createServerFn({ method: 'POST' })
  .inputValidator(LoginSchema)
  .handler(async ({ data }) => {
    // Delegate to auth repository
    return authRepository.signIn(data.email, data.password)
  })
```

#### Key Rules

- Repositories are **server-only** code
- Import repositories with static imports in server functions
- Keep repositories focused on a single external dependency
- Server functions should be thin—validate input, call repository, return response

---

### Interface Architecture

- **Dashboard (`/dashboard`)**: Unified interface with sidebar navigation. Includes time tracking, projects, organisations, and admin features (admin sections only visible to users with appropriate permissions)
- **Portal (`/portal`)**: Read-only client view authenticated via access codes

### Authentication & Authorization

The application uses **Project-Scoped RBAC** (Role-Based Access Control) with cookie-based sessions.

**See [authentication.md](authentication.md) for comprehensive documentation** including:
- System roles (`super_admin`, `admin`) and project roles (`owner`, `expert`, `reviewer`, `client`, `viewer`)
- Permission matrices and checking functions
- Route protection patterns
- Security analysis
- Developer guide for adding permissions/roles

### Navigation & Permission-Based UI

**Key Principle**: Navigation and permission-based UI rendering should be handled inline within route layouts, not through a separate navigation domain or config system.

#### Why This Approach

1. **Server-Side Resolution**: In TanStack Start, `beforeLoad` and `loader` run on the server. Authentication and permissions are resolved server-side and passed to components via route context.

2. **Colocated Logic**: Navigation structure lives in the same file as the route layout, making it easy to understand what a route does.

3. **No Unnecessary Abstraction**: A separate navigation config adds indirection without significant benefit for this codebase size.

4. **Type-Safe**: TanStack Router's type inference works naturally with route context.

#### Implementation Pattern

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

See [navigation.md](navigation.md) for detailed explanation.

### Theme System

- Theme preference stored in cookies (`orilla-ui-theme`)
- Server-side theme detection in `__root.tsx` to prevent flash of unstyled content
- Supports dark/light/system modes via `ThemeProvider`

### Time Entry Flexibility

The app supports both:

- Quick time entries (only title and hours required) via `quickTimeEntrySchema`
- Detailed time entries with project associations and descriptions via `createTimeEntrySchema`

Time entries can be associated with either a project or directly with an organisation.

### Project Categories

Projects have a `category` field that can be either:

- **budget**: Time & Materials projects tracked by hours
- **fixed**: Fixed Price projects with predetermined costs

---

## Coding Patterns & Best Practices

### Data Refresh Pattern

**ALWAYS use `router.invalidate()` instead of `window.location.reload()`** to refresh data after mutations. This provides a smoother UX by updating cached data without full page reload.

```typescript
import { useRouter } from '@tanstack/react-router'

const router = useRouter()
// After a mutation:
router.invalidate() // Correct
window.location.reload() // Never use this
```

### CRUD UI Pattern

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

### Click-to-Edit Implementation

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

---

## Path Aliases

TypeScript is configured with `@/*` path alias mapping to `./src/*` (see `tsconfig.json`).

## Code Generation

- `src/routeTree.gen.ts`: Auto-generated by TanStack Router, do not edit manually
- Repositories are meant to be used on the server only
