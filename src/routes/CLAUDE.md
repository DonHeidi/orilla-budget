# Routes

This directory contains all routes using TanStack Start's file-based routing.

## Route Structure

```
routes/
├── __root.tsx              # Root layout (theme, HTML structure)
├── index.tsx               # Landing page
├── login.tsx               # Login page
├── dashboard.tsx           # Dashboard layout (auth protected)
├── dashboard/
│   ├── index.tsx           # Dashboard home
│   ├── projects.tsx        # Projects list
│   ├── projects.$id.tsx    # Project detail (sheet)
│   ├── time-entries.tsx    # Time entries list
│   └── ...
├── portal.tsx              # Client portal (access code auth)
└── api/
    └── auth/
        └── [...all].ts     # Better Auth API handler
```

## Server Functions

Use `createServerFn()` to define server-side logic callable from client components.

### Basic Pattern

```typescript
import { createServerFn } from '@tanstack/react-start'
import { userRepository } from '@/repositories/user.repository'

export const getUsersFn = createServerFn({ method: 'GET' }).handler(async () => {
  return userRepository.findAll()
})
```

### With Validation (Recommended)

```typescript
import { z } from 'zod'

const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})

export const createUserFn = createServerFn({ method: 'POST' })
  .inputValidator(CreateUserSchema)
  .handler(async ({ data }) => {
    return userRepository.create(data)
  })

// Call with { data: ... } wrapper
await createUserFn({ data: { name: 'Jane', email: 'jane@example.com' } })
```

### Accessing Request Context

```typescript
import { getCookie, getRequest } from '@tanstack/react-start/server'

const getSessionFn = createServerFn({ method: 'GET' }).handler(async () => {
  const token = getCookie('session-token')
  const request = getRequest()
  // ...
})
```

## Static Imports

Static imports of server-only code (like repositories) are **completely safe**. TanStack Start's build process excludes them from client bundles when used only inside `createServerFn()` handlers.

```typescript
// This is safe - repository only used in server function
import { userRepository } from '@/repositories/user.repository'

const getUsersFn = createServerFn({ method: 'GET' }).handler(async () => {
  return userRepository.findAll() // Server-only code
})

function UsersPage() {
  // This is fine - calling server function
  const getUsers = useServerFn(getUsersFn)

  // This would fail - using repository directly in component
  // const users = userRepository.findAll() // DON'T DO THIS
}
```

## Where to Call Server Functions

1. **Route Loaders** (preferred for initial data)
   ```typescript
   export const Route = createFileRoute('/users')({
     loader: () => getUsersFn(),
   })
   ```

2. **Components** with `useServerFn()` hook
   ```typescript
   const getUsers = useServerFn(getUsersFn)
   const { data } = useQuery({
     queryKey: ['users'],
     queryFn: () => getUsers(),
   })
   ```

3. **Mutations** with `router.invalidate()`
   ```typescript
   const createUser = useServerFn(createUserFn)
   const router = useRouter()

   const handleCreate = async () => {
     await createUser({ data: formData })
     router.invalidate() // Refresh cached data
   }
   ```

## Route Protection

Use `beforeLoad` for auth checks:

```typescript
export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const session = await getCurrentSessionFn()
    if (!session.user) {
      throw redirect({ to: '/login' })
    }
    return { auth: session }
  },
})
```

## Key Rules

- **Never use `window.location.reload()`** - use `router.invalidate()`
- Server functions delegate to repositories (thin handlers)
- All dates are ISO strings (no Date objects)

See [docs/architecture.md](/docs/architecture.md) for full patterns.
