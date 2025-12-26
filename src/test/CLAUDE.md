# Test Utilities

This directory contains test infrastructure and utilities for the Orilla Budget test suite.

## Files

- `db-utils.ts` - Database test utilities
- `utils.tsx` - Component test utilities
- `setup.ts` - Global test setup
- `dom-setup.ts` - DOM environment (happy-dom)

## Database Utilities

### Creating Test Database

```typescript
import { createTestDb, cleanDatabase, seed, testFactories } from '@/test/db-utils'

describe('myTest', () => {
  const { db } = createTestDb()

  beforeEach(async () => {
    await cleanDatabase(db)
  })

  it('should work', async () => {
    // Use seed functions to insert data
    const org = await seed.organisation(db, { name: 'Acme Corp' })
    const project = await seed.project(db, org.id, { budgetHours: 100 })

    // Query directly against test db
    const result = await db.select().from(schema.projects)
    expect(result[0].budgetHours).toBe(100)
  })
})
```

### Test Factories

Create test data with defaults:

```typescript
const user = testFactories.user({ email: 'test@example.com' })
const org = testFactories.organisation({ name: 'Test Org' })
const project = testFactories.project('org-id', { category: 'budget' })
const entry = testFactories.timeEntry({ hours: 8 })
```

### Seed Functions

Insert and return test data:

```typescript
const user = await seed.user(db, { handle: 'johndoe' })
const org = await seed.organisation(db)
const account = await seed.account(db, org.id, { role: 'finance' })
const project = await seed.project(db, org.id)
const entry = await seed.timeEntry(db, { projectId: project.id })
const sheet = await seed.timeSheet(db, { organisationId: org.id })
```

## Component Utilities

Custom render with providers:

```typescript
import { render } from '@/test/utils'

const { getByText, user } = render(<MyComponent />)

// Interact with userEvent
await user.click(getByText('Submit'))
```

## Important Notes

### Repository Testing

Repositories import the production database. For tests, we query the test database directly:

```typescript
// Don't call repository methods in tests
// const users = await userRepository.findAll() // Uses prod db

// Do query test db directly
const users = await db.select().from(schema.users)
```

### SQLite Null vs Undefined

SQLite returns `null`, not `undefined`:

```typescript
// Wrong
expect(result.projectId).toBeUndefined()

// Correct
expect(result.projectId).toBeNull()
```

## Running Tests

```bash
bun test                    # Run all tests
bun test --watch           # Watch mode
bun test --coverage        # With coverage
bun test src/schemas.test.ts  # Specific file
```

See [docs/testing.md](/docs/testing.md) for comprehensive testing guide.
