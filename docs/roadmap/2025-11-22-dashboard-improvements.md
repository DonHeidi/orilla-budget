# Dashboard Improvements & Features

**Date:** 2025-11-22
**Status:** In Progress
**Context:** Initial review of Agent Dashboard after product description research
**Last Updated:** 2025-02-22

## Overview

This document captures improvements and feature requests identified during the initial product review. These items address UX consistency, bug fixes, and feature enhancements to improve the time tracking and budget management workflow.

---

## Critical Bugs

### 1. Projects View Error ✅ FIXED
**Issue:** When clicking on a project, error occurs: "organisationRepository is not defined"
**Impact:** Projects detail view is completely broken
**Priority:** High
**Affected:** `src/routes/dashboard/projects.$id.tsx`
**Resolution:** Used parent route API pattern instead of separate loader (2025-11-25)

### 2. Time Entry Selection Failing ✅ FIXED
**Issue:** Selecting time entries fails with possible client-server code conflict
**Impact:** Cannot add time entries to time sheets
**Priority:** High
**Affected:** Time entries view selection mechanism
**Resolution:** Fixed React hook misuse - changed `useState()` to `useEffect()` for data fetching (2025-11-25)

---

## Naming & Terminology

### 3. Rename "Agent Dashboard" to "Expert Dashboard" ✅ FIXED
**Rationale:** "Expert" better reflects the role and status of users managing the dashboard
**Impact:** UI labels, documentation
**Priority:** Medium
**Changes Required:**
- Update sidebar/header labels
- Update documentation (CLAUDE.md, README)
**Resolution:** Updated labels to "Expert Dashboard". Routes remain at `/dashboard/*` (route rename was not implemented). (2025-11-25, clarified 2025-02-22)

---

## Architecture & Data Model Changes

### 4. Restructure Time Sheets by Account ✅ FIXED
**Current Behavior:** Time sheets are created per organization only
**Desired Behavior:** Time sheets should be created by account (individual contact), with organization and projects as optional filters
**Rationale:** Better aligns with real-world workflows where individual team members submit their own time sheets
**Priority:** High
**Changes Required:**
- Add `accountId` foreign key to `timeSheets` table
- Update time sheet creation form to select account
- Add organization/project filter UI
- Migration required
**Resolution:** Added optional `accountId` field with bidirectional org/account filtering in creation form, Account column in list/detail views, and `findByAccount` repository method (2025-11-25)

---

## UI/UX Improvements

### 5. Combine Time Entries and Time Sheets Views ✅ FIXED
**Current State:** Separate routes for time entries and time sheets
**Desired State:** Single view with tabs: `/dashboard/time-entries-and-sheets`
**Rationale:** These concepts are tightly coupled; users need to switch between them frequently
**Priority:** Medium
**Implementation:**
- Create new route with tab component
- Tab 1: Time Entries (current view)
- Tab 2: Time Sheets (current view)
- Share filters/context between tabs
**Resolution:** Added linked TabNavigation component to both time-entries and time-sheets routes for easy switching (2025-11-25)

### 6. Date Range Column UI Refactor ✅ FIXED
**Issue:** Date range column in time sheets needs better visual design
**Suggestions:**
- More compact date format
- Visual separator between start/end dates
- Consider date range picker component
**Priority:** Low
**Resolution:** Changed format from "Jan 1, 2025 to Jan 31, 2025" to "Jan 1, 2025 → Jan 31, 2025" with arrow icon separator (2025-11-25)

### 7. Quick Edit on Time Entries Row ✅ FIXED
**Description:** Enable inline editing of time entries directly in the data table
**Interaction:** Double-click on a cell to edit that field value
**Use Case:** Faster updates without opening detail sheet for minor corrections
**Priority:** Medium
**Implementation:**
- Add double-click handlers to table cells
- Show inline input/select for editable fields
- Auto-save on blur or Enter key
- Show loading indicator during save
- Revert on Escape key
**Editable Fields:** Title, hours, description, project, date
**Resolution:** Implemented double-click inline editing for Date, Project, Title, and Hours columns with auto-save on blur/Enter and cancel on Escape (2025-11-25)

---

## Business Logic & Validation

### 8. Filter Time Entry Selection for Time Sheets ✅ FIXED
**Current Behavior:** All time entries appear in selection list
**Desired Behavior:** Only show unassigned time entries (not already in a time sheet)
**Rationale:** Prevents duplicate assignments and confusion
**Priority:** High
**Implementation:**
- Update time entry query to exclude entries with existing `timeSheetEntries` relationships
- Add visual indicator for assigned vs. unassigned entries
**Resolution:** Updated `getAvailableEntries()` to filter out entries in ANY time sheet, not just approved ones (2025-11-25)

