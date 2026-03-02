# Retainer Projects

**Date:** 2025-02-22
**Status:** Planned
**Category:** Business Logic & Features
**Context:** Extend project types to support recurring monthly retainer agreements

## Related Documents

- [Dashboard Improvements](./2025-11-22-dashboard-improvements.md) - Project-specific rates (#12), Profitability (#13)
- [Project Ownership Model](./2025-12-06-project-ownership-model.md) - Creator tracking

## Overview

Add "retainer" as a new project category alongside existing "budget" (T&M) and "fixed" types. A retainer is a monthly recurring service agreement that can be based on either:

- **Hours-based**: Client purchases a fixed number of hours per month (e.g., 20 hours/month)
- **Budget-based**: Client pays a fixed monthly amount (e.g., $2,000/month)

This feature enables tracking of ongoing client relationships with predictable recurring revenue.

---

## Current State Analysis

### Existing Project Categories

```typescript
// src/db/schema.ts
category: text('category', { enum: ['budget', 'fixed'] }).default('budget'),
budgetHours: real('budget_hours'),
```

- **Budget (T&M)**: Time & materials billing, tracks hours against a budget
- **Fixed**: Fixed-price project, total cost agreed upfront

### Gaps

- No support for recurring/monthly billing cycles
- No rollover tracking for unused hours
- No period-based budget tracking (monthly vs. total)
- No contract term management (start/end dates, renewal)

---

## Proposed Solution

### Data Model Changes

```typescript
// src/db/schema.ts - Updated project table
export const project = sqliteTable('project', {
  // ... existing fields ...

  // Extend category enum
  category: text('category', {
    enum: ['budget', 'fixed', 'retainer']
  }).default('budget'),

  // Existing field (used by budget & retainer-hours)
  budgetHours: real('budget_hours'),

  // NEW: Retainer-specific fields
  retainerType: text('retainer_type', {
    enum: ['hours', 'budget']
  }), // Only set when category='retainer'

  retainerAmount: real('retainer_amount'), // Monthly budget amount (for budget-based retainers)

  retainerStartDate: text('retainer_start_date'), // When retainer begins
  retainerEndDate: text('retainer_end_date'), // Contract end (optional, null = ongoing)

  billingCycle: text('billing_cycle', {
    enum: ['monthly', 'quarterly', 'annually']
  }).default('monthly'),

  periodAlignment: text('period_alignment', {
    enum: ['calendar', 'rolling']
  }).default('calendar'), // calendar = Feb 1-28, rolling = from retainerStartDate

  rolloverPolicy: text('rollover_policy', {
    enum: ['none', 'next_period', 'accumulate']
  }).default('none'),

  rolloverLimit: real('rollover_limit'), // Max hours/amount that can roll over (optional)
})
```

### New Table: Retainer Config History

Track all configuration changes for accurate historical calculations:

```typescript
export const retainerConfigHistory = sqliteTable('retainer_config_history', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => project.id, { onDelete: 'cascade' }),

  // Snapshot of config at this point in time
  retainerType: text('retainer_type', { enum: ['hours', 'budget'] }).notNull(),
  monthlyHours: real('monthly_hours'), // Hours-based allocation
  monthlyAmount: real('monthly_amount'), // Budget-based allocation
  billingCycle: text('billing_cycle', {
    enum: ['monthly', 'quarterly', 'annually']
  }).notNull(),
  periodAlignment: text('period_alignment', {
    enum: ['calendar', 'rolling']
  }).notNull().default('calendar'),
  rolloverPolicy: text('rollover_policy', {
    enum: ['none', 'next_period', 'accumulate']
  }).notNull(),
  rolloverLimit: real('rollover_limit'),

  // When this config became active
  effectiveFrom: text('effective_from').notNull(), // ISO date
  effectiveTo: text('effective_to'), // NULL = currently active

  // Audit
  changedBy: text('changed_by').references(() => user.id, { onDelete: 'set null' }),
  changeReason: text('change_reason'), // Optional note explaining change
  createdAt: text('created_at').notNull(),
})
```

When calculating usage for a time entry, lookup the config where `effectiveFrom <= entry.date` and (`effectiveTo IS NULL` or `effectiveTo > entry.date`).

### New Table: Retainer Periods

Track usage per billing period to support rollover and historical reporting:

```typescript
export const retainerPeriods = sqliteTable('retainer_periods', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => project.id, { onDelete: 'cascade' }),

  // Period boundaries
  periodStart: text('period_start').notNull(), // e.g., "2025-02-01"
  periodEnd: text('period_end').notNull(), // e.g., "2025-02-28"

  // Allocation for this period
  allocatedHours: real('allocated_hours'), // Hours-based retainers
  allocatedAmount: real('allocated_amount'), // Budget-based retainers

  // Rollover from previous period
  rolloverHours: real('rollover_hours').default(0),
  rolloverAmount: real('rollover_amount').default(0),

  // Computed/cached usage (updated when time entries change)
  usedHours: real('used_hours').default(0),
  usedAmount: real('used_amount').default(0), // Requires hourly rates

  // Period status
  status: text('status', {
    enum: ['active', 'closed', 'future']
  }).default('future'),

  closedAt: text('closed_at'),
  closedBy: text('closed_by').references(() => user.id, { onDelete: 'set null' }),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
```

### Zod Schemas

```typescript
// src/schemas.ts
export const retainerTypeSchema = z.enum(['hours', 'budget'])
export const billingCycleSchema = z.enum(['monthly', 'quarterly', 'annually'])
export const periodAlignmentSchema = z.enum(['calendar', 'rolling'])
export const rolloverPolicySchema = z.enum(['none', 'next_period', 'accumulate'])

export const projectInsertSchema = z.object({
  // ... existing fields ...
  category: z.enum(['budget', 'fixed', 'retainer']).default('budget'),

  // Retainer fields (required when category='retainer')
  retainerType: retainerTypeSchema.optional(),
  retainerAmount: z.number().positive().optional(),
  retainerStartDate: z.string().optional(),
  retainerEndDate: z.string().optional(),
  billingCycle: billingCycleSchema.optional(),
  periodAlignment: periodAlignmentSchema.optional(),
  rolloverPolicy: rolloverPolicySchema.optional(),
  rolloverLimit: z.number().positive().optional(),
}).refine(data => {
  if (data.category === 'retainer') {
    return data.retainerType && data.retainerStartDate
  }
  return true
}, { message: 'Retainer projects require retainerType and retainerStartDate' })
```

---

## UI/UX Design

### Project Creation Form

When "Retainer" category is selected, show additional fields:

```
Category: [Budget] [Fixed] [Retainer*]

-- Retainer Options (shown when Retainer selected) --
Retainer Type: [Hours-based] [Budget-based]

Monthly Hours: [____] (if hours-based)
Monthly Budget: [$ ____] (if budget-based)

Start Date: [date picker]
End Date: [date picker] (optional)

Billing Cycle: [Monthly] [Quarterly] [Annually]

Rollover Policy: [None] [Next Period Only] [Accumulate]
Rollover Limit: [____] hours/amount (optional)
```

### Project Detail View

Show retainer-specific information:

```
┌─────────────────────────────────────────────────┐
│ Project: Acme Corp Monthly Support              │
│ Type: Retainer (Hours-based)                    │
├─────────────────────────────────────────────────┤
│ Current Period: Feb 2025                        │
│ ┌─────────────────────────────────────────────┐ │
│ │ ████████████████░░░░░░░░  16/20 hrs (80%)  │ │
│ └─────────────────────────────────────────────┘ │
│ Allocated: 20 hrs │ Used: 16 hrs │ Remaining: 4 │
│ Rollover from Jan: +2 hrs                       │
├─────────────────────────────────────────────────┤
│ Contract: Jan 2025 - Dec 2025 (11 months left)  │
│ Billing: Monthly │ Rollover: Next Period Only   │
└─────────────────────────────────────────────────┘
```

### Retainer Dashboard Widget

Add dashboard widget showing all retainers and their current period status:

```
Active Retainers (3)
┌──────────────────┬────────────┬───────────────┐
│ Project          │ Period     │ Usage         │
├──────────────────┼────────────┼───────────────┤
│ Acme Support     │ Feb 2025   │ ████░░ 80%    │
│ Beta Maintenance │ Feb 2025   │ ██████ 100%   │ ⚠️
│ Gamma Consulting │ Q1 2025    │ ██░░░░ 35%    │
└──────────────────┴────────────┴───────────────┘
```

---

## Implementation Phases

### Phase 1: Data Model
- [ ] Add retainer fields to `project` table schema
- [ ] Create `retainerConfigHistory` table
- [ ] Create `retainerPeriods` table
- [ ] Generate and apply migrations
- [ ] Update Zod schemas with validation
- [ ] Create `retainerConfigRepository` with history tracking
- [ ] Update project repository with retainer queries

### Phase 2: Period Management
- [ ] Create `retainerPeriodRepository` with CRUD operations
- [ ] Add period generation logic (create periods based on billing cycle)
- [ ] Implement rollover calculation when closing periods
- [ ] Add automatic period creation on retainer start

### Phase 3: UI - Project Forms
- [ ] Update project creation form with retainer fields
- [ ] Add conditional field visibility based on category
- [ ] Update project edit form
- [ ] Add retainer-specific validation messages

### Phase 4: UI - Project Views
- [ ] Add current period usage display to project detail
- [ ] Create period history view
- [ ] Add usage progress bar component
- [ ] Show rollover information

### Phase 5: Dashboard & Reporting
- [ ] Create retainer dashboard widget
- [ ] Add usage alerts (approaching limit, over limit)
- [ ] Period comparison reports
- [ ] Export retainer usage data

---

## Files Overview

### New Files

| File | Description |
|------|-------------|
| `src/repositories/retainerConfigRepository.ts` | Config history tracking and lookups |
| `src/repositories/retainerPeriodRepository.ts` | Retainer period CRUD and queries |
| `src/components/retainer/period-usage-bar.tsx` | Visual usage progress component |
| `src/components/retainer/period-history.tsx` | Historical period list |
| `src/routes/expert/retainers.tsx` | Retainer overview dashboard |

### Files to Modify

| File | Changes |
|------|---------|
| `src/db/schema.ts` | Add retainer fields, new table |
| `src/schemas.ts` | Zod schemas for retainer types |
| `src/repositories/projectRepository.ts` | Retainer-specific queries |
| `src/components/projects/project-form.tsx` | Retainer form fields |
| `src/routes/expert/projects.$id.tsx` | Period usage display |

---

## Technical Considerations

### Period Generation

Periods should be generated automatically:
1. On retainer creation: generate first period starting from `retainerStartDate`
2. Via scheduled job or on-demand: generate next period when current one ends
3. Consider generating 2-3 periods ahead for visibility

### Rollover Calculation

When closing a period:
```typescript
function calculateRollover(period: RetainerPeriod, policy: RolloverPolicy, limit?: number) {
  const remaining = period.allocatedHours - period.usedHours + period.rolloverHours

  if (policy === 'none' || remaining <= 0) return 0
  if (policy === 'next_period') {
    return limit ? Math.min(remaining, limit) : remaining
  }
  if (policy === 'accumulate') {
    return limit ? Math.min(remaining, limit) : remaining
  }
}
```

### Usage Calculation

- For hours-based: Sum `timeEntries.hours` where `projectId` matches and `date` within period
- For budget-based: Requires hourly rates (depends on Dashboard Improvements #12)

### Config-Aware Calculations

When calculating usage, always reference the config active at the time of each entry:

```typescript
function getActiveConfig(projectId: string, entryDate: string) {
  return db.query.retainerConfigHistory.findFirst({
    where: and(
      eq(retainerConfigHistory.projectId, projectId),
      lte(retainerConfigHistory.effectiveFrom, entryDate),
      or(
        isNull(retainerConfigHistory.effectiveTo),
        gt(retainerConfigHistory.effectiveTo, entryDate)
      )
    ),
    orderBy: desc(retainerConfigHistory.effectiveFrom)
  })
}
```

This ensures mid-period config changes don't retroactively affect past entries.

### Config Change Workflow

When retainer settings are updated:
1. Close current config: set `effectiveTo` to today
2. Create new config history record with `effectiveFrom` = today
3. Update project table with current values (for easy querying)

### Integration with Project Rates

This feature depends on [Project-specific rates (#12)](./2025-11-22-dashboard-improvements.md) for budget-based retainers to calculate monetary usage.

---

## Dependencies

- **Dashboard Improvements #12**: Project-specific rates ✅ Implemented on `feature/project-rates` branch (pending merge). Provides the billing rate hierarchy and `fixedPrice`/`defaultHourlyRate` fields needed for budget-based usage calculation.
- Optional: Scheduled job system for automatic period generation

---

## Decisions

1. **Period boundaries**: Configurable per project, default to calendar monthly. Options: calendar-aligned or rolling from start date.

2. **Over-usage handling**: Allow with warning. Entries can be logged beyond the retainer limit, but UI shows clear visual warning (orange/red indicators).

3. **Mid-period changes**: Allowed. All configuration changes are tracked with timestamps in a history table. Usage calculations reference the config that was active when each entry was logged.

4. **Client portal visibility**: Yes. Clients can see their retainer usage in read-only view.

5. **Alerts & notifications**: Out of scope. Notifications will be handled as a separate system-wide feature.

---

## Next Steps

1. Merge `feature/project-rates` branch (Dashboard Improvements #12) — prerequisite dependency is complete
2. Implement Phase 1 (data model) with config history tracking
3. Extend `projectCategorySchema` to include `'retainer'` (currently only `['budget', 'fixed']`)
