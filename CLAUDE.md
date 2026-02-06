# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Orilla Budget is a time tracking and budget management application built with TanStack Start (React), Bun, Drizzle ORM, and SQLite. The app provides both an expert interface for managing organisations, projects, and time entries, as well as a client portal for viewing budget information.

**Note**: The expert interface uses the `/expert` route. All expert pages are under `/expert/*`.

---

## Documentation

### Colocated Docs (in source directories)

| File | Description |
|------|-------------|
| [src/db/CLAUDE.md](src/db/CLAUDE.md) | Database schema, Drizzle patterns |
| [src/repositories/CLAUDE.md](src/repositories/CLAUDE.md) | Repository pattern, creating new repos |
| [src/routes/CLAUDE.md](src/routes/CLAUDE.md) | Server functions, TanStack Start routing |
| [src/components/CLAUDE.md](src/components/CLAUDE.md) | Component patterns, CRUD UI, shadcn/ui |
| [src/hooks/CLAUDE.md](src/hooks/CLAUDE.md) | Custom hooks patterns |
| [src/lib/CLAUDE.md](src/lib/CLAUDE.md) | Utility functions, permissions |
| [src/test/CLAUDE.md](src/test/CLAUDE.md) | Test utilities, patterns |

### Comprehensive Guides

| Document | Description |
|----------|-------------|
| [docs/setup.md](docs/setup.md) | Environment setup (mise), development commands |
| [docs/database.md](docs/database.md) | Database guide, migrations, schema change workflow |
| [docs/testing.md](docs/testing.md) | Testing strategy, running tests, coverage |
| [docs/git-workflow.md](docs/git-workflow.md) | Commit conventions, atomic commits, worktrees |
| [docs/architecture.md](docs/architecture.md) | Tech stack, project structure, patterns |
| [docs/authentication.md](docs/authentication.md) | RBAC, permissions, route protection |
| [docs/navigation.md](docs/navigation.md) | Navigation patterns, permission-based UI |
| [docs/roadmap/README.md](docs/roadmap/README.md) | Feature specifications, roadmap conventions |

---

## Quick Reference

### Commands

```bash
bun install          # Install dependencies
bun run dev          # Start development server (port 3000)
bun test             # Run all tests
bun run db:generate  # Generate migration from schema changes
bun run db:migrate   # Apply migrations
bun scripts/reset-db.ts --seed  # Drop all tables, migrate, seed test data
```

### Critical Rules

1. **Worktree Policy**: ALWAYS create a worktree before making code changes. Never commit directly to main. See [docs/git-workflow.md](docs/git-workflow.md).

2. **Atomic Commits**: Each commit should represent a single, complete, logical change. One concern per commit.

3. **Commit Convention**: Follow Conventional Commits with Angular preset. Keep messages concise. No attribution footers.

4. **Data Refresh**: Use `router.invalidate()` instead of `window.location.reload()` after mutations.

5. **Repository Pattern**: All external dependencies (database, APIs, auth) are accessed through repository modules in `src/repositories/`.

6. **Migration Workflow**: When changing schema: modify `schema.ts` -> `db:generate` -> review SQL -> `db:migrate` -> commit migrations.

---

## Worktree Quick Start

```bash
# Create worktree for a feature
git worktree add ../feature-name feature/feature-name
cd ../feature-name
bun install
bun scripts/reset-db.ts --seed   # Fresh DB with test data
bun run dev
```

**Branch naming**: `feature/*`, `fix/*`, `db/*`, `refactor/*`, `exp/*`

**Exceptions** (no worktree needed): Trivial typo fixes in markdown, updating roadmap table.

---

## Dev Mode

- **User switcher bar**: `src/components/dev-user-bar.tsx` — draggable floating panel (dev-only) for switching between users. Auto-logs in as super_admin. All seeded users have password `password123`.
- **Dev-only gating**: Client: `import.meta.env.DEV` (tree-shaken in prod). Server: `process.env.NODE_ENV !== 'development'`.

---

## Roadmap

| Document | Status | Description |
|----------|--------|-------------|
| [User Management & RBAC](docs/roadmap/2025-11-27-user-management-rbac.md) | Completed | Authentication, authorization |
| [Permission System](docs/roadmap/2025-11-27-permission-system.md) | Completed | Granular permissions |
| [Unified Dashboard](docs/roadmap/2025-11-27-unified-dashboard.md) | Completed | Merge interfaces |
| [Account & Contact Features](docs/roadmap/2025-11-27-account-contact-features.md) | Completed | Invitation flow |
| [Better Auth Migration](docs/roadmap/2025-12-02-better-auth-migration.md) | Completed | Auth framework migration |
| [Dashboard Improvements](docs/roadmap/2025-11-22-dashboard-improvements.md) | In Progress | Bug fixes, UI/UX |
| [User Management Enhancements](docs/roadmap/2025-11-28-user-management-enhancements.md) | Planned | 2FA, OAuth, audit logging |
| [Focus Timer & Mindfulness](docs/roadmap/2025-11-25-focus-timer-mindfulness.md) | Planned | Focus timer feature |
| [Email Integration](docs/roadmap/2025-12-03-email-integration.md) | Planned | GDPR-safe email service, password reset, verification |
| [User Auth Flows](docs/roadmap/2025-12-03-user-auth-flows.md) | Planned | Signup, password reset, settings, session management |
| [Project Ownership Model](docs/roadmap/2025-12-06-project-ownership-model.md) | Completed | Creator tracking, ownership rules, minimum owner enforcement |