### 9. Prevent Removal of Approved Time Entries ✅ FIXED
**Current Behavior:** Unknown - likely allows removal of any entry from time sheet
**Desired Behavior:** Approved time entries cannot be removed from time sheets
**Rationale:** Maintains audit trail and prevents accidental data loss
**Priority:** High
**Implementation:**
- Add validation in removal handler
- Disable remove button for approved entries
- Show toast/error if user attempts removal
**Resolution:** Added handler validation and disabled remove button for entries with `approvedDate` (2025-11-25)

---

## New Features

### 10. Reports View
**Description:** Dedicated view for approved time sheets and entries for accounting/audit purposes
**Use Case:** Accounting downloads approved time sheets for documentation or when audited
**Priority:** Medium
**Route:** `/dashboard/reports`

**Permission Control:**
- Add `reports:view` permission
- Visibility controlled by capabilities (not route-level protection)

**Features:**
- Filter by approval date range
- Group by time sheet, project, or organization
- Export to PDF/CSV for accounting records
- View approved entries across projects

### 11. Quick Entry Templates — OUT OF SCOPE
**Description:** Allow users to create reusable templates for common time entries
**Status:** Moved to Future Considerations (2025-02-22)
**Rationale:** Lower priority; focus on financial features first

### 12. Project-Specific Rates ✅ IMPLEMENTED
**Description:** Define hourly rates with cascading hierarchy: individual member rate > billing role rate > project default rate
**Use Case:** Different projects have different billing rates; team members may have different rates based on role or individual negotiation
**Priority:** High
**Branch:** `feature/project-rates` (pending merge)

**Rate Resolution Order (most specific wins):**
1. **Individual rate** - rate set for a specific member on a project
2. **Billing role rate** - rate set for a billing role on a project (e.g., "Senior Dev" rate)
3. **Project default rate** - default hourly rate for the project

**Data Model (implemented):**
- `projectBillingRoles` table: named billing roles per project (e.g., "Senior Dev", "Junior Dev") with soft-delete via `archived` flag
- `projectRates` table: time-based rate history using `effectiveFrom`/`effectiveTo` pattern, integer cents, three-level hierarchy (`default`, `billing_role`, `member`)
- `projectMemberBillingRoles` table: assigns team members to billing roles (1:1 via unique constraint)
- Added `fixedPrice` and `defaultHourlyRate` columns to `project` table

**Permissions:** `rates:view` and `rates:edit` (owner-only)

**UI (implemented):**
- Collapsible "Billing & Rates" section on project detail view
- Default hourly rate editing
- Fixed price editing (for `fixed` category projects)
- Billing role CRUD (create, edit name/description/rate, archive)
- Member billing role assignment via inline select
- Displays effective rate and source (`member`, `billing_role`, or `default`) per member

**Remaining gaps (follow-up):**
- Per-member rate override UI — backend supports it but no UI affordance to set member-specific rates
- Rate history view — repository supports it but UI only shows active rates
- User-facing error messages — errors only logged to console

### 13. Profitability Calculation
**Description:** Calculate and display project profitability, especially important for fixed-price projects
**Use Case:** Understand if fixed-price projects are profitable or losing money based on time invested
**Priority:** High

**Permission Control:**
- Add `project:view-profitability` permission
- Granted to: `owner`, `expert` (potentially `reviewer`)
- **NOT** granted to: `client`, `viewer` (guests)
- System admins (`super_admin`, `admin`) can always view

**Requirements:**
- For **Budget (T&M) projects**: Revenue = hours logged × hourly rate, compare to budget
- For **Fixed Price projects**: Revenue = fixed price, compare to hours logged × billable rate

**Data Model Changes:**
- Add `fixedPrice` (decimal) to `projects` table for fixed-price projects
- Add `projectCategory` values or separate field to distinguish T&M vs. Fixed

**Future Enhancement:**
- Add `internalCostRate` to enable true profit margin calculations (revenue - actual cost)
- Currently using single billable rate only; "profitability" = revenue vs budget/fixed price

**UI Display:**
- Show profitability metrics on project detail view (permission-gated):
  - Total Revenue (fixed price or hours × rate)
  - Total Cost (hours × internal rate)
  - Profit/Loss amount and percentage
  - Color-coded: green (profitable), red (loss)
- Add profitability column to projects list (hidden for users without permission)
- Dashboard widget showing most/least profitable projects (permission-gated)

---

## Implementation Notes

### Suggested Order of Implementation

