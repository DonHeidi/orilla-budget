# Dashboard Improvements & Features

**Date:** 2025-11-22
**Status:** In Progress
**Context:** Initial review of Agent Dashboard after product description research
**Last Updated:** 2025-11-25

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
**Impact:** UI labels, documentation, route names
**Priority:** Medium
**Changes Required:**
- Update sidebar/header labels
- Update documentation (CLAUDE.md, README)
- Consider route rename `/dashboard` → `/expert` (breaking change)
**Resolution:** Renamed all routes from `/dashboard/*` to `/expert/*`, updated all labels to "Expert Dashboard", updated CLAUDE.md (2025-11-25)

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

### 10. Approved Time Entries & Invoices View
**Description:** Create dedicated view for approved time entries and invoices
**Use Case:** Users need to see what has been approved and is ready for billing
**Priority:** Medium
**Suggested Route:** `/dashboard/approved` or `/dashboard/invoices`
**Features:**
- Filter by approval date range
- Group by time sheet or organization
- Export to PDF/CSV for invoicing
- Mark as billed/invoiced

### 11. Quick Entry Templates
**Description:** Allow users to create reusable templates for common time entries
**Use Case:** Repetitive tasks (e.g., "Weekly standup", "Client meeting") can be logged faster
**Priority:** Medium
**Location:** Beneath "Quick Entry" menu item in sidebar
**Features:**
- Save template: title, project, default hours, description
- Click template to pre-fill quick entry form
- CRUD for templates (manage in settings)
- Templates stored per user or organization-wide

### 12. Project-Specific Rates
**Description:** Define hourly rates per project, potentially with role-based rate variations
**Use Case:** Different projects have different billing rates; team members may have different rates based on role (e.g., Senior Dev vs. Junior Dev)
**Priority:** High
**Data Model Changes:**
- Add `projectRates` table with columns: `projectId`, `role`, `hourlyRate`, `currency`
- Or simpler: Add `defaultHourlyRate` to `projects` table
- Consider adding `role` to time entries for rate lookup
**UI Changes:**
- Add rate configuration in project detail view
- Show calculated cost in time entry views (hours × rate)
- Display total project cost alongside total hours
**Business Logic:**
- Calculate revenue based on logged hours × applicable rate
- Support different rates for different roles on same project

### 13. Profitability Calculation
**Description:** Calculate and display project profitability, especially important for fixed-price projects
**Use Case:** Understand if fixed-price projects are profitable or losing money based on time invested
**Priority:** High
**Requirements:**
- For **Budget (T&M) projects**: Revenue = hours logged × hourly rate, compare to budget
- For **Fixed Price projects**: Revenue = fixed price, Cost = hours logged × internal cost rate, Profit = Revenue - Cost
**Data Model Changes:**
- Add `fixedPrice` (decimal) to `projects` table for fixed-price projects
- Add `internalCostRate` (optional) to calculate true profitability
- Add `projectCategory` values or separate field to distinguish T&M vs. Fixed
**UI Display:**
- Show profitability metrics on project detail view:
  - Total Revenue (fixed price or hours × rate)
  - Total Cost (hours × internal rate)
  - Profit/Loss amount and percentage
  - Color-coded: green (profitable), red (loss)
- Add profitability column to projects list
- Dashboard widget showing most/least profitable projects

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
11. Project-specific rates (feature #12) - requires data model changes
12. Profitability calculation (feature #13) - depends on #11

**Phase 5: Additional Features**
13. Approved entries/invoices view (feature #10)
14. Quick entry templates (feature #11)

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

**For item #12 (project-specific rates):**
- Add `projectRates` table or `defaultHourlyRate` column to `projects`
- If using roles: add `role` field to time entries
- Backfill existing projects with default rate (from organization or system setting)
- Add currency support if needed

**For item #13 (profitability calculation):**
- Add `fixedPrice` and `internalCostRate` columns to `projects`
- Update existing projects: set fixedPrice for category="fixed" projects
- Create views/computed fields for profitability metrics

---

## Future Considerations

These items are not planned for immediate implementation but should be considered:

- **Batch Operations:** Bulk approve/reject time sheets
- **Notifications:** Alert accounts when time sheets need submission/approval
- **Calendar Integration:** Sync time entries with calendar events
- **Reporting:** Visual analytics dashboard for budget/time trends

---

## Questions & Decisions Needed

1. ~~**Route Breaking Change:** Should `/dashboard` be renamed to `/expert`? This would affect existing bookmarks/links.~~ → Resolved: Routes renamed to `/expert/*` (2025-11-25)
2. ~~**Time Sheet Account Migration:** How should we handle existing time sheets that don't have an associated account?~~ → Resolved: `accountId` is optional, existing sheets remain valid without account association
3. **Template Scope:** Should quick entry templates be user-specific or organization-wide?
4. **Approved View:** Should "Approved Time Entries" be a separate view or a filter on the existing time entries view?
5. **Rate Structure:** Should rates be simple (one rate per project) or complex (multiple rates per role per project)?
6. **Profitability Privacy:** Should profitability metrics be visible in the client portal, or only in the expert dashboard?
7. **Internal vs. External Rates:** Do we need to track both billable rates (what clients pay) and internal cost rates (what it costs the business)?
8. **Currency Support:** Do we need multi-currency support for international projects, or is single currency sufficient?
