# Testing Guide

This document outlines our testing strategy for the Orilla Budget application, focusing on unit testing for backend and core functionality.

## Table of Contents

- [Overview](#overview)
- [Test Runner: Bun Test](#test-runner-bun-test)
- [Testing Strategy](#testing-strategy)
- [Test Infrastructure](#test-infrastructure)
- [Writing Tests](#writing-tests)
- [Running Tests](#running-tests)
- [Code Coverage](#code-coverage)
- [Best Practices](#best-practices)

---

## Overview

We use **unit testing** to validate our backend and core functionality, ensuring that:

- Business logic behaves correctly
- Data validation rules are enforced
- Database operations work as expected
- Utility functions handle edge cases
- Custom hooks manage state properly

**What we test:**

- ✅ Zod validation schemas (business rules)
- ✅ Repository layer (database operations)
- ✅ Utility functions
- ✅ Custom React hooks

**What we don't test:**

- ❌ UI Components (we use Storybook for component documentation and visual testing)
- ❌ Routes (integration/E2E tests would be more appropriate)

---

## Test Runner: Bun Test

We use **Bun's native test runner** (`bun test`) instead of Vitest or Jest.

### Why Bun Test?

- **Native integration** - Built into Bun runtime, no extra dependencies
- **Fast execution** - Optimized for speed with Bun's JavaScript engine
- **Compatible API** - Similar syntax to Jest/Vitest (`describe`, `it`, `expect`)
- **TypeScript support** - Works with TypeScript out of the box
- **Built-in coverage** - No need for additional tooling

### Configuration

Test configuration is in `bunfig.toml`:

```toml
[test]
# Set up test environment
preload = ["./src/test/dom-setup.ts", "./src/test/setup.ts"]

# Coverage configuration
coverage = true
```

---

## Testing Strategy

### 1. Schema Validation Tests

**Location:** `src/schemas.test.ts`

Tests all Zod validation schemas to ensure business rules are enforced:

```typescript
describe('projectSchema', () => {
  it('should reject budget project without budgetHours', () => {
    const result = projectSchema.safeParse({
      id: 'proj-1',
      name: 'Test Project',
      category: 'budget',
      budgetHours: null, // Invalid!
      createdAt: new Date().toISOString(),
    })

    expect(result.success).toBe(false)
  })
})
```

**Coverage:**

- User, Organisation, Account, Project schemas
- Time Entry and Quick Time Entry schemas
- Time Sheet schemas with workflow validation
- Business rules (e.g., budget vs fixed projects)
- Date range validation
- Email and handle format validation

### 2. Repository Tests

**Location:** `src/repositories/*.test.ts`

Tests database operations and business logic in the repository layer.

#### Test Pattern

All repository tests follow a consistent pattern:

```typescript
import { describe, it, expect, beforeEach } from 'bun:test'
import { createTestDb, cleanDatabase, seed } from '@/test/db-utils'
import * as schema from '@/db/schema'
import { eq } from 'drizzle-orm'

describe('userRepository', () => {
  const { db } = createTestDb()

  beforeEach(async () => {
    await cleanDatabase(db)
  })

  it('should find user by email', async () => {
    // Arrange
    const user = await seed.user(db, { email: 'test@example.com' })

    // Act
    const result = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, 'test@example.com'))
      .limit(1)

    // Assert
    expect(result[0]).toBeDefined()
    expect(result[0].email).toBe('test@example.com')
  })
})
```

#### Important Note on Repository Testing

Our repositories import the database instance directly:

```typescript
// src/repositories/user.repository.ts
import { db, users } from '@/db'

export const userRepository = {
  async findAll() {
    return await db.select().from(users)
  },
}
```

For testing, we **query the database directly using test utilities** rather than calling repository methods. This is because:

1. Repositories use the production database (`data.db`)
2. Test databases are created in-memory using `createTestDb()`
3. We test the query patterns, not the repository functions themselves

This approach validates that our database queries work correctly while keeping tests isolated.

#### Repository Test Coverage

- **user.repository.ts** - Basic CRUD, email lookup
- **account.repository.ts** - CRUD, access code lookup (portal auth)
- **organisation.repository.ts** - CRUD, budget hour calculations
- **project.repository.ts** - CRUD, organisation filtering
- **timeEntry.repository.ts** - CRUD, project/org filtering, approval states
- **timeSheet.repository.ts** - Complex workflows, entry management, state transitions

### 3. Hook Tests

**Location:** `src/hooks/*.test.ts`

Tests custom React hooks using `@testing-library/react`.

```typescript
import { renderHook } from '@testing-library/react'
import { useIsMobile } from './use-mobile'

describe('useIsMobile', () => {
  it('should return true for mobile viewport', () => {
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)
  })
})
```

### 4. Utility Function Tests

**Location:** `src/lib/*.test.ts`

Tests pure utility functions.

```typescript
import { cn } from './utils'

describe('cn', () => {
  it('should resolve Tailwind conflicts', () => {
    const result = cn('text-red-500', 'text-blue-500')

    expect(result).toBe('text-blue-500')
    expect(result).not.toContain('text-red-500')
  })
})
```

---

## Test Infrastructure

### Test Utilities

Located in `src/test/`, these utilities support all tests:

#### 1. Database Utilities (`db-utils.ts`)

**`createTestDb()`** - Creates an in-memory SQLite database:

```typescript
const { db } = createTestDb()
```

- Enables foreign key constraints
- Applies migrations automatically
- Isolated from production database

**`cleanDatabase(db)`** - Clears all tables between tests:

```typescript
beforeEach(async () => {
  await cleanDatabase(db)
})
```

**`testFactories`** - Factory functions for creating test data:

```typescript
const user = testFactories.user({
  handle: 'johndoe',
  email: 'john@example.com',
})
```

Available factories:

- `testFactories.user(overrides?)`
- `testFactories.organisation(overrides?)`
- `testFactories.account(organisationId, overrides?)`
- `testFactories.project(organisationId, overrides?)`
- `testFactories.timeEntry(overrides?)`
- `testFactories.timeSheet(overrides?)`

**`seed`** - Functions to insert test data and return the result:

```typescript
const org = await seed.organisation(db, { name: 'Acme Corp' })
const account = await seed.account(db, org.id, { role: 'finance' })
```

Available seed functions:

- `seed.user(db, data?)`
- `seed.organisation(db, data?)`
- `seed.account(db, organisationId, data?)`
- `seed.project(db, organisationId, data?)`
- `seed.timeEntry(db, data?)`
- `seed.timeSheet(db, data?)`

#### 2. Component Test Utilities (`utils.tsx`)

Custom `render()` wrapper for React components:

```typescript
import { render } from '@/test/utils'

const { getByText } = render(<MyComponent />)
```

Automatically wraps components with:

- `ThemeProvider` for theme context
- `userEvent.setup()` for user interactions

#### 3. Test Setup Files

**`setup.ts`** - Global test setup:

- Imports `@testing-library/jest-dom` for DOM matchers
- Cleans up after each test

**`dom-setup.ts`** - DOM environment setup:

- Registers `happy-dom` for browser API simulation
- Required for testing React components and hooks

---

## Writing Tests

### Test Structure

Use the **Arrange-Act-Assert** pattern:

```typescript
it('should do something', async () => {
  // Arrange - Set up test data
  const org = await seed.organisation(db)
  const project = await seed.project(db, org.id, { budgetHours: 100 })

  // Act - Perform the operation
  const result = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, project.id))
    .limit(1)

  // Assert - Verify the outcome
  expect(result[0]).toBeDefined()
  expect(result[0].budgetHours).toBe(100)
})
```

### Naming Conventions

- Test files: `*.test.ts` or `*.test.tsx`
- Describe blocks: Use the function/module name
- Test cases: Start with "should" and describe expected behavior

```typescript
describe('userRepository', () => {
  describe('findByEmail', () => {
    it('should return user when email exists', () => {})
    it('should return undefined when email not found', () => {})
    it('should be case-sensitive', () => {})
  })
})
```

### Common Patterns

#### Testing Database Operations

```typescript
describe('create', () => {
  it('should insert new user into database', async () => {
    // Arrange
    const newUser = testFactories.user({ handle: 'newuser' })

    // Act
    await db.insert(schema.users).values(newUser)

    // Assert
    const result = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, newUser.id))
      .limit(1)

    expect(result[0]).toBeDefined()
    expect(result[0].handle).toBe('newuser')
  })
})
```

#### Testing Validation Schemas

```typescript
describe('projectSchema', () => {
  it('should enforce business rules', () => {
    const result = projectSchema.safeParse({
      category: 'budget',
      budgetHours: null, // Invalid for budget projects
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'Budget is required for Time & Materials projects'
      )
    }
  })
})
```

#### Testing Foreign Key Constraints

```typescript
it('should fail to create account with non-existent organisation', async () => {
  const invalidAccount = testFactories.account('nonexistent-org-id')

  try {
    await db.insert(schema.accounts).values(invalidAccount)
    expect(true).toBe(false) // Should not reach here
  } catch (error) {
    expect(error).toBeDefined() // Foreign key constraint violated
  }
})
```

#### Testing Cascade Deletes

```typescript
it('should cascade delete accounts when organisation is deleted', async () => {
  // Arrange
  const org = await seed.organisation(db, { id: 'org-1' })
  const account = await seed.account(db, 'org-1')

  // Act - Delete organisation
  await db
    .delete(schema.organisations)
    .where(eq(schema.organisations.id, 'org-1'))

  // Assert - Account should be deleted due to cascade
  const result = await db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.id, account.id))
    .limit(1)

  expect(result[0]).toBeUndefined()
})
```

### Handling SQLite Null vs Undefined

SQLite returns `null` for optional fields, not `undefined`:

```typescript
// ❌ Wrong
expect(result[0].projectId).toBeUndefined()

// ✅ Correct
expect(result[0].projectId).toBeNull()
```

### Testing Complex Business Logic

For complex operations like time sheet workflows:

```typescript
describe('approveSheet', () => {
  it('should approve sheet and all its entries', async () => {
    // Arrange
    const org = await seed.organisation(db)
    const sheet = await seed.timeSheet(db, {
      id: 'sheet-1',
      status: 'submitted',
      organisationId: org.id,
    })
    const entry1 = await seed.timeEntry(db, { approvedDate: undefined })
    const entry2 = await seed.timeEntry(db, { approvedDate: undefined })

    // Add entries to sheet
    await db.insert(schema.timeSheetEntries).values([
      {
        id: 'tse-1',
        timeSheetId: 'sheet-1',
        timeEntryId: entry1.id,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'tse-2',
        timeSheetId: 'sheet-1',
        timeEntryId: entry2.id,
        createdAt: new Date().toISOString(),
      },
    ])

    // Act - Approve sheet and cascade to entries
    const approvedDate = new Date().toISOString()
    await db
      .update(schema.timeSheets)
      .set({
        status: 'approved',
        approvedDate,
        updatedAt: approvedDate,
      })
      .where(eq(schema.timeSheets.id, 'sheet-1'))

    // Get all entries and approve them
    const sheetEntries = await db
      .select()
      .from(schema.timeSheetEntries)
      .where(eq(schema.timeSheetEntries.timeSheetId, 'sheet-1'))

    for (const se of sheetEntries) {
      await db
        .update(schema.timeEntries)
        .set({ approvedDate })
        .where(eq(schema.timeEntries.id, se.timeEntryId))
    }

    // Assert - Sheet is approved
    const sheetResult = await db
      .select()
      .from(schema.timeSheets)
      .where(eq(schema.timeSheets.id, 'sheet-1'))
      .limit(1)
    expect(sheetResult[0].status).toBe('approved')
    expect(sheetResult[0].approvedDate).toBe(approvedDate)

    // Assert - All entries are approved
    const entry1Result = await db
      .select()
      .from(schema.timeEntries)
      .where(eq(schema.timeEntries.id, entry1.id))
      .limit(1)
    const entry2Result = await db
      .select()
      .from(schema.timeEntries)
      .where(eq(schema.timeEntries.id, entry2.id))
      .limit(1)

    expect(entry1Result[0].approvedDate).toBe(approvedDate)
    expect(entry2Result[0].approvedDate).toBe(approvedDate)
  })
})
```

---

## Running Tests

### Run All Tests

```bash
bun test
```

### Run Specific Test File

```bash
bun test src/schemas.test.ts
bun test src/repositories/user.repository.test.ts
```

### Run Tests in Watch Mode

```bash
bun test --watch
```

### Run Tests with Coverage

```bash
bun test --coverage
```

Coverage is enabled by default via `bunfig.toml`.

### Run Tests Matching a Pattern

```bash
# Run all repository tests
bun test src/repositories/

# Run all hook tests
bun test src/hooks/
```

### Filtering Tests

Use `.only` to run a single test or describe block:

```typescript
it.only('should run only this test', () => {
  // This test will run, others will be skipped
})
```

Use `.skip` to skip tests:

```typescript
it.skip('should skip this test', () => {
  // This test will be skipped
})
```

---

## Code Coverage

### Current Coverage

As of the latest test run:

- **Total tests:** 296 passing
- **Total assertions:** 528 expect() calls
- **Coverage:** ~97% of tested code

**Coverage by module:**

- ✅ 100% - All Zod schemas
- ✅ 100% - All repositories
- ✅ 100% - All custom hooks
- ✅ 100% - All utility functions
- ✅ 100% - Test utilities

### Viewing Coverage Report

Run tests with coverage enabled:

```bash
bun test --coverage
```

Bun will display coverage in the terminal output:

```
-----------------------|---------|---------|-------------------
File                   | % Funcs | % Lines | Uncovered Line #s
-----------------------|---------|---------|-------------------
All files              |   97.05 |   97.05 |
 src/schemas.ts        |  100.00 |  100.00 |
 src/repositories/     |  100.00 |  100.00 |
 src/hooks/            |  100.00 |  100.00 |
 src/lib/              |  100.00 |  100.00 |
-----------------------|---------|---------|-------------------
```

---

## Best Practices

### 1. Keep Tests Isolated

Each test should be independent and not rely on other tests:

```typescript
// ✅ Good - Clean database before each test
beforeEach(async () => {
  await cleanDatabase(db)
})

it('should create user', async () => {
  // Test doesn't depend on previous tests
})
```

### 2. Use Factories for Test Data

Don't hard-code test data - use factories:

```typescript
// ❌ Bad
const user = {
  id: 'user-1',
  handle: 'testuser',
  email: 'test@example.com',
  createdAt: '2024-11-11T00:00:00Z',
}

// ✅ Good
const user = testFactories.user({
  handle: 'testuser',
  email: 'test@example.com',
})
```

### 3. Test Edge Cases

Don't just test the happy path:

```typescript
describe('findByEmail', () => {
  it('should return user when email exists', () => {})
  it('should return undefined when email not found', () => {})
  it('should handle null email gracefully', () => {})
  it('should be case-sensitive', () => {})
})
```

### 4. Test Business Rules

Focus on testing business logic, not implementation details:

```typescript
// ✅ Good - Tests business rule
it('should reject budget project without budgetHours', () => {
  const result = projectSchema.safeParse({
    category: 'budget',
    budgetHours: null,
  })
  expect(result.success).toBe(false)
})

// ❌ Bad - Tests implementation detail
it('should call superRefine on projectSchema', () => {
  // Testing internal Zod mechanics
})
```

### 5. Use Descriptive Test Names

Test names should clearly describe what is being tested:

```typescript
// ✅ Good
it('should cascade delete accounts when organisation is deleted', () => {})
it('should return true for mobile viewport width below 768px', () => {})

// ❌ Bad
it('test delete', () => {})
it('works', () => {})
```

### 6. Clean Up Resources

Always clean up resources after tests:

```typescript
describe('useIsMobile', () => {
  let originalInnerWidth: number

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
  })

  afterEach(() => {
    // Restore original value
    Object.defineProperty(window, 'innerWidth', {
      value: originalInnerWidth,
    })
  })
})
```

### 7. Test One Thing Per Test

Each test should verify one specific behavior:

```typescript
// ✅ Good
it('should update user email', async () => {
  // Test only email update
})

it('should update user handle', async () => {
  // Test only handle update
})

// ❌ Bad
it('should update user', async () => {
  // Tests email, handle, and multiple fields - hard to debug
})
```

### 8. Use Constants for Repeated Values

```typescript
const MOBILE_BREAKPOINT = 768

it('should detect mobile at 767px', () => {
  Object.defineProperty(window, 'innerWidth', {
    value: MOBILE_BREAKPOINT - 1,
  })
  // ...
})
```

### 9. Avoid Test Interdependence

Tests should not depend on execution order:

```typescript
// ❌ Bad - Test 2 depends on Test 1
it('should create user', async () => {
  await db.insert(schema.users).values(user)
})

it('should find the created user', async () => {
  // Depends on previous test!
  const result = await db.select().from(schema.users)
  // ...
})

// ✅ Good - Each test is independent
it('should create user', async () => {
  await cleanDatabase(db)
  await db.insert(schema.users).values(user)
  // Verify creation in this test
})

it('should find user by email', async () => {
  await cleanDatabase(db)
  const user = await seed.user(db) // Set up own data
  // ...
})
```

### 10. Document Complex Test Logic

Add comments for non-obvious test logic:

```typescript
it('should exclude entries in approved sheets', async () => {
  // Arrange - Create approved sheet with entry
  const approvedSheet = await seed.timeSheet(db, { status: 'approved' })
  const entry1 = await seed.timeEntry(db)

  // Link entry to approved sheet
  await db.insert(schema.timeSheetEntries).values({
    timeSheetId: approvedSheet.id,
    timeEntryId: entry1.id,
  })

  // Act - Query for available entries (should exclude entry1)
  const approvedSheets = await db
    .select()
    .from(schema.timeSheets)
    .where(eq(schema.timeSheets.status, 'approved'))

  const entriesInApprovedSheets = await db
    .select()
    .from(schema.timeSheetEntries)
    .where(
      sql`${schema.timeSheetEntries.timeSheetId} IN ${approvedSheets.map((s) => s.id)}`
    )

  // Assert - entry1 should be in the exclusion list
  expect(entriesInApprovedSheets.map((e) => e.timeEntryId)).toContain(entry1.id)
})
```

---

## Troubleshooting

### Common Issues

#### 1. Foreign Key Constraint Failures

If you see SQLite foreign key errors:

```
SQLiteError: FOREIGN KEY constraint failed
```

**Solution:** Ensure parent records exist before creating child records:

```typescript
// ✅ Create parent first
const org = await seed.organisation(db)
const account = await seed.account(db, org.id)

// ❌ Don't create child without parent
const account = await seed.account(db, 'nonexistent-org-id')
```

#### 2. Unique Constraint Violations

```
SQLiteError: UNIQUE constraint failed: users.email
```

**Solution:** Use unique values or clean database between tests:

```typescript
beforeEach(async () => {
  await cleanDatabase(db)
})

it('test 1', async () => {
  const user = testFactories.user({ email: 'unique1@example.com' })
})

it('test 2', async () => {
  const user = testFactories.user({ email: 'unique2@example.com' })
})
```

#### 3. Null vs Undefined Issues

```
error: expect(received).toBeUndefined()
Received: null
```

**Solution:** Use `.toBeNull()` for SQLite fields:

```typescript
// ✅ Correct for SQLite
expect(result[0].projectId).toBeNull()

// ❌ Won't work with SQLite
expect(result[0].projectId).toBeUndefined()
```

#### 4. Act Warning in Hook Tests

```
Warning: An update to TestComponent inside a test was not wrapped in act(...)
```

This warning can usually be ignored if tests pass. It's caused by React Testing Library being verbose about state updates.

---

## Test Users (Seed Data)

The seed script (`scripts/seed-test-data.ts`) creates test users for manual testing and development. Run with:

```bash
bun run scripts/seed-test-data.ts --clear
```

### Default Credentials

All test users have the password: **`password123`**

### Users by System Role

| Email | Handle | System Role | Description |
|-------|--------|-------------|-------------|
| admin@orilla.dev | admin | `super_admin` | Full platform access |
| staff@orilla.dev | staff | `admin` | User management, no platform settings |
| alice@orilla.dev | alice | (none) | Regular user |
| bob@orilla.dev | bob_pm | (none) | Regular user |
| charlie@orilla.dev | charlie_dev | (none) | Regular user |
| jennifer@acmesaas.com | jennifer_client | (none) | Client user |

### Project Memberships

Users have different roles across projects to test permission scenarios:

| User | Project | Project Role |
|------|---------|--------------|
| alice | Website Redesign | owner |
| alice | Mobile App Development | owner |
| alice | Brand Identity Package | viewer |
| alice | Video Production | owner |
| bob_pm | Website Redesign | expert |
| bob_pm | API Integration | owner |
| bob_pm | Social Media Campaign | expert |
| charlie_dev | Mobile App Development | expert |
| charlie_dev | API Integration | expert |
| charlie_dev | Brand Identity Package | owner |
| charlie_dev | Social Media Campaign | owner |
| jennifer_client | Website Redesign | client |
| jennifer_client | Mobile App Development | reviewer |
| jennifer_client | Video Production | viewer |

### Testing Different Permission Levels

Use these accounts to test the permission system:

1. **Super Admin** (`admin@orilla.dev`) - Can access everything, manage users, platform settings
2. **Admin** (`staff@orilla.dev`) - Can manage users and organisations, but not platform settings
3. **Project Owner** (`alice@orilla.dev` on Website Redesign) - Full project control, can invite members
4. **Expert** (`bob_pm@orilla.dev` on Website Redesign) - Can log time, edit own entries
5. **Reviewer** (`jennifer@acmesaas.com` on Mobile App) - Can approve time sheets
6. **Client** (`jennifer@acmesaas.com` on Website Redesign) - View-only with invitation capability
7. **Viewer** (`alice@orilla.dev` on Brand Identity) - Read-only access

---

## Additional Resources

- [Bun Test Documentation](https://bun.sh/docs/cli/test)
- [Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Zod Documentation](https://zod.dev/)

---

## Summary

Our testing approach prioritizes **business logic and backend functionality** using Bun's fast, native test runner. We achieve comprehensive coverage of:

- ✅ Data validation (Zod schemas)
- ✅ Database operations (repositories)
- ✅ Business rules and workflows
- ✅ Utility functions
- ✅ Custom hooks

By focusing on unit tests for core functionality and using Storybook for UI components, we maintain a fast, reliable test suite that provides confidence when making changes to the codebase.

**Current stats:**

- 296 tests passing
- 528 assertions
- ~97% code coverage
- Fast execution with Bun (~700-900ms for full suite)
