# Library Utilities

This directory contains utility functions and helpers.

## Files

- `utils.ts` - General utility functions
- `auth.ts` - Better Auth client configuration
- `auth-client.ts` - Auth client for React components
- `permissions.ts` - Permission checking utilities

## Path Aliases

TypeScript is configured with `@/*` mapping to `./src/*`:

```typescript
import { cn } from '@/lib/utils'
import { hasPermission } from '@/lib/permissions'
```

## Common Utilities

### `cn()` - Class Name Merging

Combines Tailwind classes with conflict resolution:

```typescript
import { cn } from '@/lib/utils'

<div className={cn(
  'text-red-500',
  'text-blue-500',  // This wins (last one)
  isActive && 'font-bold'
)} />
```

### Permission Checking

```typescript
import { hasSystemPermission, hasProjectPermission } from '@/lib/permissions'

// System-level permissions
if (hasSystemPermission(user, 'users:manage')) {
  // Can manage users
}

// Project-level permissions
if (hasProjectPermission(projectMembership, 'time:approve')) {
  // Can approve time entries
}
```

## Auth Client

For client-side auth operations:

```typescript
import { authClient } from '@/lib/auth-client'

// Sign out
await authClient.signOut()

// Get session
const session = authClient.useSession()
```

See [docs/authentication.md](/docs/authentication.md) for auth patterns.