**Phase 1: Critical Fixes** ✅ COMPLETE (2025-11-25)
1. ~~Fix projects view error (bug #1)~~ ✅
2. ~~Fix time entry selection (bug #2)~~ ✅
3. ~~Prevent removal of approved entries (validation #9)~~ ✅
4. ~~Filter unassigned entries in selection (logic #8)~~ ✅
5. Time entries list changed to single-click navigation ✅

**Phase 2: Data Model Changes** ✅ COMPLETE (2025-11-25)
6. ~~Restructure time sheets by account (architecture #4)~~ ✅

**Phase 3: UI Improvements** ✅ COMPLETE (2025-11-25)
7. ~~Combine time entries and time sheets views (UX #5)~~ ✅
8. ~~Rename Agent → Expert Dashboard (naming #3)~~ ✅
9. ~~Date range column refactor (UI #6)~~ ✅
10. ~~Quick edit on time entries row (UX #7)~~ ✅

**Phase 4: Financial Features** (High Priority)
11. ~~Project-specific rates (feature #12)~~ ✅ Implemented on `feature/project-rates` branch (pending merge)
12. Profitability calculation (feature #13) - depends on #11

**Phase 5: Additional Features**
13. Reports view at `/dashboard/reports` (feature #10)
14. ~~Quick entry templates (feature #11)~~ — moved to Future Considerations

### Testing Considerations

- Update existing tests for time sheet account association
- Add tests for entry assignment validation
- Add tests for approved entry protection
- Integration tests for combined view with tabs

### Migration Strategy

**For item #4 (time sheets by account):** ✅ COMPLETE
- ~~Add `accountId` column to `timeSheets` (nullable initially)~~ ✅
- ~~Update repository queries and validation schemas~~ ✅
- Note: `accountId` kept optional to allow org-only time sheets

**For item #12 (project-specific rates):** ✅ COMPLETE
- Added `projectBillingRoles`, `projectRates`, `projectMemberBillingRoles` tables
- Added `fixedPrice` and `defaultHourlyRate` columns to `project` table
- Migration: `0015_cooing_deathstrike.sql`
- Three new repositories with full CRUD and rate hierarchy resolution
- Zod schemas for all billing rate types
- UI component `ProjectRatesSection.tsx` integrated in project detail view
- Branch: `feature/project-rates` (pending merge)

**For item #13 (profitability calculation):**
- Add `fixedPrice` and `internalCostRate` columns to `projects`
- Update existing projects: set fixedPrice for category="fixed" projects
- Create views/computed fields for profitability metrics

---

## Future Considerations

These items are not planned for immediate implementation but should be considered:

- **Quick Entry Templates:** Reusable templates for common time entries (e.g., "Weekly standup", "Client meeting") to pre-fill quick entry form. Decide on user-specific vs org-wide scope.
- **Internal Cost Rates:** Track internal/cost rates alongside billable rates to calculate true profit margins (revenue - cost), not just revenue vs budget
- **Multi-Currency Support:** Handle international projects with different currencies
- **Batch Operations:** Bulk approve/reject time sheets
- **Notifications:** Alert accounts when time sheets need submission/approval
- **Calendar Integration:** Sync time entries with calendar events
- **Reporting:** Visual analytics dashboard for budget/time trends

---

## Questions & Decisions Needed

1. ~~**Route Breaking Change:** Should `/dashboard` be renamed to `/expert`? This would affect existing bookmarks/links.~~ → Resolved: Routes renamed to `/expert/*` (2025-11-25)
2. ~~**Time Sheet Account Migration:** How should we handle existing time sheets that don't have an associated account?~~ → Resolved: `accountId` is optional, existing sheets remain valid without account association
3. ~~**Template Scope:** Should quick entry templates be user-specific or organization-wide?~~ → Resolved: Quick Entry Templates moved to Future Considerations (out of scope for now). (2025-02-22)
4. ~~**Approved View:** Should "Approved Time Entries" be a separate view or a filter on the existing time entries view?~~ → Resolved: New view at `/dashboard/reports` for accounting to download approved time sheets for documentation/audits. Permission-gated via `reports:view`. (2025-02-22)
5. ~~**Rate Structure:** Should rates be simple (one rate per project) or complex (multiple rates per role per project)?~~ → Resolved: Complex rate structure with cascading hierarchy: **individual member rate > role rate > project rate** (most specific wins) (2025-02-22)
6. ~~**Profitability Privacy:** Should profitability metrics be visible in the client portal, or only in the expert dashboard?~~ → Resolved: Visibility controlled by user capabilities/permissions. Guests (e.g., `client`, `viewer` roles) do not see profitability. Add `project:view-profitability` permission. (2025-02-22)
7. ~~**Internal vs. External Rates:** Do we need to track both billable rates (what clients pay) and internal cost rates (what it costs the business)?~~ → Resolved: Single rate (billable/external) for now. Internal cost rates are a **future enhancement** to enable true profit margin calculations. (2025-02-22)
8. ~~**Currency Support:** Do we need multi-currency support for international projects, or is single currency sufficient?~~ → Resolved: Multi-currency out of scope for now. Single currency only. (2025-02-22)
