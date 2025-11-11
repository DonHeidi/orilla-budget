# Orilla Budget

A time tracking and budget management application built with TanStack Start, Bun, Drizzle ORM, and SQLite.

## Quick Start

### Install Dependencies

```bash
bun install
```

### Run Development Server

```bash
bun run dev
```

### Run Tests

```bash
bun test
```

For detailed testing documentation, see [docs/testing.md](docs/testing.md).

## Testing

This project uses **Bun's native test runner** for unit testing backend and core functionality.

- **296 tests** covering schemas, repositories, hooks, and utilities
- **~97% code coverage** on tested modules
- **Fast execution** (~700-900ms for full suite)

### Quick Test Commands

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Run specific test file
bun test src/schemas.test.ts

# Watch mode
bun test --watch
```

**What we test:**
- ✅ Zod validation schemas (business rules)
- ✅ Repository layer (database operations)
- ✅ Utility functions
- ✅ Custom React hooks

**What we use Storybook for:**
- UI component documentation and visual testing

See [docs/testing.md](docs/testing.md) for comprehensive testing guide.

## Project Info

This project was created using `bun init` in bun v1.3.0. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
