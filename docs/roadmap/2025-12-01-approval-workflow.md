# Approval Workflow

**Date:** 2025-12-01
**Status:** In Progress
**Category:** Features

## Overview

Implementation of the time sheet approval workflow, including entry-level approvals, role-based permissions, and client review process.

---

## Current Implementation

### Completed

- [x] Database schema for approval workflow (entry status, time sheet entries with approval tracking)
- [x] Contextual permission functions in `src/lib/permissions.ts`:
  - `canApproveTimeSheet` - checks user role, project membership, client presence
  - `canRejectTimeSheet` - experts cannot reject, only clients/reviewers/owners
  - `canRevertToDraft` - experts can revert only if no client interaction
  - `canApproveEntry` and `canQuestionEntry` for entry-level permissions
- [x] Time sheet detail page UI with approval actions
- [x] Entry-level approve/question/resolve actions
- [x] Button visibility fix - all buttons show for authenticated users with disabled states
- [x] **Time sheet access filtering** - Users only see time sheets for projects they have membership in
- [x] **Time sheet detail access control** - Access denied for users without project membership
- [x] Repository method `findByProjectIds` for efficient filtering

### Repository tests added

- [x] `src/repositories/timeSheet.repository.test.ts` - approval workflow tests
- [x] `src/repositories/entryMessage.repository.test.ts` - entry messaging tests
- [x] `src/repositories/projectApprovalSettings.repository.test.ts` - settings tests
- [x] `src/repositories/timeSheetApproval.repository.test.ts` - approval patterns

---

## Known Issues / Shortcomings

### ~~1. Client Portal Not Working~~ - FIXED

**Priority:** ~~High~~ Resolved

~~The client part of the approval workflow is not functional.~~ **Fixed** by adding project-based access filtering:

- [x] Client can now see time sheets submitted for their projects
- [x] Time sheet list filters by user's project memberships
- [x] Time sheet detail page enforces access control
- [ ] Need to verify client can approve/reject/question entries (manual testing required)

**Resolution:**
- Added `findByProjectIds` to `timeSheet.repository.ts`
- Updated `getAllDataFn` in `time-sheets.tsx` to filter by user's project memberships
- Added access control checks in `getTimeSheetDetailFn` in `time-sheets.$id.tsx`

**To test:**
1. Login as `jennifer@acmesaas.com` / `password123`
2. Navigate to time sheets
3. Should see: sheet-1 (proj-1) and sheet-4 (proj-6) - her client projects
4. Should NOT see: sheet-2, sheet-3 (org-level, no project)

### 2. Missing Integration Tests

**Priority:** Medium

The current implementation lacks integration tests for the full approval workflow:

- [ ] No tests for the server functions in `time-sheets.$id.tsx`
- [ ] No tests for permission checking in the loader
- [ ] No end-to-end tests for the approval flow
- [ ] No tests verifying client interaction detection logic

### 3. Missing Unit Tests for Permission Functions

**Priority:** Medium

The contextual permission functions in `src/lib/permissions.ts` are not covered by unit tests:

- [ ] `canApproveTimeSheet` - untested
- [ ] `canRejectTimeSheet` - untested
- [ ] `canRevertToDraft` - untested
- [ ] `canApproveEntry` - untested
- [ ] `canQuestionEntry` - untested

Coverage report shows 50.51% line coverage for `src/lib/permissions.ts`, with lines 366-597 uncovered.

### 4. Client Interaction Detection

**Priority:** Medium

The `hasClientInteraction` logic in the loader may need verification:

- [ ] Verify it correctly detects when a client has approved entries
- [ ] Verify it correctly detects when a client has questioned entries
- [ ] Verify it correctly detects client messages on entries

---

## Test Users for Manual Testing

| User | Email | Password | Role | Projects |
|------|-------|----------|------|----------|
| alice | alice@orilla.dev | password123 | owner | proj-1, proj-2, proj-4, proj-6 |
| bob_pm | bob@orilla.dev | password123 | expert | proj-1, proj-3, proj-5, proj-6 |
| jennifer_client | jennifer@acmesaas.com | password123 | client | proj-1, proj-2 (reviewer), proj-6 |

### Test Time Sheets

| Sheet ID | Title | Status | Project | Notes |
|----------|-------|--------|---------|-------|
| sheet-4 | Creative Agency - Recent Work | submitted | proj-6 | Has entries, good for testing approval |
| sheet-2 | Acme SaaS - Week of Jan 8-14 | submitted | (none) | No project, org-level sheet |

---

## Next Steps

1. ~~**Fix client access issues**~~ - **DONE**: Clients can now see time sheets for their projects
2. **Add permission function tests** - Unit tests for all `can*` functions in permissions.ts
3. **Add integration tests** - Test server functions with mocked authentication
4. **Verify client interaction detection** - Ensure the logic correctly identifies client activity
5. **Manual testing** - Verify client can approve/reject/question entries in UI

---

## Files Modified

| File | Changes |
|------|---------|
| `src/lib/permissions.ts` | Added contextual permission functions |
| `src/routes/dashboard/time-sheets.$id.tsx` | Integrated permissions, fixed button visibility, added access control |
| `src/routes/dashboard/time-sheets.tsx` | Added project-based filtering for time sheet list |
| `src/repositories/timeSheet.repository.ts` | Approval workflow methods, added `findByProjectIds` |
| `src/test/db-utils.ts` | Test seed helpers for approval data |

## Files Added

| File | Purpose |
|------|---------|
| `src/repositories/entryMessage.repository.test.ts` | Entry message repository tests |
| `src/repositories/projectApprovalSettings.repository.test.ts` | Approval settings tests |
| `src/repositories/timeSheetApproval.repository.test.ts` | Approval workflow tests |
