# Git Workflow

This document covers the Git workflow conventions for the Orilla Budget project.

## Commit Convention

This project follows **Conventional Commits** with the **Angular preset**.

**Note**: Keep commit messages concise. Do not include Claude Code attribution footers or Co-Authored-By tags.

### Format

```
<type>(<scope>): <subject>

<body>
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (formatting, whitespace, etc.)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools

### Examples

```bash
# Bug fix
fix(theme): prevent flash of unstyled content on page load

# New feature
feat(dashboard): add bulk delete for time entries

# Performance improvement
perf(db): add index on project queries
```

---

## Atomic Commits

This project strives for **atomic commits** - each commit should represent a single, complete, logical change.

### Principles

1. **One concern per commit**: Each commit should address exactly one thing (one bug fix, one feature, one refactor). If you find yourself using "and" in your commit message, consider splitting it.

2. **Complete and working**: Every commit should leave the codebase in a working state. Tests should pass, build should succeed.

3. **Self-contained**: A commit should include all related changes - code, tests, types, and documentation updates for that specific change.

4. **Reviewable**: Each commit should be small enough to review and understand in isolation.

### What belongs in a single commit

| Scenario | Single Commit? |
|----------|----------------|
| Fix a bug + add test for it | Yes |
| Add feature + update types + add tests | Yes |
| Fix bug A + fix unrelated bug B | No - split into two commits |
| Refactor + add new feature using refactor | No - refactor first, then feature |
| Update dependencies + fix breaking changes | Yes (if tightly coupled) |
| Format code + fix bug | No - format separately |

### Commit Workflow

```bash
# 1. Make changes for ONE logical unit of work
# 2. Review what you're committing
git diff --staged

# 3. Commit with clear message
git commit -m "fix(auth): handle expired session redirect"

# 4. Repeat for next logical change
```

### Splitting Large Changes

If you've made multiple unrelated changes, use interactive staging:

```bash
# Stage specific files
git add src/lib/auth.ts src/routes/login.tsx

# Or stage specific hunks within a file
git add -p

# Commit the first logical change
git commit -m "fix(auth): handle expired session redirect"

# Stage and commit the next change
git add src/components/Button.tsx
git commit -m "style(button): update hover states"
```

### Why Atomic Commits Matter

- **Easier code review**: Reviewers can understand each change in isolation
- **Simpler debugging**: `git bisect` can pinpoint exactly which change introduced a bug
- **Clean history**: `git log` tells a clear story of how the codebase evolved
- **Safe reverts**: Can revert a single change without losing unrelated work
- **Better collaboration**: Team members can cherry-pick specific changes

---

## Git Worktree Workflow

This project **requires git worktrees** for all development work. The main branch should always remain clean and stable. All features, fixes, and experiments MUST be developed in worktrees.

### Mandatory Worktree Policy

**CRITICAL**: Claude Code MUST create a worktree before making any code changes. Never commit directly to main.

**When to create a worktree** - ALWAYS, for any work including:

1. **New Features** - Any `feat(*)` work that adds functionality
2. **Database Changes** - Schema modifications, migrations, or data model changes
3. **Bug Fixes** - Any `fix(*)` work
4. **Refactoring** - Any `refactor(*)` work
5. **Documentation changes** - Any `docs(*)` work that modifies code-related docs
6. **Experiments** - Exploratory work that might be discarded

**The only exceptions** (no worktree needed):
- Trivial typo fixes in markdown files
- Updating the roadmap document table in CLAUDE.md

### Detection Logic for Claude Code

```
IF user requests any code change or feature work:
  1. STOP - Do not make changes in main
  2. Check current branch (git branch --show-current)
  3. If on main:
     a. Check for uncommitted changes (git status)
     b. If uncommitted changes exist, ask user to commit or stash first
     c. Create worktree with conventional branch name
     d. Navigate to worktree and set up environment
  4. If already in a worktree, proceed with work
```

### Creating a Worktree

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

### Branch Naming Convention

- `feature/*` - New features
- `fix/*` - Bug fixes
- `db/*` - Database schema changes
- `refactor/*` - Refactoring work
- `exp/*` - Experiments (throwaway)

---

## Database Isolation (CRITICAL)

**ALWAYS isolate the database in worktrees**. Each worktree MUST have its own `data.db` file:

```bash
# After creating worktree, ALWAYS copy the database
cp ../orilla-budget/data.db ./data.db
```

### Why This Matters

- Schema changes in worktree don't affect main repo
- Migration testing is isolated and safe
- Data corruption in one worktree doesn't affect others
- Each branch can have different schema versions

### Database Migration Workflow in Worktrees

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

---

## Dependency Management

### Smart Detection for node_modules

- **If package.json is unchanged**: Can symlink to save disk space (manual: `ln -s ../orilla-budget/node_modules ./node_modules`)
- **If package.json differs**: Run `bun install` in worktree for isolated dependencies
- **If unsure**: Always run `bun install` (safer, uses ~500MB disk per worktree)

### Claude Code Detection

- Before suggesting `bun install`, check if package.json differs from main
- If identical, mention: "Dependencies should be compatible, but run `bun install` if you encounter issues"
- If different, require: "Run `bun install` to install dependencies"

---

## Development Server Port Conflicts

If running dev servers in multiple worktrees simultaneously:

```bash
# Main repo
bun run dev  # Uses port 3000

# In worktree, use different port
PORT=3001 bun run dev
```

---

## Cleanup After Merge

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

### Listing Active Worktrees

```bash
git worktree list
# Shows all worktrees with their paths and branches
```

---

## Common Issues and Solutions

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

---

## Example Claude Code Workflow

### Example 1: Adding a New Feature

```
User: "Add a new expense tracking feature"

Claude: I'll create a worktree for this feature. Let me check the current state first.

[Runs: git branch --show-current]
Output: main

[Runs: git status]
Output: nothing to commit, working tree clean

Claude: Creating the worktree now:

[Runs commands:]
git worktree add ../feature-expense-tracking feature/expense-tracking
cd ../feature-expense-tracking
bun install
cp ../orilla-budget/data.db ./data.db
bun run db:migrate

Claude: Worktree ready. Now implementing the feature...

[Proceeds with implementation in worktree]

Claude: Feature complete! The changes are committed in the feature/expense-tracking branch.

To merge:
1. Push branch: git push -u origin feature/expense-tracking
2. Create PR on GitHub
3. After merge, clean up: git worktree remove ../feature-expense-tracking
```

### Example 2: Handling Uncommitted Changes

```
User: "Fix the login bug"

Claude: I need to create a worktree first.

[Runs: git branch --show-current]
Output: main

[Runs: git status]
Output: modified: src/components/Button.tsx

Claude: You have uncommitted changes on main. Please commit or stash them first:
- To commit: git add . && git commit -m "wip: describe changes"
- To stash: git stash

User: git stash

Claude: Changes stashed. Now creating the worktree:

[Creates worktree and proceeds...]
```
