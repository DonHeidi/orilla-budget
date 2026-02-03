# Repository Layer

This directory contains repository modules that abstract all external dependencies (database, APIs, authentication).

## Pattern

**All external dependencies** are accessed through repository modules. Server functions should never directly call external code—they delegate to repositories instead.

### Why This Pattern

1. **Testability**: Repositories can be mocked for unit tests
2. **Abstraction**: Implementation details hidden behind consistent interface
3. **Single Responsibility**: Server functions handle request/response; repositories handle external interactions
4. **Replaceability**: Swap implementations without touching server functions

## Repository Types

| Type | Purpose | Example |
|------|---------|---------|
| Data Repository | Database CRUD via Drizzle ORM | `user.repository.ts` |
| Auth Repository | Authentication library interactions | `auth.repository.ts` |
| API Repository | External API calls | `stripe.repository.ts` |
| Service Repository | Complex business logic | `billing.repository.ts` |

## Creating a New Repository

```typescript
// src/repositories/expense.repository.ts
import { db } from '@/db'
import { expenses } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const expenseRepository = {
  findAll: () => db.select().from(expenses),

  findById: (id: string) =>
    db.select().from(expenses).where(eq(expenses.id, id)).get(),

  create: (data: NewExpense) =>
    db.insert(expenses).values(data).returning().get(),

  update: (id: string, data: Partial<Expense>) =>
    db.update(expenses).set(data).where(eq(expenses.id, id)).returning().get(),

  delete: (id: string) =>
    db.delete(expenses).where(eq(expenses.id, id)),
}
```

## Using Repositories in Server Functions

```typescript
// In a route file
import { userRepository } from '@/repositories/user.repository'

const getUsersFn = createServerFn({ method: 'GET' }).handler(async () => {
  return userRepository.findAll()
})
```

## Key Rules

- Repositories are **server-only** code
- Import repositories with static imports in server functions
- Keep repositories focused on a single external dependency
- Server functions should be thin—validate input, call repository, return response

## Current Repositories

- `account.repository.ts` - Organization member accounts
- `auth.repository.ts` - Better Auth wrapper
- `contact.repository.ts` - External contacts management
- `entryMessage.repository.ts` - Time entry comments/messages
- `invitation.repository.ts` - User invitation handling
- `organisation.repository.ts` - Organisation operations
- `pii.repository.ts` - Personally identifiable information
- `project.repository.ts` - Project operations
- `projectApprovalSettings.repository.ts` - Approval workflow config
- `projectMember.repository.ts` - Project membership
- `timeEntry.repository.ts` - Time entry tracking
- `timeSheet.repository.ts` - Time sheet workflows
- `timeSheetApproval.repository.ts` - Time sheet approval workflow
- `user.repository.ts` - User CRUD

## Testing

Repository tests use in-memory SQLite databases. See [src/test/CLAUDE.md](/src/test/CLAUDE.md) for test utilities.

```typescript
import { createTestDb, cleanDatabase, seed } from '@/test/db-utils'

describe('userRepository', () => {
  const { db } = createTestDb()

  beforeEach(async () => {
    await cleanDatabase(db)
  })

  it('should find user by email', async () => {
    const user = await seed.user(db, { email: 'test@example.com' })
    // Test against db directly, not repository (different db instance)
  })
})
```
